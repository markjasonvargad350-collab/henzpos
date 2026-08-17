import React, { useState } from 'react';
import { QrCode, X, Check, ArrowRight, UserCheck, Clock, MapPin } from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { soundEffects } from '../../utils/audio';

interface ScanPreOrderQRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScanPreOrderQRModal: React.FC<ScanPreOrderQRModalProps> = ({ isOpen, onClose }) => {
  const { preOrders, loadPreOrderIntoCart } = usePOS();
  const [inputCode, setInputCode] = useState('');
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleScanOrSubmit = (codeToUse?: string) => {
    const raw = (codeToUse || inputCode).trim();
    if (!raw) return;

    const success = loadPreOrderIntoCart(raw);
    if (success) {
      setFeedback({ success: true, message: `Loaded pre-order "${raw}" into POS cart successfully!` });
      setTimeout(() => {
        setFeedback(null);
        setInputCode('');
        onClose();
      }, 1000);
    } else {
      setFeedback({ success: false, message: `No active pre-order found matching "${raw}".` });
    }
  };

  const pendingOrReadyPreOrders = preOrders.filter(
    (po) => po.orderStatus !== 'Claimed' && po.orderStatus !== 'Cancelled'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#161b22] text-[#c9d1d9] w-full max-w-xl rounded-2xl shadow-2xl border border-[#30363d] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#0d1117] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Scan Customer Pre-Order QR Code</h3>
              <p className="text-[11px] text-gray-400">
                1-Second Instant Cart Loading for 50+ Item Checklists
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#21262d] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Status feedback */}
          {feedback && (
            <div
              className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                feedback.success
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/40'
              }`}
            >
              {feedback.success ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* QR Code Input / Scanner Box */}
          <div className="bg-[#0d1117] p-4 rounded-xl border border-[#30363d] space-y-3">
            <label className="block text-xs font-bold text-gray-300">
              Enter or Scan QR Code String:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <QrCode className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. HENZ-ORDER-HNZ-2026-0814 or HNZ-2026-0814"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleScanOrSubmit();
                  }}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg focus:outline-none focus:border-emerald-500 font-mono placeholder:text-gray-600"
                />
              </div>
              <button
                onClick={() => handleScanOrSubmit()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/40"
              >
                <span>Load Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              Tip: Hardware 2D Barcode/QR scanners will automatically simulate keystrokes and hit Enter.
            </p>
          </div>

          {/* Pending Pre-orders ready to claim */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">
                Incoming Pre-Order Queue (Click to Load):
              </span>
              <span className="text-[11px] text-gray-400 font-medium">
                {pendingOrReadyPreOrders.length} pending pickup
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {pendingOrReadyPreOrders.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400 bg-[#0d1117] rounded-lg border border-dashed border-[#30363d]">
                  No pending pre-orders in queue. Students can submit online checklists.
                </div>
              ) : (
                pendingOrReadyPreOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => handleScanOrSubmit(order.orderNumber)}
                    className="p-3 bg-[#0d1117] hover:bg-[#1f242c] border border-[#30363d] hover:border-emerald-500/60 rounded-xl cursor-pointer transition flex items-center justify-between group shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-300 bg-[#21262d] border border-[#30363d] px-1.5 py-0.5 rounded">
                          {order.orderNumber}
                        </span>
                        <span className="text-xs font-bold text-white group-hover:text-emerald-400">
                          {order.customerName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                            order.orderStatus === 'Ready for Pickup'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {order.orderStatus}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-gray-500" />
                          {order.schoolOrClinic}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-500" />
                          {order.pickupBranch.includes('Pavia') ? 'Pavia Hub' : 'Main Branch'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          {order.totalItems} items
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                      <div className="text-sm font-bold text-emerald-400 font-mono">₱{order.totalAmount.toLocaleString()}</div>
                      <div className="text-[10px] font-semibold text-emerald-400 group-hover:translate-x-0.5 transition flex items-center justify-end gap-0.5">
                        Load in POS →
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0d1117] px-5 py-3 border-t border-[#30363d] flex justify-between items-center text-xs text-gray-400">
          <span>HENZ Health Care Trading • Fast Student Pickup System</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-lg font-semibold transition border border-[#30363d] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
