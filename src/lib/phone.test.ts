/**
 * Unit tests for the Philippine phone-number validator.
 *
 * Validation evidence for the research paper's system-testing chapter: valid
 * mobile/landline forms (in every common styling and country-code variant)
 * normalize to one canonical local number, and structurally impossible inputs
 * are rejected.
 */
import { describe, it, expect } from 'vitest';
import { validatePhPhone, isValidPhPhone, formatPhPhone } from './phone';

describe('validatePhPhone — mobile', () => {
  it('accepts local 09XXXXXXXXX', () => {
    const r = validatePhPhone('09171234567');
    expect(r.ok).toBe(true);
    expect(r.normalized).toBe('09171234567');
    expect(r.kind).toBe('mobile');
  });

  it('normalizes spaced and dashed styling to the same number', () => {
    expect(validatePhPhone('0917 123 4567').normalized).toBe('09171234567');
    expect(validatePhPhone('0917-123-4567').normalized).toBe('09171234567');
  });

  it('accepts the +63 / 63 international forms', () => {
    expect(validatePhPhone('+639171234567').normalized).toBe('09171234567');
    expect(validatePhPhone('+63 917 123 4567').normalized).toBe('09171234567');
    expect(validatePhPhone('639171234567').normalized).toBe('09171234567');
  });

  it('accepts a bare 10-digit national number (missing leading 0)', () => {
    expect(validatePhPhone('9171234567').normalized).toBe('09171234567');
  });
});

describe('validatePhPhone — landline', () => {
  it('accepts an Iloilo landline (033) 234 5678', () => {
    const r = validatePhPhone('033 234 5678');
    expect(r.ok).toBe(true);
    expect(r.normalized).toBe('0332345678');
    expect(r.kind).toBe('landline');
  });

  it('accepts a Metro Manila 8-digit landline', () => {
    expect(validatePhPhone('02 8123 4567').normalized).toBe('0281234567');
  });

  it('accepts the +63 landline form', () => {
    expect(validatePhPhone('+63 33 234 5678').normalized).toBe('0332345678');
  });
});

describe('validatePhPhone — rejects junk', () => {
  it('rejects too-short, too-long, empty, and non-PH numbers', () => {
    expect(isValidPhPhone('12345')).toBe(false); // too short
    expect(isValidPhPhone('091712345')).toBe(false); // 9 digits, not 11
    expect(isValidPhPhone('091712345678')).toBe(false); // 12 digits, too long
    expect(isValidPhPhone('08171234567')).toBe(false); // mobile must be 09
    expect(isValidPhPhone('')).toBe(false);
    expect(isValidPhPhone('   ')).toBe(false);
    expect(isValidPhPhone('not a phone')).toBe(false);
    expect(isValidPhPhone('+15551234567')).toBe(false); // US, not +63
  });

  it('carries a helpful, non-empty error message', () => {
    expect(validatePhPhone('12345').error.length).toBeGreaterThan(0);
    expect(validatePhPhone('').error.length).toBeGreaterThan(0);
  });
});

describe('formatPhPhone', () => {
  it('groups a mobile number as 0917 123 4567', () => {
    expect(formatPhPhone('+639171234567')).toBe('0917 123 4567');
  });

  it('returns invalid input unchanged', () => {
    expect(formatPhPhone('nope')).toBe('nope');
  });
});
