/**
 * Barcode helpers — EAN-13 check-digit maths and a code generator.
 *
 * Why this exists: HENZ's catalogue is still being built with placeholder
 * products that do not carry a real manufacturer barcode. Rather than force
 * the operator to invent a number, the Add/Edit product form can auto-generate
 * a *valid* EAN-13 here, which the Smart Scanner then reads back verbatim
 * (scanMatch.ts matches a scanned code against `product.barcode` / `product.sku`
 * exactly — so whatever we print must equal what we store).
 *
 * `randomEan13` uses `Math.random`, matching the deliberately client-side,
 * non-sequential style of src/utils/ids.ts (offline-safe, collision-resistant
 * by randomness rather than by a shared counter). Everything else is pure and
 * unit-tested in barcode.test.ts.
 */

/** GS1 country prefix for the Philippines — makes a generated code look real. */
export const PH_GS1_PREFIX = '480';

/**
 * EAN-13 check digit for the first 12 digits (1-indexed: odd positions ×1,
 * even positions ×3, then the amount needed to reach the next multiple of 10).
 * Example: 590123412345 → 7  (full code 5901234123457).
 */
export function ean13CheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = first12.charCodeAt(i) - 48; // '0' === 48
    if (d < 0 || d > 9) return NaN;
    sum += i % 2 === 0 ? d : d * 3;
  }
  return (10 - (sum % 10)) % 10;
}

/** True only for a syntactically valid 13-digit EAN-13 with a correct check digit. */
export function isValidEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  return ean13CheckDigit(code.slice(0, 12)) === code.charCodeAt(12) - 48;
}

/** A fresh, valid EAN-13 (13 digits) under the given prefix. */
export function randomEan13(prefix: string = PH_GS1_PREFIX): string {
  let body = prefix.replace(/\D/g, '').slice(0, 12);
  while (body.length < 12) body += Math.floor(Math.random() * 10).toString();
  return body + ean13CheckDigit(body).toString();
}

/**
 * A valid EAN-13 not already present in `taken`. `taken` is best-effort (the
 * catalogue this device knows about); the randomness, not the check, is what
 * makes a clash vanishingly unlikely — same reasoning as uniqueSerial in ids.ts.
 */
export function uniqueEan13(taken: Set<string>, prefix: string = PH_GS1_PREFIX, attempts = 12): string {
  let code = randomEan13(prefix);
  for (let i = 0; i < attempts && taken.has(code); i++) {
    code = randomEan13(prefix);
  }
  return code;
}

export type BarcodeFormat = 'EAN13' | 'CODE128';

/**
 * Which 1D symbology JsBarcode should render `value` as. A valid EAN-13 prints
 * as the real striped retail barcode; anything else (a SKU string, a short or
 * non-standard number) falls back to CODE128, which encodes arbitrary ASCII —
 * so the printed label always scans back the exact stored string.
 */
export function pickBarcodeFormat(value: string): BarcodeFormat {
  return isValidEan13(value) ? 'EAN13' : 'CODE128';
}
