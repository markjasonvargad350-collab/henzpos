/**
 * sampleSalesHistory.ts — ISOLATED, IN-MEMORY simulated sales for the Demand
 * Forecast demo. READ THIS BEFORE EDITING:
 *
 *   • This module is NEVER imported by src/context/POSContext.tsx and its output
 *     is NEVER passed to setDoc / writeBatch / addDoc / seedIfEmpty or any other
 *     Firestore write. It exists only so the forecasting UI has something to
 *     show today, while the real `transactions` collection stays empty and clean
 *     (it is the official BIR tax record — an empty sales report is a correct
 *     one, and we never seed fake sales into it).
 *   • The only consumer is src/components/forecast/DemandForecast.tsx, which
 *     holds this in component state and feeds it to the SAME pure pipeline the
 *     real data uses (forecasting.ts / reorder.ts). "Sample" and "Real" differ
 *     only in which array of transactions is fed in — the math is identical.
 *   • The generator is a SEEDED PRNG, so the demo is byte-for-byte reproducible
 *     for the thesis defense (no Math.random, no Date.now inside the model).
 *
 * The simulated demand is: per-product base rate × weekday shape × school-opening
 * seasonal surge × mild upward trend + bounded noise, split across the two
 * branches. A small fraction of products are left "dormant" (no sample sales) on
 * purpose, to demonstrate the cold-start / min-stock fallback path too.
 */

import type { CartItem, Product, SaleTransaction } from '../types';
import { BRANCH_MAIN, BRANCH_DJABEZ } from '../lib/branches';
import { dateStamp } from '../utils/ids';

/** Human-readable label for the amber "simulated data" banner + docs. */
export const SAMPLE_DATA_NOTE =
  'SIMULATED demonstration data — not real sales, never written to the database.';

/** Tunable simulation parameters, exported so the paper can cite exact settings. */
export const SAMPLE_PARAMS = {
  /** Days of history generated, ending today. */
  historyDays: 120,
  /** Share of a product's demand attributed to each branch. */
  branchShare: { main: 0.6, djabez: 0.4 },
  /** Demand multiplier by weekday (index 0 = Sunday … 6 = Saturday). */
  weekdayShape: [0.55, 1.15, 1.2, 1.1, 1.05, 1.25, 0.65],
  /** School-opening seasonal surge by month index (Jan = 0 … Dec = 11). */
  seasonalByMonth: [1, 1, 1, 1, 1.15, 1.4, 1.4, 1.4, 1.1, 1, 1, 1.05],
  /** Fraction of products with no simulated sales (cold-start demo). */
  dormantFraction: 0.06,
  /** Fast-moving base daily demand window (units/day). */
  fastBase: { min: 2, span: 7 },
  /** Slow-moving base daily demand window (units/day). */
  slowBase: { min: 0.15, span: 1.6 },
  /** Max mild upward trend (units/day of growth over the window). */
  maxTrendPerDay: 0.015,
  /** Peak noise amplitude as a fraction of the daily mean. */
  noiseFraction: 0.4,
} as const;

export interface SampleOptions {
  /** Anchor "today" for the simulation (defaults to new Date()). */
  asOf?: Date;
  /** Override the number of history days. */
  historyDays?: number;
}

// ── Deterministic PRNG (mulberry32) + string hash ───────────────────────────

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Date helpers (local time, matching dateStamp) ───────────────────────────

