import QRCode from 'qrcode';
import { SaleTransaction } from '../types';
import { getReceiptSettings, ReceiptSettings } from './receiptSettings';
import {
  BRANCH_ADDRESS,
  BRANCH_LANDMARK,
  branchKeyFor,
  branchShortLabel,
  normalizeBranch,
} from '../lib/branches';

/**
 * Address block for the branch that rang up the sale.
 *
 * The receipt used to hard-code Casa Conching's address on every copy, so a
 * sale rung up at the second branch printed the wrong location — directly under
 * a Branch line that said otherwise. BIR-facing paperwork has to name the store
 * that actually made the sale.
 */
const branchLines = (transaction: SaleTransaction) => {
  const key = branchKeyFor(normalizeBranch(transaction.branch));
  return {
    label: branchShortLabel[key],
    address: BRANCH_ADDRESS[key],
    landmark: BRANCH_LANDMARK[key],
  };
};

/**
 * Generates clean, standalone thermal/invoice HTML with self-contained styles.
 */
export async function generateReceiptHTML(
  transaction: SaleTransaction,
  settings: ReceiptSettings = getReceiptSettings(),
  qrDataUrl?: string
): Promise<string> {
  let finalQr = qrDataUrl;
  if (!finalQr && settings.showQrCode) {
    try {
      finalQr = await QRCode.toDataURL(transaction.receiptNumber, {
        width: settings.paperWidth === '58mm' ? 100 : 130,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });
    } catch (e) {
      console.warn('QR Code generation fallback', e);
    }
  }

  const branch = branchLines(transaction);
  const is58mm = settings.paperWidth === '58mm';
  const isA4 = settings.paperWidth === 'A4';
  const paperMaxWidth = is58mm ? '48mm' : isA4 ? '190mm' : '72mm';
  const baseFontSize = is58mm ? '9px' : isA4 ? '12px' : '11px';
  const smallFontSize = is58mm ? '8px' : isA4 ? '10px' : '9px';

  const itemsHtml = transaction.items
    .map(
      (item) => `
      <div style="margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px dotted #ccc;">
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
          <span style="flex: 1; margin-right: 8px; word-break: break-word;">${item.product.name}</span>
          <span style="white-space: nowrap;">₱${item.subtotal.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: ${smallFontSize}; color: #444; margin-top: 2px;">
          <span>${item.quantity} x ₱${item.unitPrice.toLocaleString()} / ${item.product.unit}</span>
          <span style="color: #666;">Lot:${item.product.batchNumber || 'N/A'} Exp:${item.product.expiryDate || 'N/A'}</span>
        </div>
      </div>
    `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt #${transaction.receiptNumber} - ${settings.storeHeaderTitle}</title>
  <style>
    @page {
      size: ${isA4 ? 'A4 portrait' : 'auto'};
      margin: ${is58mm ? '2mm' : isA4 ? '10mm' : '4mm'};
    }
    *, *:before, *:after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Courier New', Courier, monospace, ui-monospace, sans-serif;
      font-size: ${baseFontSize};
      line-height: 1.35;
      color: #000;
      background: #fff;
      margin: 0 auto;
      padding: ${is58mm ? '4px' : '12px'};
      max-width: ${paperMaxWidth};
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .border-top { border-top: 1px dashed #000; margin-top: 6px; padding-top: 6px; }
    .border-bottom { border-bottom: 1px dashed #000; margin-bottom: 6px; padding-bottom: 6px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
    .header-title { font-size: ${is58mm ? '11px' : isA4 ? '16px' : '13px'}; font-weight: 900; margin: 0 0 2px 0; font-family: system-ui, -apple-system, sans-serif; text-transform: uppercase; }
    .sub-info { font-size: ${smallFontSize}; color: #333; margin-bottom: 2px; }
    .badge { font-size: ${smallFontSize}; background: #eee; padding: 1px 4px; border-radius: 3px; }
    .btn-bar {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin-bottom: 16px;
      padding: 10px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
    }
    .btn {
      background: #059669;
      color: white;
      border: none;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-secondary {
      background: #334155;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0 !important; max-width: 100% !important; }
    }
  </style>
</head>
<body>
  <div class="no-print btn-bar">
    <button class="btn" onclick="window.print()">🖨️ Print Receipt (Ctrl+P)</button>
    <button class="btn btn-secondary" onclick="window.close()">❌ Close Window</button>
  </div>

  <div class="text-center border-bottom">
    <div class="header-title">🩺 ${settings.storeHeaderTitle}</div>
    <div class="sub-info">${settings.storeSubheader}</div>
    <div class="sub-info">Branch: <strong>${branch.label}</strong></div>
    <div class="sub-info">📍 ${branch.address}</div>
    <div class="sub-info">(${branch.landmark})</div>
    <div class="sub-info">📞 +63 917 302 1995 / 0917-302-1995</div>
    ${settings.showTin ? `<div class="sub-info">TIN: <strong>${settings.tinNumber}</strong></div>` : ''}
    ${settings.showFdaLto ? `<div class="sub-info">FDA LTO: <strong>${settings.fdaLtoNumber}</strong></div>` : ''}
  </div>

  <div class="border-bottom">
    <div class="row">
      <span>Official Receipt No:</span>
      <span class="bold">#${transaction.receiptNumber}</span>
    </div>
    <div class="row">
      <span>Date / Time:</span>
      <span>${transaction.timestamp}</span>
    </div>
    ${settings.showCashierName ? `
    <div class="row">
      <span>Cashier on Duty:</span>
      <span>${transaction.cashierName}</span>
    </div>` : ''}
    <div class="row">
      <span>Customer:</span>
      <span class="bold">${transaction.customerName} (${transaction.customerType})</span>
    </div>
    ${transaction.preOrderRefCode ? `
    <div class="row" style="color: #047857;">
      <span>Pre-Order Reference:</span>
      <span class="bold">${transaction.preOrderRefCode}</span>
    </div>` : ''}
  </div>

  <div>
    <div class="row bold" style="border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 6px;">
      <span>ITEM DESCRIPTION</span>
      <span>TOTAL</span>
    </div>
    ${itemsHtml}
  </div>

  <div class="border-top border-bottom">
    <div class="row">
      <span>Total Items Sold:</span>
      <span class="bold">${transaction.totalItemCount} unit(s)</span>
    </div>
    <div class="row">
      <span>Subtotal (VAT incl):</span>
      <span>₱${transaction.subtotal.toLocaleString()}</span>
    </div>
    ${transaction.discountAmount > 0 ? `
    <div class="row" style="color: #047857; font-weight: bold;">
      <span>Discount Privilege:</span>
      <span>-₱${transaction.discountAmount.toLocaleString()}</span>
    </div>` : ''}
    <div class="row" style="font-size: ${smallFontSize}; color: #555;">
      <span>VATable Sales (12% incl):</span>
      <span>₱${Math.round(transaction.grandTotal / 1.12).toLocaleString()}</span>
    </div>
    <div class="row" style="font-size: ${smallFontSize}; color: #555;">
      <span>VAT Amount (12%):</span>
      <span>₱${transaction.taxAmount.toLocaleString()}</span>
    </div>
    <div class="row bold" style="font-size: ${is58mm ? '11px' : isA4 ? '15px' : '13px'}; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px;">
      <span>GRAND TOTAL DUE:</span>
      <span>₱${transaction.grandTotal.toLocaleString()}</span>
    </div>
  </div>

  <div class="border-bottom">
    <div class="row">
      <span>Payment Mode:</span>
      <span class="bold">${transaction.paymentMethod}</span>
    </div>
    ${transaction.paymentMethod === 'Cash' ? `
    <div class="row">
      <span>Amount Tendered:</span>
      <span>₱${(transaction.amountTendered || 0).toLocaleString()}</span>
    </div>
    <div class="row bold">
      <span>Change Given:</span>
      <span>₱${(transaction.changeDue || 0).toLocaleString()}</span>
    </div>` : ''}
    ${transaction.referenceNumber ? `
    <div class="row">
      <span>Payment Ref No:</span>
      <span class="bold">${transaction.referenceNumber}</span>
    </div>` : ''}
    ${transaction.bankName ? `
    <div class="row">
      <span>Bank:</span>
      <span>${transaction.bankName}</span>
    </div>` : ''}
  </div>

  <div class="text-center" style="margin-top: 8px;">
    ${finalQr ? `
    <div style="margin: 6px auto;">
      <img src="${finalQr}" alt="Receipt QR" style="width: ${is58mm ? '80px' : '100px'}; height: ${is58mm ? '80px' : '100px'}; display: inline-block;" />
    </div>` : ''}
    <div style="font-size: ${smallFontSize}; font-weight: bold; text-transform: uppercase; margin-bottom: 3px;">
      ${settings.customFooterNote}
    </div>
    <div style="font-size: ${smallFontSize}; color: #666;">
      ${settings.returnPolicyNote}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Direct thermal printer method using an isolated hidden iframe.
 * Avoids any parent iframe CSS interference, dark theme bleeding, or modal clipping.
 */
export async function printReceiptDirectly(
  transaction: SaleTransaction,
  settings: ReceiptSettings = getReceiptSettings()
): Promise<boolean> {
  try {
    const htmlContent = await generateReceiptHTML(transaction, settings);

    // Remove any existing print iframe
    const oldFrame = document.getElementById('henz-receipt-print-frame');
    if (oldFrame) {
      oldFrame.remove();
    }

    const printFrame = document.createElement('iframe');
    printFrame.id = 'henz-receipt-print-frame';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.opacity = '0';
    printFrame.style.pointerEvents = 'none';

    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (!frameDoc || !printFrame.contentWindow) {
      throw new Error('Unable to access print frame window');
    }

    frameDoc.open();
    frameDoc.write(htmlContent);
    frameDoc.close();

    // Give browser time to parse DOM and render QR image
    await new Promise((resolve) => setTimeout(resolve, 250));

    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();

    // Cleanup after user closes print dialog
    setTimeout(() => {
      printFrame.remove();
    }, 4000);

    return true;
  } catch (err) {
    console.warn('Iframe print failed, falling back to window.open or window.print', err);
    // Fallback: open in new tab
    await openReceiptInNewTab(transaction, settings);
    return false;
  }
}

/**
 * Opens receipt in a pristine separate browser tab with print trigger.
 * 100% reliable in iframes, mobile devices, and restricted preview containers.
 */
export async function openReceiptInNewTab(
  transaction: SaleTransaction,
  settings: ReceiptSettings = getReceiptSettings()
): Promise<void> {
  const htmlContent = await generateReceiptHTML(transaction, settings);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  const newWindow = window.open(blobUrl, '_blank');
  if (newWindow) {
    newWindow.focus();
  } else {
    // If popup was blocked, fallback to standard window.print()
    window.print();
  }
}

/**
 * Downloads receipt as an offline .html or .txt file.
 */
export async function downloadReceiptFile(
  transaction: SaleTransaction,
  settings: ReceiptSettings = getReceiptSettings(),
  format: 'html' | 'txt' = 'html'
): Promise<void> {
  if (format === 'html') {
    const htmlContent = await generateReceiptHTML(transaction, settings);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${transaction.receiptNumber}_${transaction.customerName.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    const branch = branchLines(transaction);
    const textLines = [
      `================================================`,
      `  ${settings.storeHeaderTitle}`,
      `  ${settings.storeSubheader}`,
      `  Branch: ${branch.label}`,
      `  📍 ${branch.address}`,
      `  (${branch.landmark})`,
      `  📞 +63 917 302 1995`,
      settings.showTin ? `  TIN: ${settings.tinNumber}` : '',
      settings.showFdaLto ? `  FDA LTO: ${settings.fdaLtoNumber}` : '',
      `================================================`,
      `Receipt No: #${transaction.receiptNumber}`,
      `Date/Time:  ${transaction.timestamp}`,
      settings.showCashierName ? `Cashier:    ${transaction.cashierName}` : '',
      `Customer:   ${transaction.customerName} (${transaction.customerType})`,
      transaction.preOrderRefCode ? `Pre-Order:  ${transaction.preOrderRefCode}` : '',
      `------------------------------------------------`,
      `ITEMS PURCHASED:`,
      ...transaction.items.map(
        (i) =>
          ` • ${i.quantity}x ${i.product.name}\n   @ ₱${i.unitPrice} / ${i.product.unit} (Lot:${i.product.batchNumber || 'N/A'}) = ₱${i.subtotal.toLocaleString()}`
      ),
      `------------------------------------------------`,
      `Items Count:       ${transaction.totalItemCount} pcs`,
      `Subtotal:          PHP ${transaction.subtotal.toLocaleString()}`,
      transaction.discountAmount > 0 ? `Discount:         -PHP ${transaction.discountAmount.toLocaleString()}` : '',
      `VATable Sales:     PHP ${Math.round(transaction.grandTotal / 1.12).toLocaleString()}`,
      `VAT Amount (12%):  PHP ${transaction.taxAmount.toLocaleString()}`,
      `GRAND TOTAL:       PHP ${transaction.grandTotal.toLocaleString()}`,
      `------------------------------------------------`,
      `Payment Mode:      ${transaction.paymentMethod}`,
      transaction.paymentMethod === 'Cash'
        ? `Tendered:          PHP ${(transaction.amountTendered || 0).toLocaleString()}\nChange:            PHP ${(transaction.changeDue || 0).toLocaleString()}`
        : '',
      transaction.referenceNumber ? `Reference No:      ${transaction.referenceNumber}` : '',
      `================================================`,
      `${settings.customFooterNote}`,
      `${settings.returnPolicyNote}`,
      `================================================`,
    ]
      .filter(Boolean)
      .join('\n');

    const blob = new Blob([textLines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${transaction.receiptNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
