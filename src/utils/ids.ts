/**
 * Identifier and human-facing serial-number generation.
 *
 * Everything here is deliberately CLIENT-SIDE and RANDOM, never server-assigned
 * and never derived from a running count. Two reasons:
 *
 *  1. Offline. A terminal with no internet must still be able to complete a sale
 *     and print a receipt. Anything that needs a round-trip to Firestore is out.
 *  2. Concurrency. `list.length + 1` looks like a counter but isn't one — two
 *     terminals (or two customers on their phones) holding the same cached list
 *     compute the SAME next number and collide. For a document ID that means the
 *     second write silently overwrites the first; for a receipt or order number
 *     it means two different records share an identifier customers read aloud.
 *
 * The alphabet omits characters that are easily confused when read off a printed
 * receipt or typed into the order tracker: 0/O, 1/I/L.
 */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** A short random code, e.g. `K7M2`. 31^length combinations. */
export function randomCode(length = 4): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/** `YYYYMMDD` in the terminal's local timezone (the store's own day, not UTC). */
export function dateStamp(date: Date = new Date()): string {
  return (
    `${date.getFullYear()}` +
    `${String(date.getMonth() + 1).padStart(2, '0')}` +
    `${String(date.getDate()).padStart(2, '0')}`
  );
}

/**
 * A Firestore document ID that is unique even across terminals writing in the
 * same millisecond. The timestamp keeps IDs roughly sortable; the random suffix
 * is what actually prevents collisions.
 *
 * Collisions matter more than they look: `transactions` and `stock_transfers`
 * are `allow update: if false` in firestore.rules, so a colliding `setDoc` is
 * not an overwrite — it is a permanent rejection of the entire batch, taking the
 * stock deduction down with it.
 */
export function newDocId(prefix: string, date: Date = new Date()): string {
  return `${prefix}-${date.getTime()}-${randomCode(4)}`;
}

/**
 * A human-facing serial (receipt number, order number, transfer number) built
 * from a random code, retried if it happens to match one this device already
 * knows about.
 *
 * `taken` is best-effort — offline, a terminal only knows the records in its own
 * cache — which is precisely why the code is random rather than sequential: the
 * randomness, not the check, is what makes collisions vanishingly unlikely.
 */
export function uniqueSerial(
  format: (code: string) => string,
  taken: Set<string>,
  codeLength = 4,
  attempts = 10,
): string {
  let value = format(randomCode(codeLength));
  for (let i = 0; i < attempts && taken.has(value); i++) {
    value = format(randomCode(codeLength));
  }
  return value;
}
