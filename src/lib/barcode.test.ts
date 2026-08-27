/**
 * Unit tests for the barcode helpers.
 *
 * Validation evidence: the EAN-13 check-digit is checked against a known
 * textbook vector, the generator is proven to always emit a valid, correctly
 * prefixed code, and the format picker's EAN-13-vs-CODE128 decision is pinned.
 */
import { describe, it, expect } from 'vitest';
import {
  PH_GS1_PREFIX,
  ean13CheckDigit,
  isValidEan13,
  pickBarcodeFormat,
  randomEan13,
  uniqueEan13,
} from './barcode';

describe('ean13CheckDigit', () => {
  it('matches the known vector 590123412345 → 7', () => {
    expect(ean13CheckDigit('590123412345')).toBe(7);
  });

  it('returns 0 when the running sum is already a multiple of 10', () => {
    // 000000000000 → sum 0 → check 0
    expect(ean13CheckDigit('000000000000')).toBe(0);
  });
});

describe('isValidEan13', () => {
  it('accepts a correct 13-digit code', () => {
    expect(isValidEan13('5901234123457')).toBe(true);
  });

  it('rejects a wrong check digit, wrong length, or non-digits', () => {
    expect(isValidEan13('5901234123450')).toBe(false); // bad check digit
    expect(isValidEan13('590123412345')).toBe(false); // 12 digits
    expect(isValidEan13('SKU-12345')).toBe(false); // not numeric
  });
});

describe('randomEan13', () => {
  it('always produces a valid 13-digit code under the PH prefix', () => {
    for (let i = 0; i < 200; i++) {
      const code = randomEan13();
      expect(code).toHaveLength(13);
      expect(code.startsWith(PH_GS1_PREFIX)).toBe(true);
      expect(isValidEan13(code)).toBe(true);
    }
  });
});

describe('uniqueEan13', () => {
  it('avoids codes already taken', () => {
    const first = randomEan13();
    const taken = new Set([first]);
    const next = uniqueEan13(taken);
    expect(next).not.toBe(first);
    expect(isValidEan13(next)).toBe(true);
  });
});

describe('pickBarcodeFormat', () => {
  it('uses EAN13 for a valid EAN-13 and CODE128 for anything else', () => {
    expect(pickBarcodeFormat('5901234123457')).toBe('EAN13');
    expect(pickBarcodeFormat('GLV-SURG-75')).toBe('CODE128');
    expect(pickBarcodeFormat('12345')).toBe('CODE128');
  });
});
