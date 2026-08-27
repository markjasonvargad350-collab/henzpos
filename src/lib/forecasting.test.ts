/**
 * Unit tests for the forecasting engine (Exponential Smoothing family).
 *
 * These double as the "model validation" evidence for the research paper: the
 * smoothing recursions, the accuracy metrics, the demand-series construction
 * (zero-fill + tx-id time key), and the cold-start fallback are checked against
 * hand-computed expected values.
 */
import { describe, it, expect } from 'vitest';
import type { Product, SaleTransaction } from '../types';
import { BRANCH_MAIN, BRANCH_DJABEZ } from './branches';
import {
  accuracy,
  buildDailyDemandSeries,
  forecastDemand,
  holt,
  seasonalMultiplier,
  ses,
  txEpochMs,
} from './forecasting';

function makeProduct(id: string, over: Partial<Product> = {}): Product {
  return {
    id,
    sku: `SKU-${id}`,
    barcode: `BC-${id}`,
    name: `Product ${id}`,
    category: 'Consumables & Accessories',
    unit: 'piece',
    price: 10,
    costPrice: 5,
    stockMainBranch: 0,
    stockUsaBranch: 0,
    minStockLevel: 10,
    isFastMoving: true,
    shelfLifeType: 'long',
    batchNumber: 'B1',
    expiryDate: '2030-01-01',
    fdaRegistrationNo: 'FDA-1',
    ...over,
  };
}

function makeTx(date: Date, productId: string, qty: number, branch = BRANCH_MAIN, status: 'Completed' | 'Refunded' = 'Completed'): SaleTransaction {
  const epoch = date.getTime();
  return {
    id: `tx-${epoch}-TEST`,
    receiptNumber: 'R-TEST',
    timestamp: date.toLocaleString(),
    branch,
    cashierName: 'tester',
    customerName: 'tester',
    customerType: 'Walk-in',
    items: [{ product: makeProduct(productId), quantity: qty, unitPrice: 10, subtotal: qty * 10 }],
    totalItemCount: qty,
    subtotal: qty * 10,
    discountAmount: 0,
    taxAmount: 0,
    grandTotal: qty * 10,
    paymentMethod: 'Cash',
    status,
  };
}

describe('txEpochMs', () => {
  it('prefers the epoch embedded in the tx id', () => {
    expect(txEpochMs({ id: 'tx-1700000000000-ABCD', timestamp: 'not a date' })).toBe(1700000000000);
  });

  it('falls back to parsing the timestamp when the id has no epoch', () => {
    const expected = new Date('2026-01-15T10:00:00').getTime();
    expect(txEpochMs({ id: 'bad-id', timestamp: '2026-01-15T10:00:00' })).toBe(expected);
  });

  it('returns null when neither id nor timestamp parses', () => {
    expect(txEpochMs({ id: 'bad', timestamp: 'nonsense' })).toBeNull();
  });

  it('ignores a zero/negative embedded epoch and falls back', () => {
    const expected = new Date('2026-02-01T08:00:00').getTime();
    expect(txEpochMs({ id: 'tx-0-XX', timestamp: '2026-02-01T08:00:00' })).toBe(expected);
  });
});

describe('ses (simple exponential smoothing)', () => {
  it('stays flat on a flat series', () => {
    const { level, fitted } = ses([10, 10, 10], 0.5);
    expect(level).toBeCloseTo(10);
    expect(fitted).toEqual([10, 10, 10]);
  });

  it('smooths toward a step change with the given alpha', () => {
    const { level, fitted } = ses([0, 10], 0.5);
    expect(fitted).toEqual([0, 0]); // one-step forecast for day 1 is the prior level (0)
    expect(level).toBeCloseTo(5); // 0.5*10 + 0.5*0
  });
});

