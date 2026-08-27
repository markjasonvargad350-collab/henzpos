/**
 * Unit tests for the reorder policy (forecast-driven inventory model).
 *
 * Validation evidence for the paper: the safety-stock / reorder-point /
 * order-up-to formulas, urgency banding, the cold-start (min-stock) fallback,
 * the expiry cap for short-shelf-life items, and the pre-order dedupe (only
 * unclaimed orders count as forward demand) are checked against hand computations.
 */
import { describe, it, expect } from 'vitest';
import type { CustomerPreOrder, DemandForecastResult, Product } from '../types';
import { BRANCH_MAIN, BRANCH_DJABEZ } from './branches';
import {
  classifyUrgency,
  daysOfCover,
  orderUpTo,
  recommendReorder,
  reorderPoint,
  safetyStock,
} from './reorder';
import { committedPreOrderQty } from './forecasting';

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

function makeForecast(over: Partial<DemandForecastResult> = {}): DemandForecastResult {
  return {
    productId: 'p1',
    branch: BRANCH_MAIN,
    method: 'holt',
    params: { alpha: 0.5, beta: 0.1 },
    dailyRate: 4,
    dailyStdDev: 2,
    horizon: [],
    seasonalFactor: 1,
    accuracy: { mae: 0, rmse: 0, mape: null, n: 0 },
    confidence: 'medium',
    dataDays: 30,
    note: '',
    ...over,
  };
}

function makePreOrder(status: CustomerPreOrder['orderStatus'], productId: string, qty: number, branch = BRANCH_MAIN): CustomerPreOrder {
  return {
    id: `po-${status}-${qty}`,
    orderNumber: 'HNZ-TEST',
    qrCodeValue: 'qr',
    customerName: 'c',
    schoolOrClinic: 's',
    contactNumber: '0900',
    pickupBranch: branch,
    targetPickupDate: '2026-09-01',
    items: [{ productId, productName: 'x', barcode: 'b', quantity: qty, unitPrice: 10, unit: 'piece' }],
    totalItems: qty,
    totalAmount: qty * 10,
    paymentStatus: 'Unpaid (Pay Later at Store)',
    paymentMethod: 'Cash',
    orderStatus: status,
    createdAt: '2026-08-01',
  };
}

describe('inventory formulas', () => {
  it('safetyStock = z · σ · √leadTime, falling back to minStock when σ is 0', () => {
    expect(safetyStock(2, 9, 1.65, 5)).toBeCloseTo(1.65 * 2 * 3); // √9 = 3 → 9.9
    expect(safetyStock(0, 9, 1.65, 5)).toBe(5); // thin data → min-stock fallback
  });

  it('reorderPoint = demand · leadTime + safety', () => {
    expect(reorderPoint(4, 7, 10)).toBe(38);
  });

  it('orderUpTo = demand · (leadTime + review) + safety', () => {
    expect(orderUpTo(4, 7, 30, 10)).toBe(4 * 37 + 10); // 158
  });

  it('daysOfCover is null when demand is zero', () => {
    expect(daysOfCover(20, 4)).toBe(5);
    expect(daysOfCover(20, 0)).toBeNull();
  });
});

describe('classifyUrgency', () => {
  const lead = 7;
  it('flags stockout / sub-lead-time cover as critical', () => {
    expect(classifyUrgency(0, 38, 158, 4, lead)).toBe('critical');
    expect(classifyUrgency(20, 38, 158, 4, lead)).toBe('critical'); // cover 5 < 7
  });
  it('flags at/below reorder point as high', () => {
    expect(classifyUrgency(30, 38, 158, 4, lead)).toBe('high'); // cover 7.5 ≥ 7, ≤ ROP
  });
  it('flags below order-up-to as medium and above as ok', () => {
    expect(classifyUrgency(40, 38, 158, 4, lead)).toBe('medium');
    expect(classifyUrgency(200, 38, 158, 4, lead)).toBe('ok');
  });
});

describe('recommendReorder — cold start (no forecast)', () => {
  it('falls back to the min-stock rule', () => {
    const product = makeProduct('p1', { minStockLevel: 20, stockMainBranch: 5 });
    const rec = recommendReorder(product, BRANCH_MAIN, makeForecast({ method: 'none', dailyRate: 0, dailyStdDev: 0 }), 0, {
      leadTimeDays: 7,
    });
    expect(rec.method).toBe('none');
    expect(rec.reorderPoint).toBe(20);
    expect(rec.orderUpToLevel).toBe(40);
    expect(rec.suggestedOrderQty).toBe(35); // ceil(40 + 0 − 5)
    expect(rec.reason).toMatch(/No sales history/i);
  });
});

