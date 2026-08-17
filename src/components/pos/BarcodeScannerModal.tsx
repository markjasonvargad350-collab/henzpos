import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, CheckCircle, Scan, AlertCircle } from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { soundEffects } from '../../utils/audio';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected?: (code: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onBarcodeDetected,
}) => {
  const { products, addToCart } = usePOS();
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isOpen && cameraActive) {
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          setCameraError('Camera access unavailable or blocked in iframe. You can use one-click sample barcode buttons below.');
          setCameraActive(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, cameraActive]);

  if (!isOpen) return null;

  const handleScanCode = (barcode: string) => {
    const matched = products.find(
      (p) => p.barcode === barcode || p.sku.toLowerCase() === barcode.toLowerCase()
    );

    if (matched) {
      addToCart(matched, 1);
      setScannedFeedback(`Added: ${matched.name} (₱${matched.price})`);
      if (onBarcodeDetected) onBarcodeDetected(barcode);
      setTimeout(() => setScannedFeedback(null), 2000);
    } else {
      soundEffects.playErrorBeep();
      setScannedFeedback(`Unrecognized barcode: ${barcode}`);
      setTimeout(() => setScannedFeedback(null), 2500);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScanCode(manualCode.trim());
      setManualCode('');
    }
  };

  // Sample quick scan items
  const fastScanSamples = products.slice(0, 8);  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#161b22] text-[#c9d1d9] w-full max-w-lg rounded-2xl shadow-2xl border border-[#30363d] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#0d1117] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Medical Barcode Scanner</h3>
              <p className="text-[11px] text-gray-400">Hardware wedge, camera, or quick simulation</p>
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
          {/* Feedback notification */}
          {scannedFeedback && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-semibold border border-emerald-500/40 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{scannedFeedback}</span>
            </div>
          )}

          {/* Camera View or Placeholder */}
          <div className="relative aspect-video bg-[#0a0b0d] rounded-xl overflow-hidden flex flex-col items-center justify-center text-center p-4 border border-[#30363d]">
            {cameraActive ? (
              <>
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                {/* Laser scan line overlay */}
                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse"></div>
                <div className="absolute inset-6 border-2 border-dashed border-emerald-400/70 rounded-lg pointer-events-none"></div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center mx-auto text-gray-400">
                  <Camera className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Live Camera Scanner</p>
                  <p className="text-[11px] text-gray-400 max-w-xs mt-0.5">
                    Point camera at medical supply packaging or barcode label
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCameraError(null);
                    setCameraActive(true);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-md shadow-emerald-950/40"
                >
                  Enable Camera Stream
                </button>
              </div>
            )}

            {cameraError && (
              <div className="absolute bottom-2 inset-x-2 bg-amber-950/90 text-amber-200 text-[11px] p-2 rounded flex items-center gap-1.5 text-left border border-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>

          {/* Manual / USB Wedge Input */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Scan or type barcode (e.g. 480651234001)..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              autoFocus
              className="flex-1 px-3.5 py-2 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg focus:outline-none focus:border-emerald-500 font-mono placeholder:text-gray-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-md shadow-emerald-950/40"
            >
              Scan
            </button>
          </form>

          {/* Quick Click Simulation for Research Demo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                1-Click Medical Barcode Tester:
              </span>
              <span className="text-[10px] text-gray-400">Instant Cashier Simulation</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {fastScanSamples.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleScanCode(p.barcode)}
                  className="flex flex-col text-left p-2 rounded-lg border border-[#30363d] bg-[#0d1117] hover:border-emerald-500/60 hover:bg-[#1f242c] transition group cursor-pointer"
                >
                  <span className="text-[11px] font-semibold text-white line-clamp-1 group-hover:text-emerald-400">
                    {p.name}
                  </span>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mt-0.5">
                    <span className="font-mono text-gray-500">{p.barcode}</span>
                    <span className="font-bold text-emerald-400 font-mono">₱{p.price}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0d1117] px-5 py-3 border-t border-[#30363d] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-lg text-xs font-semibold transition border border-[#30363d] cursor-pointer"
          >
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
};
