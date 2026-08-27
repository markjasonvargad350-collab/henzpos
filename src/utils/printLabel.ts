import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { Product } from '../types';
import { pickBarcodeFormat } from '../lib/barcode';

/**
 * Printable product barcode labels.
 *
 * The Smart Scanner (UnifiedScannerModal + scanMatch.ts) matches a scanned code
 * against a product's `barcode`/`sku` EXACTLY, so the label encodes the stored
 * `barcode` verbatim — scan it back and it resolves to this product.
 *
 *  - QR (uses the `qrcode` lib already in the app): scans on any device,
 *    including the iPhone-Safari camera fallback (which is QR-only).
 *  - 1D barcode (JsBarcode): the classic striped retail look; a valid EAN-13
 *    prints as EAN-13, anything else as CODE128. Read by Android/Chrome's
 *    native BarcodeDetector and USB scanners, but NOT the iPhone QR fallback.
 *
 * Printing reuses the receipt's isolated hidden-iframe approach so nothing in
 * the app's dark theme or modal layout bleeds into the printout.
 */
export type LabelSymbology = 'qr' | 'barcode';

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** The code payload a label carries: the barcode, or the SKU if none is set. */
const labelValue = (product: Product): string => (product.barcode || product.sku || '').trim();

/** Build the code as a self-contained PNG/SVG data URL for embedding in print HTML. */
async function buildCodeImage(value: string, symbology: LabelSymbology): Promise<string> {
  if (symbology === 'qr') {
    return QRCode.toDataURL(value, {
      width: 240,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, value, {
    format: pickBarcodeFormat(value),
    width: 2,
    height: 70,
    displayValue: true,
    margin: 6,
    background: '#ffffff',
    lineColor: '#000000',
    font: 'monospace',
    fontSize: 16,
    textMargin: 2,
  });
  return canvas.toDataURL('image/png');
}

export async function buildLabelSheetHTML(
  product: Product,
  symbology: LabelSymbology,
  copies: number
): Promise<string> {
  const value = labelValue(product);
  if (!value) throw new Error('This product has no barcode or SKU to print.');

  const img = await buildCodeImage(value, symbology);
  const count = Math.max(1, Math.min(120, Math.floor(copies) || 1));
  const name = escapeHtml(product.name);
  const sku = escapeHtml(product.sku || '');
  const price = `₱${(product.price || 0).toLocaleString()}`;
  const isQr = symbology === 'qr';

  const oneLabel = `
    <div class="label">
      <div class="name">${name}</div>
      <img class="code ${isQr ? 'qr' : 'bar'}" src="${img}" alt="${escapeHtml(value)}" />
      <div class="meta">
        <span class="price">${price}</span>
        ${sku ? `<span class="sku">${sku}</span>` : ''}
      </div>
    </div>`;

  const labels = Array.from({ length: count }, () => oneLabel).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Barcode Labels — ${name}</title>
  <style>
    *, *:before, *:after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      background: #fff;
      color: #0f172a;
      margin: 0;
      padding: 10mm;
    }
    .btn-bar {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin-bottom: 14px;
      padding: 10px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }
    .btn {
      background: #059669;
      color: #fff;
      border: none;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-secondary { background: #334155; }
    .sheet {
      display: flex;
      flex-wrap: wrap;
      gap: 4mm;
    }
    .label {
      width: 45mm;
      border: 1px dashed #94a3b8;
      border-radius: 4px;
      padding: 3mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
      page-break-inside: avoid;
    }
    .label .name {
      font-size: 9px;
      font-weight: 700;
      line-height: 1.15;
      margin-bottom: 2mm;
      max-height: 22px;
      overflow: hidden;
    }
    .label .code { display: block; }
    .label .code.qr { width: 26mm; height: 26mm; }
    .label .code.bar { width: 41mm; height: auto; }
    .label .meta {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      width: 100%;
      margin-top: 2mm;
      gap: 4px;
    }
    .label .price { font-size: 11px; font-weight: 800; }
    .label .sku { font-size: 8px; font-family: monospace; color: #475569; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 6mm; }
    }
  </style>
</head>
<body>
  <div class="no-print btn-bar">
    <button class="btn" onclick="window.print()">🖨️ Print Labels (Ctrl+P)</button>
    <button class="btn btn-secondary" onclick="window.close()">❌ Close</button>
  </div>
  <div class="sheet">${labels}</div>
</body>
</html>`;
}

/**
 * Print labels via an isolated hidden iframe (same technique as the receipt
 * printer). Falls back to a new tab if the iframe path is unavailable.
 * Returns false if it had to use the fallback (or on hard failure).
 */
export async function printProductLabels(
  product: Product,
  opts: { symbology: LabelSymbology; copies?: number }
): Promise<boolean> {
  const html = await buildLabelSheetHTML(product, opts.symbology, opts.copies ?? 1);

  try {
    const oldFrame = document.getElementById('henz-label-print-frame');
    if (oldFrame) oldFrame.remove();

    const printFrame = document.createElement('iframe');
    printFrame.id = 'henz-label-print-frame';
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
    frameDoc.write(html);
    frameDoc.close();

    // Give the browser time to decode the embedded code image before printing.
    await new Promise((resolve) => setTimeout(resolve, 250));

    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();

    setTimeout(() => printFrame.remove(), 4000);
    return true;
  } catch (err) {
    console.warn('Label iframe print failed, opening in a new tab instead', err);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const newWindow = window.open(blobUrl, '_blank');
    if (newWindow) {
      newWindow.focus();
    } else {
      window.print();
    }
    return false;
  }
}
