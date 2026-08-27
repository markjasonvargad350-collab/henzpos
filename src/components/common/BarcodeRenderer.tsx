import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { pickBarcodeFormat } from '../../lib/barcode';

interface BarcodeRendererProps {
  value: string;
  className?: string;
}

/**
 * Renders a 1D barcode (the classic striped retail look) for on-screen preview.
 * Sibling to QRCodeRenderer. A valid EAN-13 draws as EAN-13; anything else
 * falls back to CODE128 so any stored code still shows something scannable.
 * If JsBarcode rejects the value outright, we surface a gentle hint instead of
 * throwing.
 */
export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({ value, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    try {
      JsBarcode(canvasRef.current, value, {
        format: pickBarcodeFormat(value),
        width: 2,
        height: 64,
        displayValue: true,
        margin: 8,
        background: '#ffffff',
        lineColor: '#0f172a',
        font: 'monospace',
        fontSize: 15,
        textMargin: 2,
      });
      setError(null);
    } catch {
      setError('This code can’t be drawn as a striped barcode. Use QR, or ⚡ auto-generate a valid EAN-13.');
    }
  }, [value]);

  return (
    <div className={`inline-flex flex-col items-center justify-center p-2.5 bg-slate-50 rounded-xl shadow-sm border border-slate-200 ${className}`}>
      {error ? (
        <span className="max-w-[220px] text-center text-[11px] text-rose-600 px-2 py-6">{error}</span>
      ) : (
        <canvas ref={canvasRef} className="rounded-lg p-1 bg-white" />
      )}
    </div>
  );
};
