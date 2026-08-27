/**
 * Unit tests for the admin access-code hashing/verification (the staff→admin
 * elevation gate). Validation evidence for the research paper's system-testing
 * chapter: the code is only ever compared as a SHA-256 hash, matching is exact,
 * surrounding whitespace is ignored, and a wrong or empty code never verifies.
 *
 * Only the pure functions are tested here (hashing + hash comparison); the
 * localStorage-backed helpers are exercised in the browser, not the unit runner.
 */
import { describe, it, expect } from 'vitest';
import { hashAdminCode, verifyAgainstHash } from './adminCode';

// Known SHA-256 test vector: sha256("abc").
const SHA256_ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

describe('hashAdminCode', () => {
  it('produces the standard SHA-256 hex digest', async () => {
    expect(await hashAdminCode('abc')).toBe(SHA256_ABC);
  });

  it('is deterministic', async () => {
    expect(await hashAdminCode('HENZ-2026')).toBe(await hashAdminCode('HENZ-2026'));
  });

  it('trims surrounding whitespace before hashing', async () => {
    expect(await hashAdminCode('  abc  ')).toBe(SHA256_ABC);
  });

  it('is case-sensitive on the code itself', async () => {
    expect(await hashAdminCode('Secret')).not.toBe(await hashAdminCode('secret'));
  });
});

describe('verifyAgainstHash', () => {
  it('accepts the matching code', async () => {
    const h = await hashAdminCode('open-sesame');
    expect(await verifyAgainstHash('open-sesame', h)).toBe(true);
  });

  it('accepts despite surrounding whitespace on input', async () => {
    const h = await hashAdminCode('open-sesame');
    expect(await verifyAgainstHash('  open-sesame  ', h)).toBe(true);
  });

  it('rejects a wrong code', async () => {
    const h = await hashAdminCode('open-sesame');
    expect(await verifyAgainstHash('nope', h)).toBe(false);
  });

  it('rejects any code against an empty/unset stored hash', async () => {
    expect(await verifyAgainstHash('anything', '')).toBe(false);
    expect(await verifyAgainstHash('', '')).toBe(false);
  });

  it('tolerates upper-case stored hashes (compared case-insensitively)', async () => {
    expect(await verifyAgainstHash('abc', SHA256_ABC.toUpperCase())).toBe(true);
  });
});
