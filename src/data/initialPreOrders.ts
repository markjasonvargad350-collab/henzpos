import { CustomerPreOrder } from '../types';

// Production hygiene: this seed is intentionally EMPTY.
//
// On startup `seedIfEmpty` (POSContext) re-creates a collection's defaults
// whenever the server reports it empty. With demo pre-orders here, wiping the
// preOrders collection — or simply having zero live orders on a quiet day —
// would silently repopulate the store with fictional customers on the next
// load. Keeping this empty means an empty preOrders collection stays empty;
// real orders arrive only from the customer portal.
//
// (The three original demo orders — Del Rosario / Villanueva / Alcantara — were
// removed here for real-world deployment. See git history to restore them for a
// demo build.)
export const INITIAL_PREORDERS: CustomerPreOrder[] = [];
