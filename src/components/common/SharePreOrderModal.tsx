import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  MessageSquare,
  Sparkles,
  X,
  Smartphone,
  School,
  Building2,
} from 'lucide-react';
import { QRCodeRenderer } from './QRCodeRenderer';

interface SharePreOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SharePreOrderModal: React.FC<SharePreOrderModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generate the clean public pre-order link
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const preOrderUrl = `${origin}${pathname}?mode=preorder`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(preOrderUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = preOrderUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleOpenNewTab = () => {
    window.open(preOrderUrl, '_blank');
  };

  const shareText = `Order your Medical Supplies & Student Duty Kits online with HENZ Health Care! Pick up at our Main Branch (Jalandoni St) or D'Jabez Branch (Gen. Luna St): ${preOrderUrl}`;

  const handleShareMessenger = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(preOrderUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const handleShareViber = () => {
    const url = `viber://forward?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white text-slate-800 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Share Customer Pre-Order Link
            </h3>
            <p className="text-xs text-slate-500">
              Students and clinics can pre-order with no login required
            </p>
          </div>
        </div>

        {/* QR Code and Direct URL Box */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="sm:col-span-4 flex flex-col items-center justify-center">
            <div className="bg-white p-2.5 rounded-xl shadow-md border border-slate-200">
              <QRCodeRenderer value={preOrderUrl} size={110} />
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1.5 flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-emerald-600" />
              <span>Scan to open portal</span>
            </span>
          </div>

          <div className="sm:col-span-8 space-y-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Direct Pre-Order URL:
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={preOrderUrl}
                  className="w-full px-3 py-2 text-xs bg-white text-emerald-700 border border-slate-200 rounded-xl font-mono focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                    copied
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 space-y-1">
              <p className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <Sparkles className="w-3 h-3" />
                <span>Zero Login Required for Customers & Students</span>
              </p>
              <p>
                Recipients get instant access to 60+ medical items, starter kits, branch selector (Main &amp; D&apos;Jabez), and QR pickup slips.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Social & Group Sharing */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            Share directly to Student Groups & Channels:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleShareMessenger}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 transition flex flex-col items-center gap-1 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>Facebook / GC</span>
            </button>

            <button
              type="button"
              onClick={handleShareViber}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 transition flex flex-col items-center gap-1 cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-purple-600" />
              <span>Viber Group</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 transition flex flex-col items-center gap-1 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={handleOpenNewTab}
            className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-semibold cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Customer Link in New Tab</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
