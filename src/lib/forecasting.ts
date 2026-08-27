/**
 * forecasting.ts — the Machine-Learning half of the research title.
 *
 * Named algorithm (for the paper): EXPONENTIAL SMOOTHING, the Holt-Winters / ETS
 * family. The headline method is Holt's Linear Trend (double exponential
 * smoothing); Simple Exponential Smoothing (SES) handles flat series and
 * Croston's method handles intermittent (lumpy) demand — the same family's
 * regime variants. Moving-average and naive-mean are baselines / cold-start
 * fallbacks. This is classical time-series machine learning: the "features" are
 * lagged demand, the "target" is next-day demand, the smoothing parameters
 * (alpha, beta) are FITTED by minimizing one-step-ahead error on a held-out
 * tail, and quality is reported as MAE / RMSE / MAPE. It is interpretable by
 * design — deliberately NOT deep learning.
 *
 * Everything here is pure (no Firestore, no React, no I/O) so it is unit-testable
 * and can never touch the live BIR `transactions` collection — mirrors the
 * pure-module style of src/lib/housekeeping.ts.
 */

import type {
  BranchName,
  CustomerPreOrder,
  DemandForecastResult,
  ForecastAccuracy,
  ForecastMethod,
  SaleTransaction,
} from '../types';
import { normalizeBranch } from './branches';
import { dateStamp } from '../utils/ids';

// ── Series shapes (local; only the result type is shared via types.ts) ──────

/** One observed (or zero-filled) day of demand for a product at a branch. */
export interface DailyDemandPoint {
  /** 'YYYYMMDD' local-time day key (from dateStamp). */
  day: string;
  /** Units sold that day (0 on a zero-filled no-sale day). */
  qty: number;
}

/** A contiguous, zero-filled daily demand series for one product + branch. */
export interface DemandSeries {
  productId: string;
  branch: BranchName | 'ALL';
  points: DailyDemandPoint[];
  /** Length of the observed window in days (points.length). */
  spanDays: number;
  /** Days that actually had a sale (> 0). */
  nonZeroDays: number;
  /** Total units over the window. */
  totalQty: number;
}

export interface ForecastOptions {
  /** "Now" — the forecast is anchored here (defaults to new Date()). */
  asOf?: Date;
  /** How many days of history to consider (default 90). */
  lookbackDays?: number;
  /** How many days ahead to project (default 14). */
  horizonDays?: number;
  /** Operator's school-opening peak override (from isJulyPeakSeasonMode). */
  isPeakSeason?: boolean;
  /** Multiplier applied in the peak window when isPeakSeason is on (default 1.25). */
  peakMultiplier?: number;
  /** Minimum observed days before SES is considered (default 14). */
  minDaysForSES?: number;
  /** Minimum observed days before Holt's trend is considered (default 28). */
  minDaysForHolt?: number;
}

const DAY_MS = 86_400_000;
const DEFAULT_LOOKBACK = 90;
const DEFAULT_HORIZON = 14;
const DEFAULT_PEAK_MULT = 1.25;
const MIN_DAYS_SES = 14;
const MIN_DAYS_HOLT = 28;
/** Grid searched when fitting alpha / beta (the "learning" step). */
const ALPHA_GRID = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const BETA_GRID = [0.02, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5];
/** Peak window: PH school opening has shifted toward Jun–Aug (months 5,6,7). */
const PEAK_MONTHS = new Set([5, 6, 7]);

// ── Small date helpers (local time, matching dateStamp) ─────────────────────

function dayFloor(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((dayFloor(b).getTime() - dayFloor(a).getTime()) / DAY_MS);
}

/**
 * Epoch-ms time key for a transaction.
 *
 * Prefers the epoch embedded in the doc id (`tx-<epochMs>-<code>` from
 * `newDocId`), which is locale-independent and exact; falls back to parsing the
 * human `timestamp`; returns null if neither parses (same NaN-guard discipline
 * as `olderThan` in housekeeping.ts — an unparseable row is skipped, not crashed
 * on).
 */