describe('holt (double exponential smoothing / linear trend)', () => {
  it('tracks a perfect linear trend exactly', () => {
    const { level, trend, fitted } = holt([10, 12, 14], 0.5, 0.5);
    expect(fitted).toEqual([10, 12, 14]); // one-step-ahead forecasts land on the actuals
    expect(level).toBeCloseTo(14);
    expect(trend).toBeCloseTo(2);
  });
});

describe('accuracy (MAE / RMSE / MAPE)', () => {
  it('computes MAE, RMSE and MAPE over positive actuals', () => {
    const acc = accuracy([10, 20], [12, 18]);
    expect(acc.mae).toBeCloseTo(2);
    expect(acc.rmse).toBeCloseTo(2);
    expect(acc.mape).toBeCloseTo(0.15); // (0.2 + 0.1) / 2
    expect(acc.n).toBe(2);
  });

  it('returns null MAPE when there are no positive actuals', () => {
    const acc = accuracy([0, 0], [1, 2]);
    expect(acc.mape).toBeNull();
    expect(acc.mae).toBeCloseTo(1.5);
  });

  it('handles empty input without dividing by zero', () => {
    const acc = accuracy([], []);
    expect(acc).toEqual({ mae: 0, rmse: 0, mape: null, n: 0 });
  });
});

describe('buildDailyDemandSeries', () => {
  it('zero-fills gaps to a contiguous daily series', () => {
    const d0 = new Date(2026, 0, 10, 12, 0);
    const d2 = new Date(2026, 0, 12, 12, 0);
    const series = buildDailyDemandSeries([makeTx(d0, 'p1', 3), makeTx(d2, 'p1', 5)], 'p1', BRANCH_MAIN, {
      asOf: d2,
      lookbackDays: 90,
    });
    expect(series.points.map((p) => p.qty)).toEqual([3, 0, 5]);
    expect(series.spanDays).toBe(3);
    expect(series.nonZeroDays).toBe(2);
    expect(series.totalQty).toBe(8);
  });

  it('excludes refunded transactions and other branches', () => {
    const d0 = new Date(2026, 0, 10, 12, 0);
    const txs = [
      makeTx(d0, 'p1', 3, BRANCH_MAIN),
      makeTx(d0, 'p1', 99, BRANCH_MAIN, 'Refunded'),
      makeTx(d0, 'p1', 7, BRANCH_DJABEZ),
    ];
    const main = buildDailyDemandSeries(txs, 'p1', BRANCH_MAIN, { asOf: d0, lookbackDays: 90 });
    expect(main.totalQty).toBe(3);
    const all = buildDailyDemandSeries(txs, 'p1', 'ALL', { asOf: d0, lookbackDays: 90 });
    expect(all.totalQty).toBe(10); // 3 main + 7 djabez, refund still excluded
  });
});

describe('forecastDemand cold start', () => {
  it('returns method "none" with a zero horizon when there is no history', () => {
    const series = buildDailyDemandSeries([], 'p1', BRANCH_MAIN, { asOf: new Date(2026, 0, 12) });
    const forecast = forecastDemand(series, { horizonDays: 14 });
    expect(forecast.method).toBe('none');
    expect(forecast.confidence).toBe('none');
    expect(forecast.dailyRate).toBe(0);
    expect(forecast.horizon).toHaveLength(14);
    expect(forecast.horizon.every((v) => v === 0)).toBe(true);
  });
});

describe('seasonalMultiplier', () => {
  it('applies the peak multiplier only in the school-opening window when enabled', () => {
    const july = new Date(2026, 6, 15);
    const january = new Date(2026, 0, 15);
    expect(seasonalMultiplier({ isPeakSeason: true, peakMultiplier: 1.25 }, july)).toBeCloseTo(1.25);
    expect(seasonalMultiplier({ isPeakSeason: true, peakMultiplier: 1.25 }, january)).toBe(1);
    expect(seasonalMultiplier({ isPeakSeason: false }, july)).toBe(1);
  });
});
