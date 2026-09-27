import { StockTransferRecord } from '../types';

// Production hygiene: this seed is intentionally EMPTY.
//
// Stock transfers are an immutable audit ledger (firestore.rules locks
// stock_transfers to `update, delete: if false`), so demo transfers cannot be
// removed from inside the app once seeded. On top of that, `seedIfEmpty`
// (POSContext) re-creates defaults whenever the collection reports empty — so
// demo transfers would reappear after any manual console cleanup. Keeping this
// empty means the ledger only ever contains real inter-branch movements logged
// from the Inventory screen.
//
// (The three original demo transfers — HENZ-TR-20260814/15/16 — were removed
// here for real-world deployment. See git history to restore them for a demo
// build.)
export const INITIAL_TRANSFERS: StockTransferRecord[] = [];
