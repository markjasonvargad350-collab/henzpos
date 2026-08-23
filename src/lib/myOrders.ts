import { CustomerPreOrder, PreOrderStatus } from '../types';

/**
 * The pre-order numbers placed from THIS device.
 *
 * The pre-order portal is deliberately zero-login, so there is no account to
 * hang a customer's order history on. The only thing that identifies "my
 * orders" is this localStorage list, written when an order is submitted.
 *
 * Consequence worth remembering: a customer who switches phones, clears their
 * browser data, or opens the portal in a private window has no orders here.
 * They can still find an order through the tracker's search box.
 */
const MY_ORDERS_KEY = 'henz_my_orders_v1';

export const readMyOrderNumbers = (): string[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(MY_ORDERS_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((n): n is string => typeof n === 'string') : [];
  } catch {
    // Corrupt or unavailable storage (private mode, quota) — behave like a new device.
    return [];
  }
};

/** Records a newly placed order as belonging to this device. Never throws. */
export const rememberMyOrderNumber = (orderNumber: string): void => {
  try {
    const existing = readMyOrderNumbers();
    if (!existing.includes(orderNumber)) {
      localStorage.setItem(MY_ORDERS_KEY, JSON.stringify([orderNumber, ...existing]));
    }
  } catch {
    // Storage unavailable — the order is already safely in Firestore, and the
    // customer still has their order number on the pickup slip.
  }
};

/** Only this device's own orders, newest first. */
export const filterMyOrders = (
  preOrders: CustomerPreOrder[],
  myOrderNumbers: string[] = readMyOrderNumbers()
): CustomerPreOrder[] => preOrders.filter((o) => myOrderNumbers.includes(o.orderNumber));

/**
 * Statuses that still need something to happen. Claimed and Cancelled orders are
 * finished business and are deliberately excluded, so a customer's badge returns
 * to zero once they have collected everything instead of climbing forever.
 */
const IN_PROGRESS: PreOrderStatus[] = ['Pending', 'Preparing', 'Ready for Pickup'];

export const isOrderInProgress = (order: CustomerPreOrder): boolean =>
  IN_PROGRESS.includes(order.orderStatus);

/**
 * The number shown on the portal's "Track Order Status" tab.
 *
 * This used to be `preOrders.length` — the raw document count of the WHOLE
 * store's order book, every customer and every status. On a fresh phone the tab
 * advertised a double-digit count and then showed an empty list, because the
 * panel behind it only ever renders this device's own orders. It also quietly
 * told every anonymous visitor how many orders the business had taken.
 */
export const countMyOrdersInProgress = (
  preOrders: CustomerPreOrder[],
  myOrderNumbers?: string[]
): number => filterMyOrders(preOrders, myOrderNumbers).filter(isOrderInProgress).length;
