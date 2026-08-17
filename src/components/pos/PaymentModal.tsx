import React, { useState } from 'react';
import {
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  CheckCircle2,
  X,
  Printer,
  Sparkles,
  User,
  GraduationCap,
  Building2,
  Receipt,
  Percent,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { usePOS } from '../../context/POSContext';
import { PaymentMethod, SaleTransaction } from '../../types';
import { QRCodeRenderer } from '../common/QRCodeRenderer';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: (transaction: SaleTransaction, autoPrint: boolean) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
}) => {
  const { heldCarts, activeCartIndex, completeSale } = usePOS();
  const currentCart = heldCarts[activeCartIndex];

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [customerName, setCustomerName] = useState(currentCart?.customerName || '');
  const [customerType, setCustomerType] = useState<SaleTransaction['customerType']>(
    currentCart?.customerType || 'Student'
  );
  const [cashierName, setCashierName] = useState('Elena (Cashier 1)');
  const [discountPercent, setDiscountPercent] = useState<number>(
    currentCart?.customerType === 'Student' ? 5 : 0
  );
  const [cashTendered, setCashTendered] = useState<string>('');
  const [gcashRef, setGcashRef] = useState('');
  const [selectedBank, setSelectedBank] = useState('BDO Unibank');
  const [bankRef, setBankRef] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(true);

  if (!isOpen || !currentCart || currentCart.items.length === 0) return null;

  const rawSubtotal = currentCart.items.reduce((acc, item) => acc + item.subtotal, 0);
  const discountAmount = Math.round((rawSubtotal * discountPercent) / 100);
  const grandTotal = Math.max(0, rawSubtotal - discountAmount);

  const numTendered = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, numTendered - grandTotal);
  const isCashSufficient = paymentMethod !== 'Cash' || numTendered >= grandTotal;

  const handleProcessPayment = () => {
    setErrorMessage(null);

    if (paymentMethod === 'Cash' && numTendered < grandTotal) {
      setErrorMessage(`Tendered cash (₱${numTendered}) is less than total amount due (₱${grandTotal}).`);
      return;
    }

    if (paymentMethod === 'GCash' && !gcashRef.trim()) {
      setErrorMessage('Please enter the GCash Transaction Reference Number.');
      return;
    }

    if (paymentMethod === 'Bank Payment' && !bankRef.trim()) {
      setErrorMessage('Please enter the Bank Transfer Reference Number.');
      return;
    }

    const tx = completeSale({
      customerName: customerName.trim() || `${customerType} Customer`,
      customerType,
      paymentMethod,
      amountTendered: paymentMethod === 'Cash' ? numTendered : grandTotal,
      referenceNumber: paymentMethod === 'GCash' ? gcashRef.trim() : paymentMethod === 'Bank Payment' ? bankRef.trim() : undefined,
      bankName: paymentMethod === 'Bank Payment' ? selectedBank : undefined,
      discountAmount,
      cashierName,
    });

    if (tx) {
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#059669', '#10b981', '#34d399', '#0284c7'],
        });
      } catch {
        // ignore
      }

      onClose();
      if (onPaymentSuccess) onPaymentSuccess(tx, autoPrintReceipt);
    }
  };

  const setExactCash = () => {
    setCashTendered(String(grandTotal));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white text-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Payment Checkout</h3>
              <p className="text-xs text-slate-400">
                HENZ Health Care Products Trading POS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 text-rose-800 text-xs font-semibold rounded-xl border border-rose-200 flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Customer & Discount Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Customer Name / School:
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Maria Santos / San Agustin"
                className="w-full px-3 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Customer Category:
              </label>
              <div className="flex gap-1">
                {(['Student', 'Clinic', 'Walk-in', 'Wholesale'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setCustomerType(type);
                      if (type === 'Student') setDiscountPercent(5);
                    }}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                      customerType === type
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Discount Privileges:
              </label>
              <div className="flex items-center gap-1">
                {[0, 5, 8, 10, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountPercent(pct)}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                      discountPercent === pct
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {pct === 0 ? '0%' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Amount Due Summary Banner */}
          <div className="bg-emerald-50 text-slate-900 p-4 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="text-xs text-emerald-800 flex items-center gap-2 font-medium">
                <span>{currentCart.items.length} items ({currentCart.items.reduce((a,b)=>a+b.quantity, 0)} units)</span>
                {discountAmount > 0 && (
                  <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                    Saved ₱{discountAmount.toLocaleString()} ({discountPercent}% Off)
                  </span>
                )}
              </div>
              <div className="text-3xl font-black tracking-tight font-mono text-emerald-800 mt-0.5">
                ₱{grandTotal.toLocaleString()}
              </div>
            </div>

            <div className="text-right text-xs text-slate-600 sm:border-l sm:border-emerald-200 sm:pl-4">
              <div>Subtotal: <span className="font-mono font-bold text-slate-800">₱{rawSubtotal.toLocaleString()}</span></div>
              <div>VAT (12% Included): <span className="font-mono text-slate-700">₱{Math.round(grandTotal * 0.12).toLocaleString()}</span></div>
            </div>
          </div>

          {/* Payment Method Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Payment Method:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('Cash')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                  paymentMethod === 'Cash'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 font-bold'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-600" />
                <span className="text-xs">Cash Tender</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('GCash')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                  paymentMethod === 'GCash'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 font-bold'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <Smartphone className="w-5 h-5 text-blue-600" />
                <span className="text-xs">GCash (QR)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Bank Payment')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                  paymentMethod === 'Bank Payment'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500/20 font-bold'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <Building className="w-5 h-5 text-indigo-600" />
                <span className="text-xs">Bank Transfer</span>
              </button>
            </div>
          </div>

          {/* Cash Inputs */}
          {paymentMethod === 'Cash' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Amount Received from Customer (₱):
                </label>
                <button
                  type="button"
                  onClick={setExactCash}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                >
                  Exact Amount (₱{grandTotal.toLocaleString()})
                </button>
              </div>

              <input
                type="number"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                placeholder={`₱${grandTotal}`}
                autoFocus
                className="w-full px-4 py-2.5 text-xl font-black bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-mono"
              />

              {/* Quick Cash Presets */}
              <div className="flex flex-wrap gap-1.5">
                {[100, 200, 500, 1000, 2000, 5000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCashTendered(String(val))}
                    className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    ₱{val.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Change Calculation Box */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-600">Change to Return:</span>
                <span
                  className={`text-xl font-mono font-black ${
                    changeDue > 0 ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  ₱{changeDue.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* GCash Inputs */}
          {paymentMethod === 'GCash' && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex flex-col sm:flex-row items-center gap-4">
              <div className="shrink-0 text-center bg-white p-2 rounded-xl border border-blue-200 shadow-xs">
                <QRCodeRenderer value={`HENZ-GCASH-PAY-${grandTotal}-PHP`} size={110} />
                <span className="text-[10px] text-slate-800 font-bold block mt-1">
                  Scan to Pay GCash
                </span>
              </div>
              <div className="flex-1 space-y-2 w-full">
                <div>
                  <span className="text-xs font-bold text-blue-900 block">
                    HENZ Health Care Trading Official GCash
                  </span>
                  <p className="text-[11px] text-blue-700">
                    Account: 0917-555-HENZ (0917-555-4369)
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    GCash Reference Number (Required):
                  </label>
                  <input
                    type="text"
                    value={gcashRef}
                    onChange={(e) => setGcashRef(e.target.value)}
                    placeholder="e.g. 982103491823"
                    className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bank Inputs */}
          {paymentMethod === 'Bank Payment' && (
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Depository Bank:
                  </label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="BDO Unibank">BDO Unibank (Iloilo)</option>
                    <option value="Bank of the Philippine Islands (BPI)">BPI (Iloilo City)</option>
                    <option value="Landbank of the Philippines">Landbank (Pavia Hub)</option>
                    <option value="Metrobank">Metrobank (Iloilo)</option>
                    <option value="UnionBank of the Philippines">UnionBank</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Bank Reference / Transaction ID:
                  </label>
                  <input
                    type="text"
                    value={bankRef}
                    onChange={(e) => setBankRef(e.target.value)}
                    placeholder="e.g. BDO-TRX-98214"
                    className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>
              <div className="text-[11px] text-indigo-900 bg-white p-2 rounded-lg border border-indigo-200 font-medium">
                HENZ Health Care Trading Account: <span className="font-mono font-bold text-slate-900">0048-2910-4491</span>
              </div>
            </div>
          )}

          {/* Quick Auto-Print Checkbox */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={autoPrintReceipt}
                onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-semibold">Auto-print thermal receipt upon sale completion</span>
            </label>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-mono font-bold">
              <Printer className="w-3.5 h-3.5" />
              <span>Thermal Ready</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-300 cursor-pointer"
          >
            Back to Cart
          </button>

          <button
            type="button"
            onClick={handleProcessPayment}
            disabled={!isCashSufficient}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer ${
              isCashSufficient
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Complete Sale {autoPrintReceipt ? '& Print Receipt' : ''} (₱{grandTotal.toLocaleString()})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
