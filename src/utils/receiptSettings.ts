/**
 * Receipt & Printing Format Customizer
 */

export interface ReceiptSettings {
  paperWidth: '58mm' | '80mm' | 'A4';
  storeHeaderTitle: string;
  storeSubheader: string;
  showTin: boolean;
  tinNumber: string;
  showFdaLto: boolean;
  fdaLtoNumber: string;
  showCashierName: boolean;
  showBarcode: boolean;
  showQrCode: boolean;
  customFooterNote: string;
  returnPolicyNote: string;
  enableSoundOnPrint: boolean;
}

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  paperWidth: '80mm',
  storeHeaderTitle: 'HENZ HEALTH CARE PRODUCTS TRADING',
  storeSubheader: 'Medical Supplies • Chemical & Reagents • Consumables • Lab Equipment & Glassware',
  showTin: true,
  tinNumber: '298-410-912-000 Non-VAT Reg.',
  showFdaLto: true,
  fdaLtoNumber: 'FDA LTO-2023-01984 / CDRRHR Compliant',
  showCashierName: true,
  showBarcode: true,
  showQrCode: true,
  customFooterNote: 'Thank you for choosing HENZ Healthcare Products Trading! | Hotline: +63 917 302 1995',
  returnPolicyNote: 'RETURN POLICY: Sterile goods & surgical blades non-refundable once seal is broken. Replacement within 7 days with this slip.',
  enableSoundOnPrint: true,
};

const RECEIPT_SETTINGS_KEY = 'henz_receipt_settings_v1';

export function getReceiptSettings(): ReceiptSettings {
  try {
    const saved = localStorage.getItem(RECEIPT_SETTINGS_KEY);
    return saved ? { ...DEFAULT_RECEIPT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_RECEIPT_SETTINGS;
  } catch {
    return DEFAULT_RECEIPT_SETTINGS;
  }
}

export function saveReceiptSettings(settings: ReceiptSettings): void {
  try {
    localStorage.setItem(RECEIPT_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}
