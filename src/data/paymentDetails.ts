import { PaymentDetails } from '../types';

/**
 * Neutral starting point for the payment counter details, used until the store
 * owner sets their own in Settings → Payment Counter (which writes the shared
 * `system` document in Firestore).
 *
 * Every field is intentionally BLANK. This is a real-world deployment default:
 * the checkout must never present a fabricated GCash number or bank account that
 * a customer might actually pay into. With these empty, the checkout shows a
 * clear "not yet configured — set in Settings" prompt instead of a fake number.
 *
 * This is a fallback only; it is NEVER written to Firestore automatically. The
 * `system/paymentDetails` document is created the first time the owner saves
 * real details from the editor.
 */
export const DEFAULT_PAYMENT_DETAILS: PaymentDetails = {
  gcashName: '',
  gcashNumber: '',
  gcashQrImage: '',
  bankAccounts: [],
};
