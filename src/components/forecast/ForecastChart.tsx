/**
 * ForecastChart — hand-rolled SVG (no charting library, to protect the bundle).
 * Plots daily demand history (solid emerald) and the projected forecast horizon
 * (dashed indigo), split by a "today" divider, with an optional average-rate
 * reference line (rose dashed).
 *
 * Note on the reference line: it is the forecast's average DAILY DEMAND, not the
 * reorder point. The reorder point is a STOCK level (units on hand) and would be
 * dimensionally wrong on a daily-demand axis — those numbers live in the reorder
 * table instead.
 */
import React from 'react';

interface ForecastChartProps {
  history: number[];
  forecast: number[];
  /** Optional horizontal reference (the average daily demand), rose dashed. */
  refLevel?: number;
  refLabel?: string;
  height?: number;
}

const PAD = { top: 10, right: 12, bottom: 18, left: 30 };

const ForecastChart: React.FC<ForecastChartProps> = ({
  history,
  forecast,
  refLevel,
  refLabel = 'avg/day',
  height = 240,
}) => {
  const width = 720; // viewBox width; SVG scales responsively to its container
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;

  const totalPoints = history.length + forecast.length;
  if (totalPoints === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">
        No demand data to plot.
      </div>
    );
  }

  const yMax = Math.max(1, ...history, ...forecast, refLevel ?? 0);
  const xCount = Math.max(1, totalPoints - 1);

  const xAt = (i: number): number => PAD.left + (i / xCount) * innerW;
  const yAt = (v: number): number => PAD.top + innerH - (v / yMax) * innerH;

  const historyPts = history.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ');

  // Connect the forecast to the last actual point for visual continuity.
  const forecastStartIndex = Math.max(0, history.length - 1);
  const forecastSeries = history.length > 0 ? [history[history.length - 1], ...forecast] : forecast;
  const forecastPts = forecastSeries
    .map((v, k) => `${xAt(forecastStartIndex + k).toFixed(1)},${yAt(v).toFixed(1)}`)
    .join(' ');

  const dividerX = xAt(Math.max(0, history.length - 1));
  const gridLevels = [0, yMax / 2, yMax];

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Demand forecast chart" preserveAspectRatio="xMidYMid meet">
        {/* Y gridlines + labels */}
        {gridLevels.map((lvl, i) => (
          <g key={`grid-${i}`}>
            <line x1={PAD.left} y1={yAt(lvl)} x2={width - PAD.right} y2={yAt(lvl)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={PAD.left - 4} y={yAt(lvl) + 3} textAnchor="end" fontSize={9} fill="#94a3b8">
              {lvl % 1 === 0 ? lvl : lvl.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Reference (average daily demand) */}
        {typeof refLevel === 'number' && refLevel > 0 && (
          <g>
            <line
              x1={PAD.left}
              y1={yAt(refLevel)}
              x2={width - PAD.right}
              y2={yAt(refLevel)}
              stroke="#f43f5e"
              strokeWidth={1.25}
              strokeDasharray="5 4"
            />
            <text x={width - PAD.right} y={yAt(refLevel) - 3} textAnchor="end" fontSize={9} fill="#f43f5e">
              {refLabel}: {refLevel.toFixed(2)}
            </text>
          </g>
        )}

        {/* "today" divider */}
        <line x1={dividerX} y1={PAD.top} x2={dividerX} y2={PAD.top + innerH} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 3" />
        <text x={dividerX} y={height - 5} textAnchor="middle" fontSize={9} fill="#64748b">
          today
        </text>

        {/* History line (solid emerald) */}
        {history.length > 0 && (
          <polyline points={historyPts} fill="none" stroke="#10b981" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* Forecast line (dashed indigo) */}
        {forecast.length > 0 && (
          <polyline
            points={forecastPts}
            fill="none"
            stroke="#6366f1"
            strokeWidth={2}
            strokeDasharray="6 4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* X endpoints */}
        <text x={PAD.left} y={height - 5} textAnchor="start" fontSize={9} fill="#94a3b8">
          −{history.length}d
        </text>
        <text x={width - PAD.right} y={height - 5} textAnchor="end" fontSize={9} fill="#94a3b8">
          +{forecast.length}d
        </text>
      </svg>

      {/* Legend */}
      <div className="mt-1 flex flex-wrap items-center gap-4 px-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-emerald-500" /> History
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-indigo-500" style={{ borderTop: '2px dashed #6366f1' }} /> Forecast
        </span>
        {typeof refLevel === 'number' && refLevel > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded bg-rose-500" /> Avg daily demand
          </span>
        )}
      </div>
    </div>
  );
};

export default ForecastChart;
