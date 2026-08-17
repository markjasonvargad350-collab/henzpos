import React from 'react';
import { X, Palette, CheckCircle2, Sparkles, SunMedium, Moon, Droplets } from 'lucide-react';
import {
  AppTheme,
  AVAILABLE_THEMES,
  getSavedTheme,
  saveTheme,
} from '../../utils/theme';
import { soundEffects } from '../../utils/audio';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: AppTheme;
  onThemeSelect: (theme: AppTheme) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeSelect,
}) => {
  if (!isOpen) return null;

  const handleSelect = (themeId: AppTheme) => {
    saveTheme(themeId);
    onThemeSelect(themeId);
    soundEffects.playClick();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/10 border border-teal-500/30 rounded-xl text-teal-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Color Palette & Theme Mode
              </h2>
              <p className="text-xs text-slate-400">
                Switch visual atmosphere for hospital environments and daylight shifts
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

        {/* Theme Grid */}
        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
          {AVAILABLE_THEMES.map((theme) => {
            const isSelected = currentTheme === theme.id;
            return (
              <div
                key={theme.id}
                onClick={() => handleSelect(theme.id)}
                className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between gap-4 ${
                  isSelected
                    ? 'border-teal-500 bg-slate-950/80 shadow-lg shadow-teal-500/10'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/60'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-8 h-8 rounded-lg shadow-inner flex items-center justify-center text-white"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{theme.name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300">
                        {theme.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{theme.description}</p>
                  </div>
                </div>

                {isSelected ? (
                  <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-700 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs transition cursor-pointer"
          >
            Apply Theme
          </button>
        </div>
      </div>
    </div>
  );
};
