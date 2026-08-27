/**
 * DemandForecast — the admin "Demand Forecast" tab: the ML demand-forecasting +
 * reorder-recommendation half of the research system.
 *
 * It feeds either REAL sales (the live, BIR-clean `transactions`) or an ISOLATED
 * in-memory SAMPLE dataset through the SAME pure pipeline (forecasting.ts /
 * reorder.ts). The sample data is never persisted — see sampleSalesHistory.ts.
 * Nothing in this component writes to Firestore.
 */
import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  FlaskConical,
  Database,
  FileSpreadsheet,
  CalendarClock,
  Info,
  PackageCheck,
  Boxes,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import type { DemandForecastResult, Product, ReorderRecommendation, Urgency } from '../../types';
import { branchKeyFor, branchShortLabel } from '../../lib/branches';
import {
  buildDemandIndex,
  committedPreOrderQty,
  forecastDemand,
  seriesFromDayMap,
  type DemandSeries,
  type ForecastOptions,
} from '../../lib/forecasting';
import {
  DEFAULT_LEAD_TIME_DAYS,
  DEFAULT_REVIEW_PERIOD_DAYS,
  recommendReorder,
  type ReorderSettings,
} from '../../lib/reorder';
import { generateSampleTransactions, SAMPLE_DATA_NOTE, SAMPLE_PARAMS } from '../../data/sampleSalesHistory';
import { buildCsv, downloadCsv } from '../../utils/exportCsv';
import ForecastChart from './ForecastChart';
import Sparkline from './Sparkline';

type DataSource = 'real' | 'sample';

interface ForecastRow {
  product: Product;
  series: DemandSeries;
  forecast: DemandForecastResult;
  rec: ReorderRecommendation;
}

const URGENCY_RANK: Record<Urgency, number> = { critical: 0, high: 1, medium: 2, ok: 3 };