export function txEpochMs(tx: Pick<SaleTransaction, 'id' | 'timestamp'>): number | null {
  const parts = (tx.id ?? '').split('-');
  if (parts.length >= 2) {
    const embedded = Number(parts[1]);
    if (Number.isFinite(embedded) && embedded > 0) return embedded;
  }
  const parsed = new Date(tx.timestamp).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

// ── Demand-series construction ──────────────────────────────────────────────

/**
 * Accumulate day -> units for one product at one branch (or 'ALL'), from the
 * COMPLETED sales in `transactions`. Refunded rows are excluded. Uses the tx-id
 * epoch as the day key.
 */
function dayMapFor(
  transactions: SaleTransaction[],
  productId: string,
  branch: BranchName | 'ALL',
): Map<string, number> {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.status !== 'Completed') continue;
    if (branch !== 'ALL' && normalizeBranch(tx.branch) !== branch) continue;
    const epoch = txEpochMs(tx);
    if (epoch === null) continue;
    const key = dateStamp(new Date(epoch));
    let dayQty = 0;
    for (const item of tx.items) {
      if (item.product.id === productId) dayQty += item.quantity;
    }
    if (dayQty > 0) map.set(key, (map.get(key) ?? 0) + dayQty);
  }
  return map;
}

/**
 * Turn a day->qty map into a contiguous, zero-filled daily series ending at
 * `asOf`. The window starts at the LATER of (asOf − lookback + 1) and the first
 * observed sale — we do not fabricate zero-demand days before the product's
 * history began, but every gap WITHIN the history is an explicit zero (ES and
 * Croston need real zeros to estimate rate correctly).
 */
export function seriesFromDayMap(
  dayMap: Map<string, number>,
  productId: string,
  branch: BranchName | 'ALL',
  asOf: Date,
  lookbackDays: number,
): DemandSeries {
  const empty: DemandSeries = { productId, branch, points: [], spanDays: 0, nonZeroDays: 0, totalQty: 0 };
  if (dayMap.size === 0) return empty;

  // Earliest observed day (as a date) among keys within the lookback window.
  const windowStart = addDays(dayFloor(asOf), -(lookbackDays - 1));
  let firstObserved: Date | null = null;
  for (const key of dayMap.keys()) {
    const d = dayKeyToDate(key);
    if (!d) continue;
    if (d.getTime() < windowStart.getTime()) continue; // older than lookback → ignore
    if (!firstObserved || d.getTime() < firstObserved.getTime()) firstObserved = d;
  }
  if (!firstObserved) return empty;

  const start = firstObserved;
  const end = dayFloor(asOf);
  const span = daysBetween(start, end) + 1;
  if (span <= 0) return empty;

  const points: DailyDemandPoint[] = [];
  let nonZeroDays = 0;
  let totalQty = 0;
  for (let i = 0; i < span; i++) {
    const d = addDays(start, i);
    const key = dateStamp(d);
    const qty = dayMap.get(key) ?? 0;
    if (qty > 0) {
      nonZeroDays++;
      totalQty += qty;
    }
    points.push({ day: key, qty });
  }
  return { productId, branch, points, spanDays: span, nonZeroDays, totalQty };
}

/** Parse a 'YYYYMMDD' key back to a local Date (null if malformed). */
function dayKeyToDate(key: string): Date | null {
  if (!/^\d{8}$/.test(key)) return null;
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(4, 6));
  const d = Number(key.slice(6, 8));
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Convenience: build a demand series directly from transactions. */
export function buildDailyDemandSeries(
  transactions: SaleTransaction[],
  productId: string,
  branch: BranchName | 'ALL',
  opts: ForecastOptions = {},
): DemandSeries {
  const asOf = opts.asOf ?? new Date();
  const lookback = opts.lookbackDays ?? DEFAULT_LOOKBACK;
  return seriesFromDayMap(dayMapFor(transactions, productId, branch), productId, branch, asOf, lookback);
}

/**
 * One-pass index of productId → (day → units) for a branch (or 'ALL'), so a
 * whole-catalogue reorder pass doesn't re-scan every transaction per product.
 * Same COMPLETED-only filter and tx-id epoch day key as dayMapFor.
 */
export function buildDemandIndex(
  transactions: SaleTransaction[],
  branch: BranchName | 'ALL',
): Map<string, Map<string, number>> {
  const index = new Map<string, Map<string, number>>();
  for (const tx of transactions) {
    if (tx.status !== 'Completed') continue;
    if (branch !== 'ALL' && normalizeBranch(tx.branch) !== branch) continue;
    const epoch = txEpochMs(tx);
    if (epoch === null) continue;
    const key = dateStamp(new Date(epoch));
    for (const item of tx.items) {
      if (item.quantity <= 0) continue;
      let dayMap = index.get(item.product.id);
      if (!dayMap) {
        dayMap = new Map<string, number>();
        index.set(item.product.id, dayMap);
      }
      dayMap.set(key, (dayMap.get(key) ?? 0) + item.quantity);
    }
  }
  return index;
}

