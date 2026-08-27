/**
 * Admin access-code check for the two-tier staff/admin split.
 *
 * The store shares ONE Firebase staff account (see `STAFF_EMAIL`), so every
 * signed-in cashier is, to Firebase and to the security rules, the same
 * non-anonymous user. That account grants the *limited* "staff" workspace
 * (register, pre-orders, prep desk, scanner, inventory). Reaching the *full*
 * "admin" workspace (sales & reports, demand forecast, store settings, the
 * database monitor) additionally requires an in-app **admin code**.
 *
 * This is deliberately a CLIENT-SIDE gate, not a server boundary: the Firestore
 * rules cannot tell one signed-in staffer from another (there is only the shared
 * account and no custom claims), so the staff-vs-admin line is a role separation
 * among trusted staff on the same account — not a defence against an attacker
 * with the staff password. The threat it addresses is a regular cashier casually
 * opening financials or destructive tools, which it does well.
 *
 * The code is never stored in plaintext. We keep only its SHA-256 hash:
 *   • a per-device hash in localStorage (set/changed in-app), which wins; else
 *   • an optional deployment-wide default baked into `firebase-applet-config.json`
 *     as `adminCodeHash` (leave empty to make every device set its own on first use).
 *
 * Hashing uses the Web Crypto API (`crypto.subtle`), available in every secure
 * context this app runs in (HTTPS on Vercel, and localhost in dev).
 */
import firebaseConfigJson from '../../firebase-applet-config.json';

/** localStorage key holding this device's SHA-256 admin-code hash (hex). */
const STORAGE_KEY = 'henz_admin_code_hash_v1';

/**
 * Optional store-wide default hash from config. Empty by default, in which case
 * the first admin on each device sets the code (bootstrapped via the unlock modal).
 * Cast keeps this resilient whether or not the JSON carries the key.
 */
const CONFIG_HASH: string = ((firebaseConfigJson as { adminCodeHash?: string }).adminCodeHash || '')
  .trim()
  .toLowerCase();

/** SHA-256 of the (trimmed) code, lower-case hex. Pure — no storage touched. */
export async function hashAdminCode(code: string): Promise<string> {
  const bytes = new TextEncoder().encode((code || '').trim());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Does the (trimmed) code hash to `storedHash`? Pure — safe to unit-test. */
export async function verifyAgainstHash(code: string, storedHash: string): Promise<boolean> {
  const stored = (storedHash || '').trim().toLowerCase();
  if (!stored) return false;
  const candidate = await hashAdminCode(code);
  // Length check first, then full compare. Timing is irrelevant client-side.
  return candidate.length === stored.length && candidate === stored;
}

/** The device-local override hash, or '' when none is set. */
function readLocalHash(): string {
  try {
    return (localStorage.getItem(STORAGE_KEY) || '').trim().toLowerCase();
  } catch {
    return '';
  }
}

/** Effective hash the app checks against: device override wins, else config default. */
export function getEffectiveAdminHash(): string {
  return readLocalHash() || CONFIG_HASH;
}

/** True once an admin code exists (either device-local or the config default). */
export function isAdminCodeConfigured(): boolean {
  return getEffectiveAdminHash().length > 0;
}

/** Verify a typed code against whatever hash is currently in effect. */
export async function verifyAdminCode(code: string): Promise<boolean> {
  return verifyAgainstHash(code, getEffectiveAdminHash());
}

/**
 * Store `code`'s hash as this device's admin code and return the hash, so the UI
 * can offer to paste it into `firebase-applet-config.json` as a store-wide default.
 */
export async function setLocalAdminCode(code: string): Promise<string> {
  const hash = await hashAdminCode(code);
  try {
    localStorage.setItem(STORAGE_KEY, hash);
  } catch {
    /* private mode / storage disabled — the code just won't persist past reload */
  }
  return hash;
}

/** Drop this device's override, falling back to the config default (if any). */
export function clearLocalAdminCode(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
