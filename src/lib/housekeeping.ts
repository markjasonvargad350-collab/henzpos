import { CustomerPreOrder, PreOrderStatus, PurgeTarget, SaleTransaction } from '../types';

/**
 * Age filtering for the Clear Old Records tool.
 *
 * Lives here rather than inside POSContext so the confirm dialog's "this will
 * clear N records" preview and the delete itself run the exact same predicate.
 * When the count shown and the set deleted come from two copies of the rule, they
 * drift, and the number on the button stops being the number that disappears.
 */

/** `days === null` means every record. An unparseable date is KEPT, never deleted. */
export const olderThan = <T,>(items: T[], days: number | null, dateOf: (item: T) => string): T[] => {
  if (days === null) return items;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    const t = new Date(dateOf(item)).getTime();
    if (Number.isNaN(t)) return false;
    return t < cutoff;
  });
};

/** The pre-order status a purge target maps to. Sales have no status filter. */
export const purgeOrderStatus = (target: Exclude<PurgeTarget, 'sales'>): PreOrderStatus =>
  target === 'cancelledOrders' ? 'Cancelled' : 'Claimed';

/**
 * Exactly the records a purge would remove — used for both the preview count and
 * the deletion. Pending, Preparing and Ready-for-Pickup orders are unreachable by
 * design: an order a customer is still waiting on must never be one click from
 * deletion.
 */
export const recordsToPurge = (
  target: PurgeTarget,
  olderThanDays: number | null,
  transactions: SaleTransaction[],
  preOrders: CustomerPreOrder[]
): { ids: string[]; count: number } => {
  if (target === 'sales') {
    const doomed = olderThan(transactions, olderThanDays, (t) => t.timestamp);
    return { ids: doomed.map((t) => t.id), count: doomed.length };
  }
  const wanted = purgeOrderStatus(target);
  const doomed = olderThan(
    preOrders.filter((o) => o.orderStatus === wanted),
    olderThanDays,
    (o) => o.createdAt
  );
  return { ids: doomed.map((o) => o.id), count: doomed.length };
};
