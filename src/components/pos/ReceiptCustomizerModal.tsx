import React, { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  Printer,
  Sliders,
  CheckCircle2,
  FileText,
  QrCode,
  Barcode,
  Eye,
  RotateCcw,
} from 'lucide-react';
import {
  ReceiptSettings,
  DEFAULT_RECEIPT_SETTINGS,
  getReceiptSettings,
  saveReceiptSettings,
} from '../../utils/receiptSettings';
import { soundEffects } from '../../utils/audio';

interface ReceiptCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptCustomizerModal: React.FC<ReceiptCustomizerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] = useState<ReceiptSettings>(getReceiptSettings);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getReceiptSettings());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveReceiptSettings(settings);
    soundEffects.playBeepSuccess();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleReset = () => {
    setSettings(DEFAULT_RECEIPT_SETTINGS);
    saveReceiptSettings(DEFAULT_RECEIPT_SETTINGS);
    soundEffects.playClick();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl text-teal-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Thermal Receipt & Invoice Designer
                <span className="text-[10px] bg-teal-100 text-teal-700 font-mono px-2 py-0.5 rounded-full">
                  58mm / 80mm / A4
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Customize thermal layout, BIR TIN lines, FDA compliance text, and customer return policies
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Split: Controls on Left, Live Preview on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[75vh] overflow-y-auto">
          {/* Controls Form */}
          <form onSubmit={handleSave} className="lg:col-span-7 p-6 space-y-4 border-r border-slate-200">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Paper Format / Printer Width</label>
              <div className="grid grid-cols-3 gap-2">
                {(['58mm', '80mm', 'A4'] as const).map((width) => (
                  <button
                    key={width}
                    type="button"
                    onClick={() => setSettings({ ...settings, paperWidth: width })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      settings.paperWidth === width
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    {width} {width === '80mm' ? '(Standard)' : width === '58mm' ? '(Compact)' : '(Full Slip)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h4 className="text-xs font-bold text-teal-600 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Header Branding
              </h4>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Company Trading Name</label>
                <input
                  type="text"
                  value={settings.storeHeaderTitle}
                  onChange={(e) => setSettings({ ...settings, storeHeaderTitle: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-500 font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Subheader Tagline</label>
                <input
                  type="text"
                  value={settings.storeSubheader}
                  onChange={(e) => setSettings({ ...settings, storeSubheader: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h4 className="text-xs font-bold text-teal-600 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" /> Legal, Barcode & QR Toggles
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showTin}
                    onChange={(e) => setSettings({ ...settings, showTin: e.target.checked })}
                    className="accent-teal-500 rounded"
                  />
                  <span>Show BIR TIN Line</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showFdaLto}
                    onChange={(e) => setSettings({ ...settings, showFdaLto: e.target.checked })}
                    className="accent-teal-500 rounded"
                  />
                  <span>Show FDA LTO Line</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showCashierName}
                    onChange={(e) => setSettings({ ...settings, showCashierName: e.target.checked })}
                    className="accent-teal-500 rounded"
                  />
                  <span>Show Cashier Name</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showQrCode}
                    onChange={(e) => setSettings({ ...settings, showQrCode: e.target.checked })}
                    className="accent-teal-500 rounded"
                  />
                  <span>Show Verification QR</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">Custom Return Policy Disclaimer</label>
              <textarea
                rows={2}
                value={settings.returnPolicyNote}
                onChange={(e) => setSettings({ ...settings, returnPolicyNote: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-500 leading-relaxed font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset Default
              </button>

              <div className="flex items-center gap-3">
                {saveSuccess && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Layout Saved!
                  </span>
                )}
                <button
                  type="submit"
                  className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-teal-500/20"
                >
                  Save Thermal Layout
                </button>
              </div>
            </div>
          </form>

          {/* Live Preview on Right */}
          <div className="lg:col-span-5 p-6 bg-slate-100 flex flex-col items-center justify-start">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-teal-600" />
              Live Thermal Paper Preview ({settings.paperWidth})
            </div>

            {/* Receipt Container */}
            <div
              className={`bg-white text-slate-900 p-5 rounded-lg shadow-xl font-mono text-[10px] leading-tight space-y-2 border border-slate-300 ${
                settings.paperWidth === '58mm' ? 'w-56 text-[9px]' : settings.paperWidth === 'A4' ? 'w-full max-w-sm' : 'w-72'
              }`}
            >
              <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-0.5">
                <p className="font-bold text-xs font-sans tracking-tight">{settings.storeHeaderTitle}</p>
                <p className="text-[9px] text-slate-600">{settings.storeSubheader}</p>
                <p className="text-[8.5px] text-slate-500">Main: Casa Conching • USA: Gate 5 Gym</p>
                {settings.showTin && <p className="text-[8px] text-slate-500">TIN: {settings.tinNumber}</p>}
                {settings.showFdaLto && <p className="text-[8px] text-slate-500">{settings.fdaLtoNumber}</p>}
              </div>

              <div className="py-1 border-b border-dashed border-slate-400 space-y-0.5 text-[9px]">
                <div className="flex justify-between">
                  <span>Receipt No:</span>
                  <span className="font-bold">HNZ-2026-SAMPLE</span>
                </div>
                <div className="flex justify-between">
                  <span>Date/Time:</span>
                  <span>{new Date().toLocaleDateString('en-PH')}</span>
                </div>
                {settings.showCashierName && (
                  <div className="flex justify-between">
                    <span>Cashier:</span>
                    <span>Admin Staff #1</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>Augustinian BSN Student</span>
                </div>
              </div>

              {/* Sample Items */}
              <div className="py-1 border-b border-dashed border-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>1x Aneroid Sphygmomanometer</span>
                  <span>₱850.00</span>
                </div>
                <div className="flex justify-between">
                  <span>1x Dual Head Stethoscope</span>
                  <span>₱420.00</span>
                </div>
                <div className="flex justify-between">
                  <span>2x Micropore Tape 1"</span>
                  <span>₱130.00</span>
                </div>
              </div>

              {/* Totals */}
              <div className="pt-1 space-y-0.5 text-[9.5px]">
                <div className="flex justify-between font-bold text-xs">
                  <span>GRAND TOTAL:</span>
                  <span>₱1,400.00</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Payment (GCash):</span>
                  <span>₱1,400.00</span>
                </div>
              </div>

              {/* Disclaimers */}
              <div className="pt-2 border-t border-dashed border-slate-400 text-center space-y-1 text-[8px] text-slate-600">
                <p>{settings.customFooterNote}</p>
                <p className="font-semibold text-[7.5px]">{settings.returnPolicyNote}</p>
                {settings.showQrCode && (
                  <div className="pt-1 flex justify-center">
                    <div className="p-1 bg-slate-100 border border-slate-300 rounded">
                      <QrCode className="w-10 h-10 text-slate-900" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
