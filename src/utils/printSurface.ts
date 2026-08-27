/**
 * Print ONE on-screen surface (a customer pickup slip / QR stub) in isolation.
 *
 * The customer portal's slip and the tracker's QR pass both live inside a modal
 * that is layered ON TOP of the whole pre-order page — the page stays mounted
 * behind them. A bare `window.print()` therefore bleeds that entire page (form
 * fields, product grid, headings) onto the paper along with the slip.
 *
 * This flips a `printing-slip` class on <body> for the duration of the print.
 * The matching `@media print` rules in index.css then hide everything except the
 * element tagged `.print-slip-surface`, so only the slip reaches the printer.
 *
 * NOTE: the cashier receipt does NOT use this — it prints through a hidden
 * iframe (see printReceipt.ts), which is a separate document unaffected by these
 * main-page rules. This helper is only for the customer-facing slip/stub.
 */
export function printIsolatedSurface(): void {
  const body = document.body;
  body.classList.add('printing-slip');

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    body.classList.remove('printing-slip');
    window.removeEventListener('afterprint', cleanup);
  };

  // `afterprint` is the reliable "dialog closed" signal on desktop; the timeout
  // is a safety net for mobile browsers that never fire it, so the page can't get
  // stuck in the print-isolated state.
  window.addEventListener('afterprint', cleanup);
  try {
    window.print();
  } finally {
    setTimeout(cleanup, 1500);
  }
}