// ── Forecast primitives (one-step-ahead "fitted" arrays for scoring) ────────

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function sampleStdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) * (x - m);
  return Math.sqrt(s / (xs.length - 1));
}

/** Expanding-mean baseline: forecast for day t is the mean of all prior days. */
function fittedNaiveMean(values: number[]): number[] {
  const out: number[] = [];
  let running = 0;
  for (let t = 0; t < values.length; t++) {
    out.push(t === 0 ? values[0] : running / t);
    running += values[t];
  }
  return out;
}

/** Moving-average baseline: forecast for day t is the mean of the last `window` days. */
function fittedMovingAverage(values: number[], window: number): number[] {
  const out: number[] = [];
  for (let t = 0; t < values.length; t++) {
    if (t === 0) {
      out.push(values[0]);
      continue;
    }
    const from = Math.max(0, t - window);
    out.push(mean(values.slice(from, t)));
  }
  return out;
}

/**
 * Simple Exponential Smoothing.
 * L_t = alpha*y_t + (1-alpha)*L_{t-1};  one-step forecast for day t is L_{t-1}.
 */
export function ses(values: number[], alpha: number): { level: number; fitted: number[] } {
  if (values.length === 0) return { level: 0, fitted: [] };
  let level = values[0];
  const fitted: number[] = [values[0]];
  for (let t = 1; t < values.length; t++) {
    fitted.push(level); // forecast of y_t made at t-1
    level = alpha * values[t] + (1 - alpha) * level;
  }
  return { level, fitted };
}

/**
 * Holt's Linear Trend (double exponential smoothing).
 * L_t = alpha*y_t + (1-alpha)(L_{t-1}+b_{t-1});
 * b_t = beta(L_t-L_{t-1}) + (1-beta)b_{t-1};
 * forecast ŷ_{t+h} = L_t + h*b_t. One-step fitted for day t is L_{t-1}+b_{t-1}.
 */
