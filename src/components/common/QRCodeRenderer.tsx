import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeRendererProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCodeRenderer: React.FC<QRCodeRendererProps> = ({
  value,
  size = 180,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(
        canvasRef.current,
        value,
        {
          width: size,
          margin: 1.5,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        },
        (error) => {
          if (error) console.error('QR Code generation error', error);
        }
      );
    }
  }, [value, size]);

  return (
    <div className={`inline-flex flex-col items-center justify-center p-2.5 bg-[#0d1117] rounded-xl shadow-sm border border-[#30363d] ${className}`}>
      <canvas ref={canvasRef} className="rounded-lg p-1 bg-white" />
      <span className="mt-1.5 text-[11px] font-mono font-medium text-gray-400 tracking-wider">
        {value}
      </span>
    </div>
  );
};
