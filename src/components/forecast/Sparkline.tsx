/**
 * Sparkline — a tiny inline SVG trend line for a reorder-table row. Hand-rolled
 * (no charting dependency) to keep the bundle small. Shows the recent daily
 * demand shape; flat/empty series render a baseline.
 */
import React from 'react';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  stroke?: string;
}

const Sparkline: React.FC<SparklineProps> = ({
  values,
  width = 90,
  height = 24,
  className,
  stroke = '#10b981', // emerald-500
}) => {
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  if (values.length === 0) {
    return (
      <svg width={width} height={height} className={className} role="img" aria-label="No trend data">
        <line x1={pad} y1={height / 2} x2={width - pad} y2={height / 2} stroke="#cbd5e1" strokeWidth={1} />
      </svg>
    );
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = values.length > 1 ? w / (values.length - 1) : 0;

  const points = values
    .map((v, i) => {
      const x = pad + i * step;
      const y = pad + h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className={className} role="img" aria-label="Recent demand trend">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

export default Sparkline;
