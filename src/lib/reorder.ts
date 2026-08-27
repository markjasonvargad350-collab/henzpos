/**
 * reorder.ts — the "Reorder Recommendation" half of the research title.
 *
 * This is a classical forecast-driven inventory policy (operations research),
 * NOT machine learning: it CONSUMES the demand forecast from forecasting.ts and
 * turns it into a concrete "order N units by date D" decision using the standard
 * (s, S) / order-up-to model with a safety stock sized for a service level.
 *
 * Document it in the paper as distinct from the ML forecast — the forecast
 * predicts demand; this layer decides the reorder. Pure module (no Firestore, no
 * React), so it is unit-testable and can never touch the live `transactions`.
 *
 * Formulas (see docs/METHODOLOGY.md):
 *   safetyStock = z · dailyStdDev · √leadTime            (falls back to minStock)
 *   ROP         = dailyDemand · leadTime + safetyStock
 *   orderUpTo   = dailyDemand · (leadTime + reviewPeriod) + safetyStock
 *   suggestedQty= max(0, orderUpTo + committedPreOrders − onHand)   [expiry-capped]
 */

import type {
  BranchName,
  CustomerPreOrder,
  DemandForecastResult,
  Product,
  ReorderRecommendation,
  SaleTransaction,
  Urgency,
} from '../types';
import { branchStockField } from './branches';
import {
  buildDemandIndex,
  committedPreOrderQty,
  forecastDemand,
  seriesFromDayMap,
  type ForecastOptions,
} from './forecasting';

/**
 * Supplier lead time is NOT in the data model — the catalogue only carries
 * minStockLevel. This is an explicitly ASSUMED default (7 days), surfaced and
 * editable in the UI and labeled as an assumption. We do not fabricate
 * per-supplier lead times.
 */
export const DEFAULT_LEAD_TIME_DAYS = 7;
/** How often stock is reviewed / an order can be placed (order-up-to horizon). */
export const DEFAULT_REVIEW_PERIOD_DAYS = 30;
/** z ≈ 1.65 → ~95% cycle service level for the safety stock. */
export const DEFAULT_SERVICE_Z = 1.65;

export interface ReorderSettings {
  leadTimeDays?: number;
  reviewPeriodDays?: number;
  serviceZ?: number;
}

const DAY_MS = 86_400_000;

// ── Core inventory formulas ─────────────────────────────────────────────────

/**
 * Safety stock = z · σ_daily · √leadTime. When demand is too thin to estimate a
 * standard deviation (σ ≤ 0), fall back to the store's familiar minStockLevel so
 * the policy degrades to the existing low-stock trigger rather than to zero.
 */
export function safetyStock(dailyStdDev: number, leadTimeDays: number, z: number, fallbackMin: number): number {
  if (!Number.isFinite(dailyStdDev) || dailyStdDev <= 0) return Math.max(0, fallbackMin);
  return z * dailyStdDev * Math.sqrt(Math.max(0, leadTimeDays));
}

/** Reorder point: expected demand over the lead time, plus safety stock. */
export function reorderPoint(dailyDemand: number, leadTimeDays: number, safety: number): number {
  return Math.max(0, dailyDemand) * Math.max(0, leadTimeDays) + Math.max(0, safety);
}

/** Order-up-to level: cover lead time + one review period, plus safety stock. */
export function orderUpTo(dailyDemand: number, leadTimeDays: number, reviewDays: number, safety: number): number {
  return Math.max(0, dailyDemand) * (Math.max(0, leadTimeDays) + Math.max(0, reviewDays)) + Math.max(0, safety);
}

/** Days the current on-hand lasts at the forecast rate; null when demand is 0. */
export function daysOfCover(onHand: number, dailyDemand: number): number | null {
  if (dailyDemand <= 0) return null;
  return onHand / dailyDemand;
}

/**
 * Urgency → color band (matches the app palette):
 *   critical (rose)  — out of stock, or cover shorter than the lead time
 *   high (amber)     — at/below the reorder point
 *   medium           — below the order-up-to level
 *   ok (emerald)     — comfortably stocked
 */
