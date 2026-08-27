import { CustomerPreOrder, Product } from '../types';

// One place that knows how a scanned/typed code maps to a pre-order or product.
// Both the camera scanner (UnifiedScannerModal) and the keyboard/USB-scanner path
// (POSTerminal) call these, so a pass that resolves in one always resolves in the
// other — no second copy of the rule to drift out of sync.

/**
 * Pull every identifier a scanned code might carry. A single QR/barcode can be
 * written in more than one shape across the app, so we normalise them all here:
 *
 *   - `HENZ-ORDER-HNZ-2026-0814`  → slip & prep-queue QR  (qrCodeValue verbatim)
 *   - `HENZ-ORD:HNZ-2026-0814|Juan Dela Cruz|450`
 *                                 → customer "Fast Counter QR Pass" (order tracker)
 *   - `HNZ-2026-0814`             → the bare order number (typed by hand)
 *   - `480651234001` / `SKU-123` → product barcode or SKU
 *
 * The raw value is always kept as a candidate, plus any order number we can
 * recover from the two prefixed pass formats.
 */
export const scanCandidates = (raw: string): string[] => {
  const code = (raw || '').trim();
  if (!code) return [];
  const out = new Set<string>([code]);

  // `HENZ-ORD:<orderNo>|<name>|<total>` — take the field before the first '|',
  // after the ':' — that first field is the order number.
  if (code.includes(':')) {
    const firstField = code.slice(code.indexOf(':') + 1).split('|')[0].trim();
    if (firstField) out.add(firstField);
  }

  // `HENZ-ORDER-<orderNo>` — strip the prefix to recover the order number.
  const prefixed = code.match(/^HENZ-ORDER-(.+)$/i);
  if (prefixed && prefixed[1].trim()) out.add(prefixed[1].trim());

  return [...out];
};

const eq = (a: string | undefined | null, b: string): boolean =>
  (a || '').toLowerCase() === b.toLowerCase();

/** Find the pre-order a scanned code refers to (by QR value, order number, or id). */
export const findPreOrderByCode = (
  preOrders: CustomerPreOrder[],
  raw: string
): CustomerPreOrder | undefined => {
  const candidates = scanCandidates(raw);
  if (candidates.length === 0) return undefined;
  return preOrders.find((po) =>
    candidates.some(
      (c) => eq(po.qrCodeValue, c) || eq(po.orderNumber, c) || eq(po.id, c)
    )
  );
};

/** Find the product a scanned code refers to (exact barcode or SKU match only). */
export const findProductByCode = (
  products: Product[],
  raw: string
): Product | undefined => {
  const candidates = scanCandidates(raw);
  if (candidates.length === 0) return undefined;
  return products.find((p) =>
    candidates.some((c) => eq(p.barcode, c) || eq(p.sku, c))
  );
};