function dayFloor(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

// ── Per-product "personality" (stable, derived from its id) ─────────────────

interface Personality {
  dormant: boolean;
  baseDaily: number;
  trendPerDay: number;
  intermittent: boolean;
}

function personalityFor(product: Product): Personality {
  const h = hashStr(product.id);
  const r = (h % 1000) / 1000; // stable 0..1
  const dormant = r < SAMPLE_PARAMS.dormantFraction;
  const baseDaily = product.isFastMoving
    ? SAMPLE_PARAMS.fastBase.min + r * SAMPLE_PARAMS.fastBase.span
    : SAMPLE_PARAMS.slowBase.min + r * SAMPLE_PARAMS.slowBase.span;
  const trendPerDay = (((h >>> 7) % 100) / 100) * SAMPLE_PARAMS.maxTrendPerDay;
  const intermittent = !product.isFastMoving && ((h >>> 3) % 100) / 100 < 0.5;
  return { dormant, baseDaily, trendPerDay, intermittent };
}

function seasonalFor(date: Date): number {
  return SAMPLE_PARAMS.seasonalByMonth[date.getMonth()] ?? 1;
}

/** Simulated units sold for one product, on one day, at one branch. */
function sampledQty(
  product: Product,
  personality: Personality,
  date: Date,
  dayIndex: number,
  branchShare: number,
  branchKey: string,
): number {
  if (personality.dormant) return 0;
  const rng = mulberry32(hashStr(`${product.id}|${dateStamp(date)}|${branchKey}`));
  const weekday = SAMPLE_PARAMS.weekdayShape[date.getDay()] ?? 1;
  const meanQty =
    personality.baseDaily *
    branchShare *
    weekday *
    seasonalFor(date) *
    (1 + personality.trendPerDay * dayIndex);
  if (personality.intermittent && rng() > 0.5) return 0; // sells ~half the days
  const noise = (rng() * 2 - 1) * SAMPLE_PARAMS.noiseFraction * meanQty;
  return Math.max(0, Math.round(meanQty + noise));
}

// ── Transaction assembly ────────────────────────────────────────────────────

function buildTransaction(
  items: CartItem[],
  date: Date,
  branch: typeof BRANCH_MAIN | typeof BRANCH_DJABEZ,
  branchIndex: number,
): SaleTransaction {
  // Deterministic within-day timestamp: 10:00 for Main, 11:00 for D'Jabez, plus
  // a stable minute offset so ids never collide.
  const seedMinute = hashStr(`${dateStamp(date)}|${branch}`) % 60;
  const stamp = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10 + branchIndex, seedMinute);
  const epoch = stamp.getTime();

  const subtotal = items.reduce((sum, it) => sum + it.subtotal, 0);
  const grandTotal = subtotal; // sample data has no discounts
  const taxAmount = grandTotal - Math.round(grandTotal / 1.12); // VAT-inclusive remainder
  const totalItemCount = items.reduce((sum, it) => sum + it.quantity, 0);
  const isPeak = SAMPLE_PARAMS.seasonalByMonth[date.getMonth()] > 1;

  return {
    id: `tx-${epoch}-SAMPLE`,
    receiptNumber: `SAMPLE-${dateStamp(date)}-${branchIndex}`,
    timestamp: stamp.toLocaleString(),
    branch,
    cashierName: 'Sample Data',
    customerName: 'Simulated Customer',
    customerType: isPeak ? 'Student' : 'Walk-in',
    items,
    totalItemCount,
    subtotal,
    discountAmount: 0,
    taxAmount,
    grandTotal,
    paymentMethod: 'Cash',
    status: 'Completed',
  };
}

/**
 * Generate the isolated in-memory sample sales history: one aggregated
 * transaction per (day, branch), oldest first. This is the only export the
 * forecast view uses; it is fed to the same pure pipeline as real sales.
 */
export function generateSampleTransactions(products: Product[], opts: SampleOptions = {}): SaleTransaction[] {
  if (products.length === 0) return [];
  const asOf = dayFloor(opts.asOf ?? new Date());
  const days = opts.historyDays ?? SAMPLE_PARAMS.historyDays;
  const start = addDays(asOf, -(days - 1));

  const personalities = new Map<string, Personality>();
  for (const p of products) personalities.set(p.id, personalityFor(p));

  const branches: { name: typeof BRANCH_MAIN | typeof BRANCH_DJABEZ; key: string; share: number }[] = [
    { name: BRANCH_MAIN, key: 'main', share: SAMPLE_PARAMS.branchShare.main },
    { name: BRANCH_DJABEZ, key: 'djabez', share: SAMPLE_PARAMS.branchShare.djabez },
  ];

  const out: SaleTransaction[] = [];
  for (let dayIndex = 0; dayIndex < days; dayIndex++) {
    const date = addDays(start, dayIndex);
    branches.forEach((branch, branchIndex) => {
      const items: CartItem[] = [];
      for (const product of products) {
        const personality = personalities.get(product.id);
        if (!personality) continue;
        const qty = sampledQty(product, personality, date, dayIndex, branch.share, branch.key);
        if (qty <= 0) continue;
        items.push({
          product,
          quantity: qty,
          unitPrice: product.price,
          subtotal: qty * product.price,
        });
      }
      if (items.length > 0) out.push(buildTransaction(items, date, branch.name, branchIndex));
    });
  }
  return out;
}