describe('recommendReorder — normal (with forecast)', () => {
  it('sizes an order to the order-up-to level and folds in committed pre-orders', () => {
    const product = makeProduct('p1', { minStockLevel: 10, stockMainBranch: 12 });
    const rec = recommendReorder(product, BRANCH_MAIN, makeForecast({ dailyRate: 4, dailyStdDev: 2 }), 6, {
      leadTimeDays: 7,
      reviewPeriodDays: 30,
      serviceZ: 1.65,
    });
    expect(rec.reorderPoint).toBeCloseTo(4 * 7 + 1.65 * 2 * Math.sqrt(7), 1);
    expect(rec.urgency).toBe('critical'); // 12 on hand ÷ 4/day = 3 days < 7-day lead
    expect(rec.suggestedOrderQty).toBeGreaterThan(0);
    expect(rec.committedPreOrderQty).toBe(6);
    expect(rec.reason).toMatch(/Sells ~4/);
  });

  it('resolves on-hand via branchStockField, never the field name', () => {
    // stockUsaBranch MEANS D'Jabez. A D'Jabez recommendation must read that field.
    const product = makeProduct('p1', { stockMainBranch: 100, stockUsaBranch: 3 });
    const rec = recommendReorder(product, BRANCH_DJABEZ, makeForecast({ dailyRate: 4 }), 0, { leadTimeDays: 7 });
    expect(rec.onHand).toBe(3);
    expect(rec.branch).toBe(BRANCH_DJABEZ);
  });
});

describe('recommendReorder — expiry guard (short shelf life)', () => {
  const asOf = new Date(2026, 0, 1);

  it('caps the order at what can sell before expiry', () => {
    const product = makeProduct('p1', {
      shelfLifeType: 'short',
      expiryDate: '2026-01-11', // ~10 days out
      stockMainBranch: 12,
      minStockLevel: 10,
    });
    const rec = recommendReorder(product, BRANCH_MAIN, makeForecast({ dailyRate: 4, dailyStdDev: 2 }), 0, { leadTimeDays: 7 }, asOf);
    expect(rec.expiryRisk).toBe(true);
    expect(rec.suggestedOrderQty).toBeGreaterThan(0);
    expect(rec.suggestedOrderQty).toBeLessThan(140); // far below the uncapped order-up-to need
  });

  it('recommends not ordering a perishable that is already expiring', () => {
    const product = makeProduct('p1', {
      shelfLifeType: 'short',
      expiryDate: '2025-12-15', // already in the past relative to asOf
      stockMainBranch: 2,
    });
    const rec = recommendReorder(product, BRANCH_MAIN, makeForecast({ dailyRate: 4 }), 0, { leadTimeDays: 7 }, asOf);
    expect(rec.expiryRisk).toBe(true);
    expect(rec.suggestedOrderQty).toBe(0);
    expect(rec.reason).toMatch(/can't sell before/i);
  });

  it('does not flag a short-shelf-life item whose expiry is far away', () => {
    const product = makeProduct('p1', { shelfLifeType: 'short', expiryDate: '2030-01-01', stockMainBranch: 12 });
    const rec = recommendReorder(product, BRANCH_MAIN, makeForecast({ dailyRate: 4 }), 0, { leadTimeDays: 7 }, asOf);
    expect(rec.expiryRisk).toBe(false);
  });
});

describe('committedPreOrderQty — dedupe', () => {
  it('counts only unclaimed live orders at the branch, excluding Claimed and Cancelled', () => {
    const orders: CustomerPreOrder[] = [
      makePreOrder('Pending', 'p1', 3),
      makePreOrder('Preparing', 'p1', 4),
      makePreOrder('Ready for Pickup', 'p1', 2),
      makePreOrder('Claimed', 'p1', 100), // already rung up into transactions — must NOT count
      makePreOrder('Cancelled', 'p1', 50), // dead — must NOT count
      makePreOrder('Pending', 'p1', 9, BRANCH_DJABEZ), // other branch
      makePreOrder('Pending', 'other', 7), // other product
    ];
    expect(committedPreOrderQty(orders, 'p1', BRANCH_MAIN)).toBe(9); // 3 + 4 + 2
    expect(committedPreOrderQty(orders, 'p1', BRANCH_DJABEZ)).toBe(9);
  });
});