const URGENCY_STYLE: Record<Urgency, { chip: string; label: string }> = {
  critical: { chip: 'bg-rose-100 text-rose-700 border-rose-200', label: 'Critical' },
  high: { chip: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Reorder now' },
  medium: { chip: 'bg-sky-100 text-sky-700 border-sky-200', label: 'Watch' },
  ok: { chip: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'OK' },
};

const CONFIDENCE_STYLE: Record<DemandForecastResult['confidence'], string> = {
  none: 'bg-slate-100 text-slate-500 border-slate-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  high: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const LOOKBACK_DAYS = 90;

function fmtNum(n: number, digits = 1): string {
  return Number.isFinite(n) ? n.toFixed(digits) : '—';
}
function fmtPct(v: number | null): string {
  return v === null ? '—' : `${(v * 100).toFixed(0)}%`;
}

export const DemandForecast: React.FC = () => {
  const { products, transactions, preOrders, activeBranch, isJulyPeakSeasonMode } = usePOS();

  const [dataSource, setDataSource] = useState<DataSource>('real');
  const [leadTimeDays, setLeadTimeDays] = useState<number>(DEFAULT_LEAD_TIME_DAYS);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Stable "now" so memoized forecasts don't churn every render.
  const asOf = useMemo(() => new Date(), []);

  // Isolated sample transactions (in-memory only) — regenerated only if the
  // catalogue changes. NEVER written anywhere.
  const sampleTransactions = useMemo(
    () => generateSampleTransactions(products, { asOf }),
    [products, asOf],
  );

  const effectiveTransactions = dataSource === 'sample' ? sampleTransactions : transactions;

  const forecastOpts: ForecastOptions = useMemo(
    () => ({
      asOf,
      lookbackDays: LOOKBACK_DAYS,
      horizonDays: 14,
      isPeakSeason: isJulyPeakSeasonMode,
    }),
    [asOf, isJulyPeakSeasonMode],
  );

  const settings: ReorderSettings = useMemo(() => ({ leadTimeDays }), [leadTimeDays]);

  // One index pass → per-product series + forecast + recommendation.
  const rows: ForecastRow[] = useMemo(() => {
    const index = buildDemandIndex(effectiveTransactions, activeBranch);
    const built = products.map((product) => {
      const dayMap = index.get(product.id) ?? new Map<string, number>();
      const series = seriesFromDayMap(dayMap, product.id, activeBranch, asOf, LOOKBACK_DAYS);
      const forecast = forecastDemand(series, forecastOpts);
      const committed = committedPreOrderQty(preOrders, product.id, activeBranch);
      const rec = recommendReorder(product, activeBranch, forecast, committed, settings, asOf);
      return { product, series, forecast, rec };
    });
    built.sort((a, b) => {
      const byUrgency = URGENCY_RANK[a.rec.urgency] - URGENCY_RANK[b.rec.urgency];
      if (byUrgency !== 0) return byUrgency;
      return b.rec.suggestedOrderQty - a.rec.suggestedOrderQty;
    });
    return built;
  }, [effectiveTransactions, products, preOrders, activeBranch, asOf, forecastOpts, settings]);

  // KPIs
  const needReorder = rows.filter((r) => r.rec.urgency === 'critical' || r.rec.urgency === 'high').length;
  const totalSuggestedUnits = rows.reduce((sum, r) => sum + r.rec.suggestedOrderQty, 0);
  const expiryRisks = rows.filter((r) => r.rec.expiryRisk).length;
  const scored = rows.filter((r) => r.forecast.accuracy.mape !== null);
  const avgMape =
    scored.length > 0 ? scored.reduce((s, r) => s + (r.forecast.accuracy.mape ?? 0), 0) / scored.length : null;

  // Selected product for the chart (default: first meaningful row).
  const selectedRow: ForecastRow | null = useMemo(() => {
    if (rows.length === 0) return null;
    if (selectedProductId) {
      const found = rows.find((r) => r.product.id === selectedProductId);
      if (found) return found;
    }
    return rows.find((r) => r.forecast.method !== 'none') ?? rows[0];
  }, [rows, selectedProductId]);

  const branchLabel = branchShortLabel[branchKeyFor(activeBranch)];
  const isSample = dataSource === 'sample';
  const realIsEmpty = dataSource === 'real' && transactions.length === 0;

  const filePrefix = isSample ? 'SAMPLE_' : '';
  const dateTag = asOf.toISOString().slice(0, 10);

  const handleExportReorderCsv = () => {
    const headers = [
      'Product', 'SKU', 'Branch', 'On hand', 'Daily demand', 'Days of cover',
      'Reorder point', 'Order-up-to', 'Safety stock', 'Suggested qty',
      'Committed pre-orders', 'Urgency', 'Order by', 'Method', 'Expiry risk', 'Reason',
    ];
    const csvRows = rows.map((r) => [
      r.rec.productName, r.rec.sku, branchLabel, r.rec.onHand, fmtNum(r.rec.dailyDemand, 2),
      r.rec.daysOfCover === null ? '' : fmtNum(r.rec.daysOfCover, 1),
      fmtNum(r.rec.reorderPoint, 1), fmtNum(r.rec.orderUpToLevel, 1), fmtNum(r.rec.safetyStock, 1),
      r.rec.suggestedOrderQty, r.rec.committedPreOrderQty, r.rec.urgency, r.rec.orderByDate ?? '',
      r.rec.method, r.rec.expiryRisk ? 'YES' : '', r.rec.reason,
    ]);
    downloadCsv(`${filePrefix}HENZ_Reorder_Plan_${branchLabel.replace(/\W+/g, '')}_${dateTag}.csv`, buildCsv(headers, csvRows));
  };

  const handleExportMetricsCsv = () => {
    const headers = [
      'Product', 'SKU', 'Branch', 'Method', 'Alpha', 'Beta', 'Window',
      'Observed days', 'Sale days', 'Daily rate', 'Daily std dev',
      'MAE', 'RMSE', 'MAPE %', 'Holdout n', 'Confidence', 'Seasonal factor',
    ];
    const csvRows = rows.map((r) => [
      r.product.name, r.product.sku, branchLabel, r.forecast.method,
      r.forecast.params.alpha ?? '', r.forecast.params.beta ?? '', r.forecast.params.window ?? '',
      r.forecast.dataDays, r.series.nonZeroDays, fmtNum(r.forecast.dailyRate, 3), fmtNum(r.forecast.dailyStdDev, 3),
      fmtNum(r.forecast.accuracy.mae, 3), fmtNum(r.forecast.accuracy.rmse, 3),
      r.forecast.accuracy.mape === null ? '' : (r.forecast.accuracy.mape * 100).toFixed(1),
      r.forecast.accuracy.n, r.forecast.confidence, r.forecast.seasonalFactor,
    ]);
    downloadCsv(`${filePrefix}HENZ_Forecast_Metrics_${branchLabel.replace(/\W+/g, '')}_${dateTag}.csv`, buildCsv(headers, csvRows));
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 text-slate-800">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl border border-indigo-200">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              Demand Forecast & Reorder Recommendation
            </h2>
            <p className="text-xs text-slate-500">
              Exponential-smoothing demand forecast → forecast-driven reorder plan • {branchLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Data source toggle */}
          <div className="flex items-center bg-slate-50 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setDataSource('real')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                dataSource === 'real' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Database className="w-3.5 h-3.5" /> Real sales
            </button>
            <button
              onClick={() => setDataSource('sample')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                dataSource === 'sample' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" /> Sample data
            </button>
          </div>

          <button
            onClick={handleExportReorderCsv}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> Reorder CSV
          </button>
          <button
            onClick={handleExportMetricsCsv}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Per-product MAE / RMSE / MAPE — model-validation table for the paper"
          >
            <FileSpreadsheet className="w-4 h-4" /> Metrics CSV
          </button>
        </div>
      </div>

      {/* Sample-data banner */}
      {isSample && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 flex items-start gap-2.5 text-sm">
          <FlaskConical className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <span className="font-bold">{SAMPLE_DATA_NOTE}</span>
            <p className="text-xs text-amber-700 mt-0.5">
              A seeded, reproducible simulation ({SAMPLE_PARAMS.historyDays} days) used to demonstrate the forecast while
              real sales accumulate. It lives only in this screen's memory.
            </p>
          </div>
        </div>
      )}

      {/* Real-but-empty hint */}
      {realIsEmpty && (
        <div className="bg-slate-50 border border-slate-200 text-slate-600 rounded-xl px-4 py-3 flex items-start gap-2.5 text-sm">
          <Info className="w-5 h-5 shrink-0 mt-0.5 text-slate-400" />
          <div>
            <span className="font-bold text-slate-700">No real sales recorded yet.</span>
            <p className="text-xs text-slate-500 mt-0.5">
              The forecast learns from sales history; the reorder plan below is using the min-stock rule as a
              cold-start fallback. Switch to <span className="font-semibold">Sample data</span> to preview how the
              forecast behaves once sales accumulate.
            </p>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Needs Reorder"
          value={`${needReorder}`}
          sub={`${products.length} products tracked`}
          tone="amber"
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
        />
        <KpiCard
          label="Suggested Units"
          value={totalSuggestedUnits.toLocaleString()}
          sub="Across all recommendations"
          tone="indigo"
          icon={<PackageCheck className="w-4 h-4 text-indigo-600" />}
        />
        <KpiCard
          label="Expiry-Risk Items"
          value={`${expiryRisks}`}
          sub="Short shelf-life, capped"
          tone="rose"
          icon={<CalendarClock className="w-4 h-4 text-rose-600" />}
        />
        <KpiCard
          label="Avg Forecast Error"
          value={fmtPct(avgMape)}
          sub={`MAPE over ${scored.length} scored products`}
          tone="emerald"
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
        />
      </div>

      {/* Controls row: lead time + seasonality */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <label htmlFor="leadTime" className="text-xs font-semibold text-slate-600">
            Assumed supplier lead time
          </label>
          <div className="flex items-center gap-1.5">
            <input
              id="leadTime"
              type="number"
              min={1}
              max={90}
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(Math.max(1, Math.min(90, Number(e.target.value) || DEFAULT_LEAD_TIME_DAYS)))}
              className="w-16 px-2 py-1 text-xs bg-white text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono text-center"
            />
            <span className="text-xs text-slate-500">days</span>
          </div>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Info className="w-3 h-3" /> an assumption — no supplier lead-time data exists in the catalogue
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-600">School-opening season:</span>
          <span
            className={`px-2 py-0.5 rounded-full border font-bold ${
              isJulyPeakSeasonMode
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            {isJulyPeakSeasonMode ? 'ON (peak multiplier active in Jun–Aug)' : 'OFF'}
          </span>
        </div>
      </div>

      {/* Selected-product forecast chart */}
      {selectedRow && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Boxes className="w-5 h-5 text-indigo-500 shrink-0" />
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">{selectedRow.product.name}</h3>
                <p className="text-[11px] text-slate-500">{selectedRow.forecast.note}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className={`px-2 py-0.5 rounded-full border font-bold ${CONFIDENCE_STYLE[selectedRow.forecast.confidence]}`}>
                {selectedRow.forecast.confidence} confidence
              </span>
              {typeof selectedRow.forecast.params.alpha === 'number' && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                  α={selectedRow.forecast.params.alpha}
                  {typeof selectedRow.forecast.params.beta === 'number' ? `, β=${selectedRow.forecast.params.beta}` : ''}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                MAE {fmtNum(selectedRow.forecast.accuracy.mae, 2)} · RMSE {fmtNum(selectedRow.forecast.accuracy.rmse, 2)} · MAPE {fmtPct(selectedRow.forecast.accuracy.mape)}
              </span>
            </div>
          </div>

          <ForecastChart
            history={selectedRow.series.points.map((p) => p.qty)}
            forecast={selectedRow.forecast.horizon}
            refLevel={selectedRow.forecast.dailyRate}
            refLabel="avg/day"
          />
        </div>
      )}

      {/* Reorder recommendation table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Reorder Recommendations ({rows.length})
          </h3>
          <span className="text-xs text-slate-500 font-medium">Most urgent first • click a row to chart it</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3 text-center">Trend</th>
                <th className="py-2.5 px-3 text-center">On hand</th>
                <th className="py-2.5 px-3 text-center">Demand/day</th>
                <th className="py-2.5 px-3 text-center">Cover</th>
                <th className="py-2.5 px-3 text-center">ROP</th>
                <th className="py-2.5 px-3 text-center">Order</th>
                <th className="py-2.5 px-3 text-center">Urgency</th>
                <th className="py-2.5 px-3">Why</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((r) => {
                const isSelected = selectedRow?.product.id === r.product.id;
                return (
                  <tr
                    key={r.product.id}
                    onClick={() => setSelectedProductId(r.product.id)}
                    className={`cursor-pointer transition ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-100'}`}
                  >
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 truncate max-w-[180px]">{r.product.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {r.product.sku}
                        {r.rec.committedPreOrderQty > 0 && (
                          <span className="ml-1 text-indigo-600">• {r.rec.committedPreOrderQty} pre-ordered</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex justify-center">
                        <Sparkline values={r.series.points.slice(-30).map((p) => p.qty)} />
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700">{r.rec.onHand}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-700">{fmtNum(r.rec.dailyDemand, 2)}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-700">
                      {r.rec.daysOfCover === null ? '—' : `${Math.floor(r.rec.daysOfCover)}d`}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-500">{fmtNum(r.rec.reorderPoint, 0)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-mono font-bold ${r.rec.suggestedOrderQty > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {r.rec.suggestedOrderQty > 0 ? `+${r.rec.suggestedOrderQty}` : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${URGENCY_STYLE[r.rec.urgency].chip}`}>
                        {URGENCY_STYLE[r.rec.urgency].label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px] max-w-[280px]">{r.rec.reason}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-sm">
                    No products to forecast.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-slate-400 pt-1">
          Method: Exponential Smoothing (Holt-Winters / ETS family). Reorder point = demand×lead-time + safety stock
          (z=1.65 ≈ 95% service); order-up-to covers lead time + {DEFAULT_REVIEW_PERIOD_DAYS}-day review period. See
          docs/METHODOLOGY.md.
        </p>
      </div>
    </div>
  );
};

// Small internal KPI card, matching the ReportsView card styling.
const KpiCard: React.FC<{
  label: string;
  value: string;
  sub: string;
  tone: 'amber' | 'indigo' | 'rose' | 'emerald';
  icon: React.ReactNode;
}> = ({ label, value, sub, tone, icon }) => {
  const toneText: Record<string, string> = {
    amber: 'text-amber-600',
    indigo: 'text-indigo-600',
    rose: 'text-rose-600',
    emerald: 'text-emerald-600',
  };
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        {icon}
      </div>
      <div className={`text-2xl font-extrabold mt-1 font-mono ${toneText[tone]}`}>{value}</div>
      <span className="text-[11px] text-slate-500">{sub}</span>
    </div>
  );
};

export default DemandForecast;