export function holt(
  values: number[],
  alpha: number,
  beta: number,
): { level: number; trend: number; fitted: number[] } {
  if (values.length === 0) return { level: 0, trend: 0, fitted: [] };
  if (values.length === 1) return { level: values[0], trend: 0, fitted: [values[0]] };
  let level = values[0];
  let trend = values[1] - values[0];
  const fitted: number[] = [values[0]];
  for (let t = 1; t < values.length; t++) {
    fitted.push(level + trend); // one-step-ahead forecast for day t
    const prevLevel = level;
    level = alpha * values[t] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  return { level, trend, fitted };
}

/**
 * Croston's method for intermittent demand: smooth the non-zero demand SIZE and
 * the INTERVAL between demands separately; per-period rate = size / interval.
 * Returns a flat per-day rate and a running one-step forecast for scoring.
 */
export function croston(values: number[], alpha: number): { rate: number; fitted: number[] } {
  let sizeHat: number | null = null;
  let intervalHat: number | null = null;
  let gap = 0;
  const fitted: number[] = [];
  for (let t = 0; t < values.length; t++) {
    // Forecast for day t is the rate estimated from data strictly before t.
    fitted.push(sizeHat !== null && intervalHat ? sizeHat / intervalHat : 0);
    gap += 1;
    if (values[t] > 0) {
      if (sizeHat === null || intervalHat === null) {
        sizeHat = values[t];
        intervalHat = gap;
      } else {
        sizeHat = alpha * values[t] + (1 - alpha) * sizeHat;
        intervalHat = alpha * gap + (1 - alpha) * intervalHat;
      }
      gap = 0;
    }
  }
  const rate = sizeHat !== null && intervalHat ? sizeHat / intervalHat : 0;
  return { rate, fitted };
}

// ── Accuracy ────────────────────────────────────────────────────────────────

/**
 * Forecast error on aligned actual/predicted arrays.
 * MAE and RMSE over all points; MAPE only over positive actuals (undefined
 * otherwise, reported as null).
 */
export function accuracy(actual: number[], predicted: number[]): ForecastAccuracy {
  const n = Math.min(actual.length, predicted.length);
  if (n === 0) return { mae: 0, rmse: 0, mape: null, n: 0 };
  let absSum = 0;
  let sqSum = 0;
  let apeSum = 0;
  let apeCount = 0;
  for (let i = 0; i < n; i++) {
    const err = actual[i] - predicted[i];
    absSum += Math.abs(err);
    sqSum += err * err;
    if (actual[i] > 0) {
      apeSum += Math.abs(err) / actual[i];
      apeCount++;
    }
  }
  return {
    mae: absSum / n,
    rmse: Math.sqrt(sqSum / n),
    mape: apeCount > 0 ? apeSum / apeCount : null,
    n,
  };
}

// ── Model selection + fitting ───────────────────────────────────────────────

interface FitResult {
  method: ForecastMethod;
  params: { alpha?: number; beta?: number; window?: number };
  /** Held-out accuracy of the chosen model. */
  accuracy: ForecastAccuracy;
  /** Forecast objects for projecting the horizon. */
  level: number;
  trend: number;
  flatRate: number; // for ses/naive/ma/croston
}

/** Index where the held-out test tail begins (~last 25%, at least 3 points). */
function holdoutStart(n: number): number {
  const test = Math.max(3, Math.floor(n * 0.25));
  return Math.max(1, n - test);
}

function scoreOnHoldout(values: number[], fitted: number[]): ForecastAccuracy {
  const start = holdoutStart(values.length);
  return accuracy(values.slice(start), fitted.slice(start));
}

/**
 * Fit the best model for a demand series, choosing the most sophisticated rung
 * the data supports and grid-searching its parameters to minimize held-out RMSE.
 */
export function fitBest(values: number[], opts: ForecastOptions = {}): FitResult {
  const n = values.length;
  const minSES = opts.minDaysForSES ?? MIN_DAYS_SES;
  const minHolt = opts.minDaysForHolt ?? MIN_DAYS_HOLT;

  const noneResult: FitResult = {
    method: 'none',
    params: {},
    accuracy: { mae: 0, rmse: 0, mape: null, n: 0 },
    level: 0,
    trend: 0,
    flatRate: 0,
  };
  if (n === 0) return noneResult;

  const nonZero = values.filter((v) => v > 0).length;
  if (nonZero === 0) return noneResult;

  // Intermittent demand (mostly-zero days, enough history) → Croston.
  const intermittent = n >= minSES && nonZero / n < 0.35;
  if (intermittent) {
    let best: FitResult | null = null;
    for (const alpha of ALPHA_GRID) {
      const { rate, fitted } = croston(values, alpha);
      const acc = scoreOnHoldout(values, fitted);
      if (!best || acc.rmse < best.accuracy.rmse) {
        best = { method: 'croston', params: { alpha }, accuracy: acc, level: rate, trend: 0, flatRate: rate };
      }
    }
    if (best) return best;
  }

  // Not enough history for smoothing → naive mean.
  if (n < minSES) {
    const fitted = fittedNaiveMean(values);
    const flatRate = mean(values);
    return {
      method: 'naive-mean',
      params: {},
      accuracy: scoreOnHoldout(values, fitted),
      level: flatRate,
      trend: 0,
      flatRate,
    };
  }

  // Candidate: SES (grid over alpha).
  let sesBest: FitResult | null = null;
  for (const alpha of ALPHA_GRID) {
    const { level, fitted } = ses(values, alpha);
    const acc = scoreOnHoldout(values, fitted);
    if (!sesBest || acc.rmse < sesBest.accuracy.rmse) {
      sesBest = { method: 'ses', params: { alpha }, accuracy: acc, level, trend: 0, flatRate: level };
    }
  }

  // Candidate: Holt (grid over alpha,beta) — only with enough history.
  let holtBest: FitResult | null = null;
  if (n >= minHolt) {
    for (const alpha of ALPHA_GRID) {
      for (const beta of BETA_GRID) {
        const { level, trend, fitted } = holt(values, alpha, beta);
        const acc = scoreOnHoldout(values, fitted);
        if (!holtBest || acc.rmse < holtBest.accuracy.rmse) {
          holtBest = { method: 'holt', params: { alpha, beta }, accuracy: acc, level, trend, flatRate: level };
        }
      }
    }
  }

  // Baseline: moving average (window 7) as a floor comparison.
  const maFitted = fittedMovingAverage(values, 7);
  const maResult: FitResult = {
    method: 'moving-average',
    params: { window: 7 },
    accuracy: scoreOnHoldout(values, maFitted),
    level: mean(values.slice(-7)),
    trend: 0,
    flatRate: mean(values.slice(-7)),
  };

  // Pick the lowest held-out RMSE; prefer the simpler model on a tie.
  const candidates = [sesBest, holtBest, maResult].filter(Boolean) as FitResult[];
  candidates.sort((a, b) => a.accuracy.rmse - b.accuracy.rmse);
  return candidates[0] ?? maResult;
}

// ── Seasonality ─────────────────────────────────────────────────────────────

/**
 * School-opening seasonal multiplier. Presented as an OPERATOR OVERRIDE (from
 * isJulyPeakSeasonMode), not a fitted seasonal index: it applies the peak
 * multiplier only inside the PH school-opening window (Jun–Aug) when the
 * operator has the flag on; otherwise 1 (no adjustment).
 */
export function seasonalMultiplier(opts: ForecastOptions, asOf: Date): number {
  if (!opts.isPeakSeason) return 1;
  return PEAK_MONTHS.has(asOf.getMonth()) ? (opts.peakMultiplier ?? DEFAULT_PEAK_MULT) : 1;
}

// ── Top-level forecast ──────────────────────────────────────────────────────

function confidenceFor(spanDays: number, nonZeroDays: number, acc: ForecastAccuracy): DemandForecastResult['confidence'] {
  if (spanDays === 0 || nonZeroDays === 0) return 'none';
  if (spanDays < MIN_DAYS_SES || nonZeroDays < 5) return 'low';
  if (spanDays >= MIN_DAYS_HOLT && (acc.mape === null || acc.mape <= 0.35)) return 'high';
  return 'medium';
}

function methodLabel(m: ForecastMethod): string {
  switch (m) {
    case 'holt':
      return "Holt's linear trend (double exponential smoothing)";
    case 'ses':
      return 'Simple exponential smoothing';
    case 'croston':
      return "Croston's method (intermittent demand)";
    case 'moving-average':
      return '7-day moving average';
    case 'naive-mean':
      return 'Average of history (limited data)';
    default:
      return 'No sales history';
  }
}

/**
 * Produce a DemandForecastResult for a demand series: fit the best ETS-family
 * model, project the horizon, apply the seasonal override, and summarize
 * accuracy + confidence. Pure — safe to memoize in the view.
 */
export function forecastDemand(series: DemandSeries, opts: ForecastOptions = {}): DemandForecastResult {
  const asOf = opts.asOf ?? new Date();
  const horizonDays = opts.horizonDays ?? DEFAULT_HORIZON;
  const values = series.points.map((p) => p.qty);
  const factor = seasonalMultiplier(opts, asOf);

  if (series.spanDays === 0 || series.nonZeroDays === 0) {
    return {
      productId: series.productId,
      branch: series.branch,
      method: 'none',
      params: {},
      dailyRate: 0,
      dailyStdDev: 0,
      horizon: new Array(horizonDays).fill(0),
      seasonalFactor: 1,
      accuracy: { mae: 0, rmse: 0, mape: null, n: 0 },
      confidence: 'none',
      dataDays: series.spanDays,
      note: 'No sales history yet — reorder falls back to the min-stock rule.',
    };
  }

  const fit = fitBest(values, opts);

  // Project the horizon: Holt carries trend; every other method is flat.
  const horizon: number[] = [];
  for (let h = 1; h <= horizonDays; h++) {
    const raw = fit.method === 'holt' ? fit.level + h * fit.trend : fit.flatRate;
    horizon.push(Math.max(0, raw) * factor);
  }

  const dailyRate = Math.max(0, mean(horizon));
  const dailyStdDev = sampleStdDev(values);

  return {
    productId: series.productId,
    branch: series.branch,
    method: fit.method,
    params: fit.params,
    dailyRate,
    dailyStdDev,
    horizon,
    seasonalFactor: factor,
    accuracy: fit.accuracy,
    confidence: confidenceFor(series.spanDays, series.nonZeroDays, fit.accuracy),
    dataDays: series.spanDays,
    note:
      `${methodLabel(fit.method)}. ${series.nonZeroDays} sale-day(s) over ${series.spanDays} days` +
      (factor !== 1 ? `; ×${factor} school-opening season` : '') +
      '.',
  };
}

// ── Pre-order forward demand (committed, not yet in transactions) ───────────

/**
 * Units committed to unclaimed pre-orders for a product at a branch. Counts only
 * Pending / Preparing / Ready for Pickup — a Claimed order has already been rung
 * up into `transactions` by completeSale (so counting it here would double-count),
 * and Cancelled is dead. This is FORWARD demand for reorder sizing; it must never
 * enter the training series.
 */
export function committedPreOrderQty(
  preOrders: CustomerPreOrder[],
  productId: string,
  branch: BranchName,
): number {
  const live = new Set(['Pending', 'Preparing', 'Ready for Pickup']);
  let qty = 0;
  for (const order of preOrders) {
    if (!live.has(order.orderStatus)) continue;
    if (normalizeBranch(order.pickupBranch) !== branch) continue;
    for (const item of order.items) {
      if (item.productId === productId) qty += item.quantity;
    }
  }
  return qty;
}
