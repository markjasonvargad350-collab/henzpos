import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { Product } from '../types';
import { pickBarcodeFormat } from '../lib/barcode';

/**
 * Printable product barcode labels — single product or the whole catalogue.
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
 * the app's dark theme or modal layout bleeds into the printout. The batch
 * sheet lays every product's label out in a flowing grid that paginates
 * cleanly (each label is kept whole across page breaks).
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

/** One label card: product name, the code image, then price + SKU. */
function renderLabelCard(product: Product, img: string, value: string, isQr: boolean): string {
  const name = escapeHtml(product.name);
  const sku = escapeHtml(product.sku || '');
  const price = `₱${(product.price || 0).toLocaleString()}`;
  return `
    <div class="label">
      <div class="name">${name}</div>
      <img class="code ${isQr ? 'qr' : 'bar'}" src="${img}" alt="${escapeHtml(value)}" />
      <div class="meta">
        <span class="price">${price}</span>
        ${sku ? `<span class="sku">${sku}</span>` : ''}
      </div>
    </div>`;
}

const SHEET_STYLES = `
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
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
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
    .count-note { font-size: 12px; color: #475569; font-weight: 600; }
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
    }`;

/** Wrap a run of label cards in a self-contained, printable HTML document. */
function wrapSheetDocument(title: string, labelsHtml: string, countNote: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>${SHEET_STYLES}</style>
</head>
<body>
  <div class="no-print btn-bar">
    <button class="btn" onclick="window.print()">🖨️ Print Labels (Ctrl+P)</button>
    <button class="btn btn-secondary" onclick="window.close()">❌ Close</button>
    ${countNote ? `<span class="count-note">${escapeHtml(countNote)}</span>` : ''}
  </div>
  <div class="sheet">${labelsHtml}</div>
</body>
</html>`;
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
  const oneLabel = renderLabelCard(product, img, value, symbology === 'qr');
  const labels = Array.from({ length: count }, () => oneLabel).join('');

  return wrapSheetDocument(`Barcode Labels — ${escapeHtml(product.name)}`, labels, '');
}

export interface BatchLabelSheet {
  html: string;
  /** Products that had a code and were laid out. */
  printable: number;
  /** Products skipped because they had no barcode or SKU. */
  skipped: number;
  /** Total label cards on the sheet (printable × copies-per-product). */
  totalLabels: number;
}

/**
 * Build one sheet holding a label for every product in `products` (each
 * repeated `copiesPerProduct` times, kept together). Products without any
 * barcode/SKU are skipped and counted. Code images are generated in parallel.
 */
export async function buildBatchLabelSheetHTML(
  products: Product[],
  symbology: LabelSymbology,
  copiesPerProduct: number
): Promise<BatchLabelSheet> {
  const per = Math.max(1, Math.min(10, Math.floor(copiesPerProduct) || 1));
  const withValues = products
    .map((p) => ({ product: p, value: labelValue(p) }))
    .filter((x) => x.value);
  const skipped = products.length - withValues.length;

  if (withValues.length === 0) {
    throw new Error('None of these products have a barcode or SKU to print.');
  }

  const isQr = symbology === 'qr';
  const cards = await Promise.all(
    withValues.map(async ({ product, value }) => {
      const img = await buildCodeImage(value, symbology);
      return renderLabelCard(product, img, value, isQr);
    })
  );

  // Keep a product's copies adjacent, then flow all products together.
  const labels = cards.map((card) => Array.from({ length: per }, () => card).join('')).join('');
  const totalLabels = withValues.length * per;

  const note =
    `${withValues.length} product${withValues.length === 1 ? '' : 's'}` +
    (per > 1 ? ` × ${per} = ${totalLabels} labels` : ` = ${totalLabels} labels`) +
    (skipped > 0 ? ` · ${skipped} skipped (no code)` : '');

  return {
    html: wrapSheetDocument(`Barcode Labels — ${withValues.length} products`, labels, note),
    printable: withValues.length,
    skipped,
    totalLabels,
  };
}

/**
 * Wait until every <img> in the document has finished decoding (data URLs load
 * near-instantly, but a full-catalogue sheet has many), capped by a timeout so
 * printing never hangs.
 */
function waitForImages(doc: Document, timeoutMs: number): Promise<void> {
  const imgs = Array.from(doc.images);
  if (imgs.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    let remaining = imgs.length;
    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const tick = (): void => {
      if (--remaining <= 0) finish();
    };
    imgs.forEach((img) => {
      if (img.complete) {
        tick();
      } else {
        img.addEventListener('load', tick, { once: true });
        img.addEventListener('error', tick, { once: true });
      }
    });
    setTimeout(finish, timeoutMs);
  });
}

/**
 * Print a self-contained HTML sheet via an isolated hidden iframe (same
 * technique as the receipt printer). Falls back to a new tab if the iframe path
 * is unavailable. Returns false if it had to use the fallback (or on failure).
 */
async function printSheetHtml(html: string): Promise<boolean> {
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

    // Let every embedded code image decode before printing (many, for a batch).
    await waitForImages(frameDoc, 8000);
    await new Promise((resolve) => setTimeout(resolve, 200));

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

/** Print labels for a single product. */
export async function printProductLabels(
  product: Product,
  opts: { symbology: LabelSymbology; copies?: number }
): Promise<boolean> {
  const html = await buildLabelSheetHTML(product, opts.symbology, opts.copies ?? 1);
  return printSheetHtml(html);
}

/** Print one sheet of labels for many products at once. */
export async function printProductLabelsBatch(
  products: Product[],
  opts: { symbology: LabelSymbology; copiesPerProduct?: number }
): Promise<boolean> {
  const { html } = await buildBatchLabelSheetHTML(products, opts.symbology, opts.copiesPerProduct ?? 1);
  return printSheetHtml(html);
}