export function classifyUrgency(
  onHand: number,
  rop: number,
  orderUpToLevel: number,
  dailyDemand: number,
  leadTimeDays: number,
): Urgency {
  if (dailyDemand <= 0) return onHand <= 0 ? 'high' : 'ok';
  const cover = onHand / dailyDemand;
  if (onHand <= 0 || cover < leadTimeDays) return 'critical';
  if (onHand <= rop) return 'high';
  if (onHand <= orderUpToLevel) return 'medium';
  return 'ok';
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseExpiry(raw: string | undefined): Date | null {
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : new Date(t);
}

// ── The recommendation for a single product/branch ──────────────────────────

/**
 * Build a reorder recommendation from a product, its branch, and a demand
 * forecast. Handles the cold-start case (`method === 'none'`) by falling back to
 * the min-stock rule, folds in committed pre-orders, and caps perishables that
 * cannot sell before they expire.
 */
export function recommendReorder(
  product: Product,
  branch: BranchName,
  forecast: DemandForecastResult,
  committed: number,
  settings: ReorderSettings = {},
  asOf: Date = new Date(),
): ReorderRecommendation {
  const leadTimeDays = settings.leadTimeDays ?? DEFAULT_LEAD_TIME_DAYS;
  const reviewDays = settings.reviewPeriodDays ?? DEFAULT_REVIEW_PERIOD_DAYS;
  const z = settings.serviceZ ?? DEFAULT_SERVICE_Z;

  const onHand = product[branchStockField(branch)] ?? 0;
  const coldStart = forecast.method === 'none';

  let dailyDemand: number;
  let safety: number;
  let rop: number;
  let orderUpToLevel: number;

  if (coldStart) {
    // No sales history: use the store's min-stock rule as the prior. Proxy a
    // daily rate so days-of-cover and urgency still read sensibly, target the
    // familiar minStockLevel*2 order-up-to (matches the app's rebalance heuristic).
    const minLevel = Math.max(0, product.minStockLevel);
    dailyDemand = minLevel > 0 ? minLevel / leadTimeDays : 0;
    safety = minLevel;
    rop = minLevel;
    orderUpToLevel = minLevel * 2;
  } else {
    dailyDemand = forecast.dailyRate;
    safety = safetyStock(forecast.dailyStdDev, leadTimeDays, z, product.minStockLevel);
    rop = reorderPoint(dailyDemand, leadTimeDays, safety);
    orderUpToLevel = orderUpTo(dailyDemand, leadTimeDays, reviewDays, safety);
  }

  // Need = restock to the order-up-to level, plus what's already promised to
  // unclaimed pre-orders, minus what's on the shelf.
  let suggestedOrderQty = Math.max(0, Math.ceil(orderUpToLevel + committed - onHand));

  // Expiry guard for short-shelf-life items: never order more than can sell
  // before expiry (accounting for the lead time before stock even arrives).
  const expiry = parseExpiry(product.expiryDate);
  let expiryRisk = false;
  if (product.shelfLifeType === 'short' && expiry) {
    const daysToExpiry = Math.round((expiry.getTime() - asOf.getTime()) / DAY_MS);
    if (daysToExpiry <= leadTimeDays + reviewDays) expiryRisk = true;
    if (dailyDemand > 0) {
      const sellableBeforeExpiry = Math.floor(dailyDemand * Math.max(0, daysToExpiry - leadTimeDays));
      if (sellableBeforeExpiry <= 0) {
        suggestedOrderQty = 0;
        expiryRisk = true;
      } else if (sellableBeforeExpiry < suggestedOrderQty) {
        suggestedOrderQty = sellableBeforeExpiry;
        expiryRisk = true;
      }
    } else if (daysToExpiry <= 0) {
      suggestedOrderQty = 0;
      expiryRisk = true;
    }
  }

  const cover = daysOfCover(onHand, dailyDemand);
  const urgency = classifyUrgency(onHand, rop, orderUpToLevel, dailyDemand, leadTimeDays);

  // Order-by date: place the order this many days before cover runs out that it
  // still arrives in time (cover − leadTime). Only meaningful when reordering.
  let orderByDate: string | null = null;
  if (suggestedOrderQty > 0 && cover !== null) {
    const daysUntilOrder = Math.max(0, Math.floor(cover - leadTimeDays));
    orderByDate = fmtDate(new Date(asOf.getTime() + daysUntilOrder * DAY_MS));
  }

  return {
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    branch,
    onHand,
    dailyDemand,
    leadTimeDays,
    safetyStock: safety,
    reorderPoint: rop,
    orderUpToLevel,
    suggestedOrderQty,
    daysOfCover: cover,
    orderByDate,
    urgency,
    committedPreOrderQty: committed,
    expiryRisk,
    method: forecast.method,
    reason: buildReason({
      product,
      branch,
      forecast,
      coldStart,
      onHand,
      dailyDemand,
      cover,
      leadTimeDays,
      suggestedOrderQty,
      committed,
      expiryRisk,
      orderUpToLevel,
    }),
  };
}

interface ReasonInput {
  product: Product;
  branch: BranchName;
  forecast: DemandForecastResult;
  coldStart: boolean;
  onHand: number;
  dailyDemand: number;
  cover: number | null;
  leadTimeDays: number;
  suggestedOrderQty: number;
  committed: number;
  expiryRisk: boolean;
  orderUpToLevel: number;
}

/** Plain-English explanation for one row — no jargon, the numbers a buyer needs. */
function buildReason(i: ReasonInput): string {
  if (i.expiryRisk && i.suggestedOrderQty === 0) {
    return `Short shelf-life item near expiry (${i.product.expiryDate}) — a new order can't sell before it expires. Don't reorder; consider a promo to move current stock.`;
  }
  if (i.coldStart) {
    if (i.suggestedOrderQty > 0) {
      return `No sales history yet — using the min-stock rule. ${i.onHand} on hand; order ${i.suggestedOrderQty} to reach the ${Math.round(i.orderUpToLevel)}-unit target.`;
    }
    return `No sales history yet — using the min-stock rule. ${i.onHand} on hand is at/above the min-stock floor, so no order needed.`;
  }

  const rate = i.dailyDemand >= 1 ? i.dailyDemand.toFixed(1) : i.dailyDemand.toFixed(2);
  const coverText = i.cover === null ? 'no measurable demand' : `≈ ${Math.floor(i.cover)} day(s) left`;
  const coverVsLead =
    i.cover !== null && i.cover < i.leadTimeDays ? `, under the ${i.leadTimeDays}-day lead time` : '';

  let sentence = `Sells ~${rate}/day; ${i.onHand} on hand ${coverText}${coverVsLead}.`;
  if (i.suggestedOrderQty > 0) {
    sentence += ` Order ${i.suggestedOrderQty}`;
    if (i.committed > 0) sentence += ` (incl. ${i.committed} committed pre-order unit(s))`;
    sentence += '.';
  } else {
    sentence += ' Stock is sufficient — no order needed.';
  }
  if (i.expiryRisk) sentence += ' Capped for expiry risk.';
  return sentence;
}

// ── Whole-catalogue pass ────────────────────────────────────────────────────

const URGENCY_RANK: Record<Urgency, number> = { critical: 0, high: 1, medium: 2, ok: 3 };

/**
 * Recommend reorders for every product at a branch. Builds the demand index in a
 * single pass, forecasts each product, folds in committed pre-orders, and sorts
 * most-urgent first (then by suggested quantity). Pure — memoize in the view.
 */
export function recommendAll(
  products: Product[],
  transactions: SaleTransaction[],
  preOrders: CustomerPreOrder[],
  branch: BranchName,
  settings: ReorderSettings = {},
  forecastOpts: ForecastOptions = {},
): ReorderRecommendation[] {
  const asOf = forecastOpts.asOf ?? new Date();
  const lookback = forecastOpts.lookbackDays ?? 90;
  const index = buildDemandIndex(transactions, branch);

  const rows = products.map((product) => {
    const dayMap = index.get(product.id) ?? new Map<string, number>();
    const series = seriesFromDayMap(dayMap, product.id, branch, asOf, lookback);
    const forecast = forecastDemand(series, forecastOpts);
    const committed = committedPreOrderQty(preOrders, product.id, branch);
    return recommendReorder(product, branch, forecast, committed, settings, asOf);
  });

  rows.sort((a, b) => {
    const byUrgency = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (byUrgency !== 0) return byUrgency;
    return b.suggestedOrderQty - a.suggestedOrderQty;
  });
  return rows;
}
