import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, CheckCircle, AlertCircle, ScanLine, ShoppingBag, Keyboard } from 'lucide-react';
import jsQR from 'jsqr';
import { usePOS } from '../../context/POSContext';
import { soundEffects } from '../../utils/audio';
import { findPreOrderByCode, findProductByCode } from '../../lib/scanMatch';

interface UnifiedScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ScanEngine = 'native' | 'jsqr' | null;

// Formats we ask the native BarcodeDetector for: pickup QR plus the common retail
// 1D symbologies a product barcode might use. We intersect with what the device
// actually supports so construction never throws on an unsupported format.
const WANTED_FORMATS = [
  'qr_code',
  'ean_13',
  'ean_8',
  'code_128',
  'code_39',
  'upc_a',
  'upc_e',
  'itf',
  'codabar',
];

export const UnifiedScannerModal: React.FC<UnifiedScannerModalProps> = ({ isOpen, onClose }) => {
  const { products, preOrders, addToCart, loadPreOrderIntoCart } = usePOS();
  const [manualCode, setManualCode] = useState('');
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'success' | 'error' | 'preorder';
    message: string;
  } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [engine, setEngine] = useState<ScanEngine>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const scanningRef = useRef(false);
  const busyRef = useRef(false);
  const cooldownRef = useRef(0);
  const lastCodeRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  // Match a scanned code to a pre-order or product. Kept in a ref so the scan
  // loop always calls the latest version (with fresh preOrders/products) without
  // having to tear down and restart the camera every time that data changes.
  const handleProcessCode = (scannedCode: string) => {
    const code = scannedCode.trim();
    if (!code) return;

    const matchingPreOrder = findPreOrderByCode(preOrders, code);
    if (matchingPreOrder) {
      const loaded = loadPreOrderIntoCart(matchingPreOrder.id);
      if (loaded) {
        soundEffects.playSuccessPayment();
        setScanFeedback({
          type: 'preorder',
          message: `Pre-Order #${matchingPreOrder.orderNumber} for ${matchingPreOrder.customerName} loaded into cart!`,
        });
        scanningRef.current = false; // we're about to close — stop reading frames
        setTimeout(() => {
          onClose();
        }, 1200);
        return;
      }
    }

    const matchProduct = findProductByCode(products, code);
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

    soundEffects.playErrorBeep();
    setScanFeedback({
      type: 'error',
      message: `No product or pre-order found for code: "${code}"`,
    });
  };

  // A code stays in the camera frame for many consecutive frames. Debounce the
  // exact same value for 1.5s (else a held product barcode adds 20+ units) and
  // pause briefly after every hit so the feedback toast is readable.
  const handleDetected = (raw: string) => {
    const code = (raw || '').trim();
    if (!code) return;
    const now = Date.now();
    if (lastCodeRef.current.code === code && now - lastCodeRef.current.at < 1500) return;
    lastCodeRef.current = { code, at: now };
    cooldownRef.current = now + 1000;
    handleProcessCode(code);
  };

  const handleDetectedRef = useRef(handleDetected);
  handleDetectedRef.current = handleDetected;

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    scanningRef.current = true;
    busyRef.current = false;
    cooldownRef.current = 0;
    lastCodeRef.current = { code: '', at: 0 };
    setScanFeedback(null);
    setManualCode('');
    setCameraError(null);
    setCameraActive(false);

    // Pick a decode engine. Native BarcodeDetector (Android/Chrome/Edge) reads QR
    // *and* 1D product barcodes fast on the GPU. Everything else — notably iPhone
    // Safari — falls back to jsQR, which reads QR codes from canvas pixels.
    const initDetector = async () => {
      detectorRef.current = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const BD = (window as any).BarcodeDetector;
        if (BD) {
          let supported: string[] | undefined;
          try {
            supported = await BD.getSupportedFormats?.();
          } catch {
            supported = undefined;
          }
          const formats =
            supported && supported.length
              ? WANTED_FORMATS.filter((f) => supported!.includes(f))
              : ['qr_code'];
          detectorRef.current = new BD({ formats: formats.length ? formats : ['qr_code'] });
          setEngine('native');
          return;
        }
      } catch {
        detectorRef.current = null;
      }
      setEngine('jsqr');
    };

    const startCamera = async (): Promise<boolean> => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError('Camera not supported on this browser. Use manual entry or a USB scanner.');
          return false;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          return false;
        }
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          /* autoPlay handles it; some browsers reject an explicit play() */
        }
        setCameraActive(true);
        return true;
      } catch (err) {
        console.warn('Camera error:', err);
        setCameraError(
          'Camera blocked or unavailable. Allow camera access, or use manual entry / a USB scanner below.'
        );
        return false;
      }
    };

    const scanWithJsQR = (video: HTMLVideoElement): string | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return null;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, w, h);
      let img: ImageData;
      try {
        img = ctx.getImageData(0, 0, w, h);
      } catch {
        return null; // tainted canvas (shouldn't happen with a same-origin camera)
      }
      const result = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
      return result?.data ?? null;
    };

    const tick = async () => {
      if (!scanningRef.current) return;
      const video = videoRef.current;
      const now = Date.now();
      if (
        video &&
        video.readyState >= 2 /* HAVE_CURRENT_DATA */ &&
        now >= cooldownRef.current &&
        !busyRef.current
      ) {
        busyRef.current = true;
        try {
          let raw: string | null = null;
          if (detectorRef.current) {
            const codes = await detectorRef.current.detect(video);
            if (codes && codes.length > 0) raw = codes[0].rawValue || null;
          } else {
            raw = scanWithJsQR(video);
          }
          if (raw) handleDetectedRef.current(raw);
        } catch {
          /* per-frame decode failures are normal; keep scanning */
        } finally {
          busyRef.current = false;
        }
      }
      if (scanningRef.current) rafRef.current = requestAnimationFrame(tick);
    };

    const run = async () => {
      await initDetector();
      const ok = await startCamera();
      if (cancelled) return;
      if (ok) rafRef.current = requestAnimationFrame(tick);
    };
    run();

    return () => {
      cancelled = true;
      scanningRef.current = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      const video = videoRef.current;
      if (video) video.srcObject = null;
      setCameraActive(false);
    };
    // Camera + loop are set up once per open; the scan loop reads fresh data via
    // handleDetectedRef, so it must not restart when products/preOrders change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessCode(manualCode);
    setManualCode('');
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
            {/* The <video> is always mounted so its ref exists the moment the
                stream is ready — otherwise attaching the stream would deadlock. */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-200 ${
                cameraActive ? 'opacity-100' : 'opacity-0'
              }`}
            />
            {/* Off-screen scratch canvas for the jsQR fallback path. */}
            <canvas ref={canvasRef} className="hidden" />

            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-2">
                <Camera className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-xs text-slate-300 max-w-[85%]">
                  {cameraError || 'Starting camera…'}
                </p>
              </div>
            )}

            {/* Targeting Aim Reticle (only over a live feed) */}
            {cameraActive && (
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
            )}
          </div>

          {/* Live scan status */}
          {cameraActive && (
            <p className="text-[11px] text-center text-slate-500">
              Scanning live — hold the {engine === 'jsqr' ? 'QR code' : 'QR or barcode'} steady inside the frame.
            </p>
          )}

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

          {/* Manual Input Form — also the entry point for a USB/Bluetooth barcode
              gun, which types the code and presses Enter. */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Keyboard className="w-3.5 h-3.5 text-slate-400" />
              Manual / USB Scanner Entry:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. 480651234001 or HNZ-2026-0814"
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
            <p className="text-[10px] text-slate-400">
              Accepts a product barcode/SKU, an order number, or a printed pickup QR pass.
            </p>
          </form>
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
