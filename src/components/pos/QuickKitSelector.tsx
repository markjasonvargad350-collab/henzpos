import React from 'react';
import { Layers, Plus, Sparkles, Check } from 'lucide-react';
import { usePOS } from '../../context/POSContext';

export const QuickKitSelector: React.FC = () => {
  const { presetKits, loadPresetKitIntoCart } = usePOS();
  const [justAddedKitId, setJustAddedKitId] = React.useState<string | null>(null);

  const handleAddKit = (kitId: string) => {
    loadPresetKitIntoCart(kitId);
    setJustAddedKitId(kitId);
    setTimeout(() => setJustAddedKitId(null), 1500);
  };

  if (!presetKits || presetKits.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Quick 1-Click Student & Duty Bundles
          </h3>
        </div>
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          {presetKits.length} Presets Available
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {presetKits.map((kit) => {
          const isAdded = justAddedKitId === kit.id;
          return (
            <button
              key={kit.id}
              onClick={() => handleAddKit(kit.id)}
              className={`text-left p-2.5 rounded-lg border transition-all flex flex-col justify-between cursor-pointer ${
                isAdded
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/30'
                  : 'bg-slate-50 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xs font-bold text-slate-900 line-clamp-1">
                    {kit.name}
                  </span>
                  {kit.discountPercentage && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded border border-emerald-200 shrink-0">
                      -{kit.discountPercentage}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {kit.targetAudience}
                </p>
              </div>

              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/80 text-[11px]">
                <span className="text-slate-500">{kit.items.length} items bundle</span>
                <span
                  className={`flex items-center gap-0.5 font-bold ${
                    isAdded ? 'text-emerald-700' : 'text-emerald-600 hover:text-emerald-700'
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Loaded!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Kit</span>
                    </>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
