/**
 * Philippine phone-number validation & normalization.
 *
 * The customer pre-order form used to accept any non-empty string as a contact
 * number, so typos and junk ("12345", a stray name) sailed through and left
 * staff unable to reach the customer about a pickup. This validates that what
 * was typed is a *structurally real* PH number before the order is saved.
 *
 * It is format validation, not ownership proof — verifying the person actually
 * holds the SIM would need an SMS one-time-code (Firebase Phone Auth + billing),
 * which this offline-first static app deliberately does not carry.
 *
 * Accepted, in any spacing/dash/paren styling:
 *   • Mobile  — 09XXXXXXXXX, +639XXXXXXXXX, 639XXXXXXXXX, or a bare 9XXXXXXXXX.
 *   • Landline — trunk 0 + area code + subscriber, e.g. Iloilo 033 234 5678,
 *                Metro Manila 02 8XXX XXXX (also the +63 form).
 *
 * Everything is reduced to a canonical LOCAL form (digits only, leading 0):
 * "09171234567" / "0332345678". Storing that keeps the number callable and
 * makes the "search my order by phone" feature match regardless of styling.
 */

/** A PH mobile in local form: 09 + 9 digits (11 total). */
const MOBILE_RE = /^09\d{9}$/;

/**
 * A PH landline in local form: trunk 0 + area code (2–8, never 9 — that's
 * mobile) + a 6–8 digit subscriber number (8–10 digits total). Deliberately
 * loose on the subscriber length so provincial and the 8-digit Metro Manila
 * numbers both pass, while still rejecting obvious junk.
 */
const LANDLINE_RE = /^0[2-8]\d{6,8}$/;

export type PhPhoneKind = 'mobile' | 'landline';

export interface PhPhoneResult {
  /** True when the input is a well-formed PH mobile or landline number. */
  ok: boolean;
  /** Canonical local form (digits only), e.g. "09171234567". Empty when !ok. */
  normalized: string;
  /** Which kind it parsed as, or null when invalid. */
  kind: PhPhoneKind | null;
  /** Customer-facing reason, present only when !ok. */
  error: string;
}

/**
 * Reduce any styling / country-code form to the local digits form (leading 0).
 * Returns '' when it cannot be read as a PH number at all.
 */
function toLocal(raw: string): string {
  const trimmed = (raw || '').trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  // A leading "+" is E.164; the Philippines is +63.
  if (hasPlus) {
    return digits.startsWith('63') ? '0' + digits.slice(2) : '';
  }
  // Already local.
  if (digits.startsWith('0')) return digits;
  // 639XXXXXXXXX — country code + mobile, written without the plus.
  if (digits.startsWith('639') && digits.length === 12) return '0' + digits.slice(2);
  // Bare 10-digit mobile national number (user dropped the leading 0).
  if (digits.startsWith('9') && digits.length === 10) return '0' + digits;
  // Anything else: leave as-is and let validation reject it.
  return digits;
}

/**
 * Validate a Philippine contact number and return its canonical local form.
 * `validatePhPhone('+63 917 123 4567')` → { ok: true, normalized: '09171234567', kind: 'mobile' }.
 */
export function validatePhPhone(raw: string): PhPhoneResult {
  const local = toLocal(raw);
  if (!local) {
    return { ok: false, normalized: '', kind: null, error: 'Please enter your contact number.' };
  }
  if (MOBILE_RE.test(local)) {
    return { ok: true, normalized: local, kind: 'mobile', error: '' };
  }
  if (LANDLINE_RE.test(local)) {
    return { ok: true, normalized: local, kind: 'landline', error: '' };
  }
  return {
    ok: false,
    normalized: '',
    kind: null,
    error: 'Enter a valid PH number, e.g. 0917 123 4567 or +63 917 123 4567.',
  };
}

/** Convenience boolean check. */
export function isValidPhPhone(raw: string): boolean {
  return validatePhPhone(raw).ok;
}

/**
 * Pretty-print a number for display, echoing back how we read it so the
 * customer can eyeball it. Mobile groups as "0917 123 4567"; landlines are
 * returned as their canonical digits (area-code grouping varies too much to
 * guess). Invalid input is returned unchanged.
 */
export function formatPhPhone(raw: string): string {
  const r = validatePhPhone(raw);
  if (!r.ok) return raw;
  const n = r.normalized;
  if (r.kind === 'mobile') {
    return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
  }
  return n;
}
