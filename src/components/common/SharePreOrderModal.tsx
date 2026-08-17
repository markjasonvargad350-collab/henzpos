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

  const shareText = `Order your Medical Supplies & Student Duty Kits online with HENZ Health Care! Pick up at Main Branch (Jalandoni St) or USA Branch (USA Gym): ${preOrderUrl}`;

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
      <div className="bg-[#161b22] text-[#c9d1d9] w-full max-w-lg rounded-2xl shadow-2xl border border-emerald-500/40 p-6 space-y-5 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-[#21262d] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/40">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">
              Share Customer Pre-Order Link
            </h3>
            <p className="text-xs text-gray-400">
              Students and clinics can pre-order with no login required
            </p>
          </div>
        </div>

        {/* QR Code and Direct URL Box */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-[#0d1117] p-4 rounded-xl border border-[#30363d]">
          <div className="sm:col-span-4 flex flex-col items-center justify-center">
            <div className="bg-white p-2.5 rounded-xl shadow-md border border-gray-200">
              <QRCodeRenderer value={preOrderUrl} size={110} />
            </div>
            <span className="text-[10px] text-gray-400 font-mono mt-1.5 flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-emerald-400" />
              <span>Scan to open portal</span>
            </span>
          </div>

          <div className="sm:col-span-8 space-y-2.5">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Direct Pre-Order URL:
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={preOrderUrl}
                  className="w-full px-3 py-2 text-xs bg-[#161b22] text-emerald-400 border border-[#30363d] rounded-xl font-mono focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                    copied
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                      : 'bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d]'
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

            <div className="text-[11px] text-gray-400 space-y-1">
              <p className="flex items-center gap-1.5 text-emerald-300 font-medium">
                <Sparkles className="w-3 h-3" />
                <span>Zero Login Required for Customers & Students</span>
              </p>
              <p>
                Recipients get instant access to 60+ medical items, starter kits, branch selector (Main & USA), and QR pickup slips.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Social & Group Sharing */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-300">
            Share directly to Student Groups & Channels:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleShareMessenger}
              className="p-2.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-xl text-xs font-semibold text-gray-200 hover:text-white transition flex flex-col items-center gap-1 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span>Facebook / GC</span>
            </button>

            <button
              type="button"
              onClick={handleShareViber}
              className="p-2.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-xl text-xs font-semibold text-gray-200 hover:text-white transition flex flex-col items-center gap-1 cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-purple-400" />
              <span>Viber Group</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="p-2.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-xl text-xs font-semibold text-gray-200 hover:text-white transition flex flex-col items-center gap-1 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#30363d]">
          <button
            type="button"
            onClick={handleOpenNewTab}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Customer Link in New Tab</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-xl text-xs font-semibold border border-[#30363d] transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
