import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  MapPin,
  Clock,
  Phone,
  User,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Truck,
  Store,
} from 'lucide-react';
import {
  StoreGeneralSettings,
  getStoreSettings,
  saveStoreSettings,
} from '../../utils/branchSettings';
import { soundEffects } from '../../utils/audio';

interface BranchSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BranchSettingsModal: React.FC<BranchSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<StoreGeneralSettings>(getStoreSettings);
  const [activeBranchKey, setActiveBranchKey] = useState<'main' | 'usa'>('main');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getStoreSettings());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoreSettings(settings);
    soundEffects.playBeepSuccess();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const branch = settings.branches[activeBranchKey];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/10 border border-teal-500/30 rounded-xl text-teal-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Store & Branch Profile Manager
                <span className="text-[10px] bg-teal-500/20 text-teal-300 font-mono px-2 py-0.5 rounded-full">
                  Iloilo Central Network
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Manage branch operating schedules, pickup instructions, hotlines, & tax metadata
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Branch Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveBranchKey('main')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeBranchKey === 'main'
                ? 'border-teal-400 text-teal-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Main Branch (Casa Conching)
          </button>
          <button
            onClick={() => setActiveBranchKey('usa')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeBranchKey === 'usa'
                ? 'border-teal-400 text-teal-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            USA Branch (San Agustin Gate 5)
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Branch Details */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> {branch.shortName} Location & Hours
            </h4>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Full Location Address</label>
              <input
                type="text"
                value={branch.address}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    branches: {
                      ...settings.branches,
                      [activeBranchKey]: { ...branch, address: e.target.value },
                    },
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Operating Hours</label>
                <input
                  type="text"
                  value={branch.operatingHours}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branches: {
                        ...settings.branches,
                        [activeBranchKey]: { ...branch, operatingHours: e.target.value },
                      },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Branch Hotline</label>
                <input
                  type="text"
                  value={branch.contactNumber}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      branches: {
                        ...settings.branches,
                        [activeBranchKey]: { ...branch, contactNumber: e.target.value },
                      },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Customer Pre-Order Pickup Instructions (Shown on Student Checklist)
              </label>
              <textarea
                rows={2}
                value={branch.pickupInstructions}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    branches: {
                      ...settings.branches,
                      [activeBranchKey]: { ...branch, pickupInstructions: e.target.value },
                    },
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-teal-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Store-wide Legal & Regulatory Meta */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Corporate & Regulatory Info (Receipts & Invoices)
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">BIR Registered TIN</label>
                <input
                  type="text"
                  value={settings.tinNumber}
                  onChange={(e) => setSettings({ ...settings, tinNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">FDA LTO / CDRRHR Reg.</label>
                <input
                  type="text"
                  value={settings.fdaLtoNumber}
                  onChange={(e) => setSettings({ ...settings, fdaLtoNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Central Warehouse Location</label>
              <input
                type="text"
                value={settings.warehouseLocation}
                onChange={(e) => setSettings({ ...settings, warehouseLocation: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-2">
            {saveSuccess ? (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Branch Settings Saved!
              </span>
            ) : (
              <span></span>
            )}

            <button
              type="submit"
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-teal-500/20"
            >
              Save Branch Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
