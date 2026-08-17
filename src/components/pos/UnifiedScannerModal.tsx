import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, CheckCircle, AlertCircle, Sparkles, QrCode, ScanLine, ShoppingBag } from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { soundEffects } from '../../utils/audio';

interface UnifiedScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UnifiedScannerModal: React.FC<UnifiedScannerModalProps> = ({ isOpen, onClose }) => {
  const { products, preOrders, addToCart, loadPreOrderIntoCart } = usePOS();
  const [manualCode, setManualCode] = useState('');
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'success' | 'error' | 'preorder';
    message: string;
  } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      setScanFeedback(null);
      setManualCode('');
      setCameraError(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } else {
        setCameraError('Camera access not supported on this device/browser.');
      }
    } catch (err) {
      console.warn('Camera error:', err);
      setCameraError('Camera permission denied or camera not available. Use manual entry or test codes below.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleProcessCode = (scannedCode: string) => {
    const code = scannedCode.trim();
    if (!code) return;

    // Check if it's a pre-order reference (starts with HENZ-PRE- or matches preOrder list)
    const matchingPreOrder = preOrders.find(
      (po) =>
        po.referenceCode.toLowerCase() === code.toLowerCase() ||
        po.id.toLowerCase() === code.toLowerCase()
    );

    if (matchingPreOrder) {
      const loaded = loadPreOrderIntoCart(matchingPreOrder.id);
      if (loaded) {
        soundEffects.playSuccessPayment();
        setScanFeedback({
          type: 'preorder',
          message: `Pre-Order #${matchingPreOrder.referenceCode} for ${matchingPreOrder.customerName} loaded into cart!`,
        });
        setTimeout(() => {
          onClose();
        }, 1200);
        return;
      }
    }

    // Check if it's a product barcode or SKU
    const matchProduct = products.find(
      (p) =>
        p.barcode.toLowerCase() === code.toLowerCase() ||
        p.sku.toLowerCase() === code.toLowerCase()
    );

    if (matchProduct) {
      addToCart(matchProduct, 1);
      soundEffects.playScanBeep();
      setScanFeedback({
        type: 'success',
        message: `Added: ${matchProduct.name} (₱${matchProduct.price})`,
      });
      setManualCode('');
      setTimeout(() => {
        setScanFeedback(null);
      }, 2500);
      return;
    }

    // Not found
    soundEffects.playErrorBeep();
    setScanFeedback({
      type: 'error',
      message: `No product or pre-order found for code: "${code}"`,
    });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessCode(manualCode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white text-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <ScanLine className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight text-white">Smart Scanner</h3>
              <p className="text-[11px] text-slate-400">Scans Item Barcodes & Pre-Order QRs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport Area */}
        <div className="p-4 bg-slate-50 space-y-3">
          <div className="relative aspect-4/3 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-300">
            {cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-4 text-slate-400 space-y-2">
                <Camera className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-xs text-slate-300">
                  {cameraError || 'Initializing camera viewfinder...'}
                </p>
              </div>
            )}

            {/* Targeting Aim Reticle */}
            <div className="absolute inset-8 border-2 border-emerald-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-2 shadow-inner">
              <div className="flex justify-between">
                <span className="w-4 h-4 border-t-2 border-l-2 border-emerald-400"></span>
                <span className="w-4 h-4 border-t-2 border-r-2 border-emerald-400"></span>
              </div>
              <div className="w-full h-0.5 bg-emerald-400/70 shadow-lg shadow-emerald-400 animate-pulse"></div>
              <div className="flex justify-between">
                <span className="w-4 h-4 border-b-2 border-l-2 border-emerald-400"></span>
                <span className="w-4 h-4 border-b-2 border-r-2 border-emerald-400"></span>
              </div>
            </div>
          </div>

          {/* Feedback Toast */}
          {scanFeedback && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border font-medium ${
                scanFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : scanFeedback.type === 'preorder'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {scanFeedback.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
              {scanFeedback.type === 'preorder' && <ShoppingBag className="w-4 h-4 text-blue-600 shrink-0" />}
              {scanFeedback.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{scanFeedback.message}</span>
            </div>
          )}

          {/* Manual Input Form */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
              Manual Barcode or Pre-Order Ref:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. 480651234001 or HENZ-PRE-8921"
                className="flex-1 px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Enter
              </button>
            </div>
          </form>

          {/* Quick Click Simulators for Easy Testing */}
          <div className="pt-2 border-t border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Quick Test Simulation:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {products.slice(0, 3).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProcessCode(p.barcode)}
                  className="text-[10px] bg-white hover:bg-slate-100 border border-slate-300 px-2 py-1 rounded text-slate-700 transition cursor-pointer"
                >
                  +{p.name.split(' ')[0]}
                </button>
              ))}
              {preOrders.slice(0, 2).map((po) => (
                <button
                  key={po.id}
                  type="button"
                  onClick={() => handleProcessCode(po.referenceCode)}
                  className="text-[10px] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded text-blue-700 font-medium transition cursor-pointer"
                >
                  QR #{po.referenceCode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg transition cursor-pointer"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
