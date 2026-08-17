import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  Search,
  Filter,
  Flame,
  ArrowRight,
  Sparkles,
  Layers,
  FileCheck,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { Product, ShelfLifeType } from '../../types';

export const ExpiryTrackingView: React.FC = () => {
  const { products, addToCart, setActiveView } = usePOS();
  const [shelfFilter, setShelfFilter] = useState<'All' | ShelfLifeType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expiryTimelineFilter, setExpiryTimelineFilter] = useState<'All' | 'Critical' | 'Warning' | 'Good'>('All');

  const today = new Date();

  // Helper to calculate days until expiry
  const getExpiryStatus = (expiryDateStr: string) => {
    const exp = new Date(expiryDateStr);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'Expired', days: diffDays, color: 'bg-rose-600 text-white border-rose-500', level: 'Critical' };
    }
    if (diffDays <= 90) {
      return { status: 'Expiring in < 3 Mos', days: diffDays, color: 'bg-rose-950/60 text-rose-300 border-rose-500/50', level: 'Critical' };
    }
    if (diffDays <= 180) {
      return { status: 'Expiring in < 6 Mos', days: diffDays, color: 'bg-amber-950/60 text-amber-300 border-amber-500/50', level: 'Warning' };
    }
    return { status: 'Good Shelf Life', days: diffDays, color: 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40', level: 'Good' };
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.fdaRegistrationNo.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesShelf = shelfFilter === 'All' || p.shelfLifeType === shelfFilter;
    const expInfo = getExpiryStatus(p.expiryDate);
    const matchesTimeline = expiryTimelineFilter === 'All' || expInfo.level === expiryTimelineFilter;

    return matchesSearch && matchesShelf && matchesTimeline;
  });

  const shortShelfLifeCount = products.filter((p) => p.shelfLifeType === 'short').length;
  const longShelfLifeCount = products.filter((p) => p.shelfLifeType === 'long').length;

  const criticalExpiryCount = products.filter((p) => {
    const status = getExpiryStatus(p.expiryDate);
    return status.level === 'Critical';
  }).length;

  const warningExpiryCount = products.filter((p) => {
    const status = getExpiryStatus(p.expiryDate);
    return status.level === 'Warning';
  }).length;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 text-[#c9d1d9]">
      {/* Header Banner */}
      <div className="bg-[#161b22] p-5 rounded-2xl border border-[#30363d] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">
              Medical Shelf Life & FDA Expiry Monitoring (FEFO)
            </h2>
            <p className="text-xs text-gray-400">
              Short vs. Long shelf-life classification with First-Expired, First-Out clinical compliance
            </p>
          </div>
        </div>

        {/* FDA Compliance Badge */}
        <div className="flex items-center gap-2 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-500/30">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <span className="text-xs font-bold text-white block">FDA LTO / CPR Compliant</span>
            <span className="text-[10px] text-emerald-300">Batch & Expiry Traceability Active</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] shadow-sm">
          <span className="text-xs text-gray-400 font-medium">Short Shelf Life Items</span>
          <div className="text-2xl font-bold text-white mt-1">{shortShelfLifeCount} Products</div>
          <span className="text-[11px] text-gray-500">Steriles, Antiseptics, Consumables</span>
        </div>

        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] shadow-sm">
          <span className="text-xs text-gray-400 font-medium">Long Shelf Life Items</span>
          <div className="text-2xl font-bold text-white mt-1">{longShelfLifeCount} Products</div>
          <span className="text-[11px] text-gray-500">Stainless Instruments & Diagnostics</span>
        </div>

        <div className="bg-[#161b22] p-4 rounded-xl border border-rose-500/40 shadow-sm">
          <span className="text-xs text-rose-400 font-medium">Critical (Expiring ≤90 Days)</span>
          <div className="text-2xl font-bold text-rose-400 font-mono mt-1">{criticalExpiryCount} Batches</div>
          <span className="text-[11px] text-rose-300 font-semibold">Prioritize in POS Sales (FEFO)</span>
        </div>

        <div className="bg-[#161b22] p-4 rounded-xl border border-amber-500/40 shadow-sm">
          <span className="text-xs text-amber-400 font-medium">Watchlist (Expiring ≤180 Days)</span>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-1">{warningExpiryCount} Batches</div>
          <span className="text-[11px] text-amber-300">Stable inventory window</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#161b22] p-4 rounded-2xl border border-[#30363d] shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by supply name, batch no, FDA CPR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#0a0b0d] text-[#c9d1d9] border border-[#30363d] rounded-lg focus:outline-none focus:border-emerald-500 placeholder:text-gray-600 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Shelf Life Type Filter */}
          <div className="flex items-center bg-[#0d1117] p-0.5 rounded-lg border border-[#30363d]">
            <button
              onClick={() => setShelfFilter('All')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                shelfFilter === 'All'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setShelfFilter('short')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                shelfFilter === 'short'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Short Shelf Life
            </button>
            <button
              onClick={() => setShelfFilter('long')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                shelfFilter === 'long'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Long Shelf Life
            </button>
          </div>

          {/* Timeline Filter */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpiryTimelineFilter(expiryTimelineFilter === 'Critical' ? 'All' : 'Critical')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${
                expiryTimelineFilter === 'Critical'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950/40'
                  : 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:bg-rose-900/50'
              }`}
            >
              Critical
            </button>
            <button
              onClick={() => setExpiryTimelineFilter(expiryTimelineFilter === 'Warning' ? 'All' : 'Warning')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${
                expiryTimelineFilter === 'Warning'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-950/40'
                  : 'bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-amber-900/50'
              }`}
            >
              Warning
            </button>
          </div>
        </div>
      </div>

      {/* Expiry Tracking Table */}
      <div className="bg-[#161b22] rounded-2xl border border-[#30363d] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1117] border-b border-[#30363d] text-gray-400 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Product Name & Category</th>
                <th className="py-3 px-3">Shelf Life Type</th>
                <th className="py-3 px-3">FDA CPR No.</th>
                <th className="py-3 px-3">Batch / Lot #</th>
                <th className="py-3 px-3">Expiration Date</th>
                <th className="py-3 px-3 text-center">Remaining Stock</th>
                <th className="py-3 px-3">Expiry Risk Level</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d]">
              {filteredProducts.map((p) => {
                const expInfo = getExpiryStatus(p.expiryDate);
                const totalStock = p.stockMainBranch + p.stockUsaBranch;

                return (
                  <tr key={p.id} className="hover:bg-[#1a202c] transition">
                    {/* Name */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-white line-clamp-1">{p.name}</div>
                      <div className="text-[10px] text-gray-400">{p.category}</div>
                    </td>

                    {/* Shelf Life Type */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                          p.shelfLifeType === 'short'
                            ? 'bg-rose-950/50 text-rose-300 border-rose-500/30'
                            : 'bg-blue-950/50 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {p.shelfLifeType === 'short' ? 'Short Shelf Life' : 'Long Shelf Life'}
                      </span>
                    </td>

                    {/* FDA CPR */}
                    <td className="py-3 px-3 font-mono text-[11px] text-emerald-400">
                      {p.fdaRegistrationNo}
                    </td>

                    {/* Batch No */}
                    <td className="py-3 px-3 font-mono text-[11px] text-gray-300 font-bold">
                      {p.batchNumber}
                    </td>

                    {/* Expiration Date */}
                    <td className="py-3 px-3 font-mono text-xs font-bold text-white">
                      {p.expiryDate}
                    </td>

                    {/* Stock */}
                    <td className="py-3 px-3 text-center font-mono">
                      <span className="font-bold text-gray-200">{totalStock} units</span>
                      <span className="block text-[10px] text-gray-500">
                        ({p.stockMainBranch} Main / {p.stockUsaBranch} USA)
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold border ${expInfo.color}`}>
                        {expInfo.status} ({expInfo.days > 0 ? `${expInfo.days}d left` : 'Expired'})
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          addToCart(p, 1);
                          setActiveView('pos');
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-md shadow-emerald-950/40"
                        title="Add this batch to active POS cart for FEFO sale"
                      >
                        <span>Sell Batch</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
