/**
 * Henz Healthcare POS & Portal Theme Engine
 */

export type AppTheme = 'medical-teal' | 'royal-blue' | 'hospital-emerald' | 'charcoal-dark' | 'clinical-light';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  badge: string;
  primaryColor: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  tagColor: string;
  description: string;
}

export const AVAILABLE_THEMES: ThemeConfig[] = [
  {
    id: 'medical-teal',
    name: 'Medical Teal (Default)',
    badge: 'Clinical Cyan',
    primaryColor: '#14b8a6',
    accentBg: 'bg-teal-500',
    accentText: 'text-teal-400',
    accentBorder: 'border-teal-500/40',
    tagColor: 'bg-teal-950/80 text-teal-300 border-teal-500/40',
    description: 'High-contrast medical cyan and deep slate for optimal screen clarity.',
  },
  {
    id: 'royal-blue',
    name: 'Clinical Royal Blue',
    badge: 'Cobalt Navy',
    primaryColor: '#3b82f6',
    accentBg: 'bg-blue-600',
    accentText: 'text-blue-400',
    accentBorder: 'border-blue-500/40',
    tagColor: 'bg-blue-950/80 text-blue-300 border-blue-500/40',
    description: 'Surgical royal navy with vivid cobalt highlights.',
  },
  {
    id: 'hospital-emerald',
    name: 'Hospital Emerald',
    badge: 'Vital Green',
    primaryColor: '#10b981',
    accentBg: 'bg-emerald-600',
    accentText: 'text-emerald-400',
    accentBorder: 'border-emerald-500/40',
    tagColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    description: 'Pharmacy emerald green with soothing mint tones.',
  },
  {
    id: 'charcoal-dark',
    name: 'Obsidian Amber',
    badge: 'Night Shift',
    primaryColor: '#f59e0b',
    accentBg: 'bg-amber-500',
    accentText: 'text-amber-400',
    accentBorder: 'border-amber-500/40',
    tagColor: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    description: 'Deep obsidian night-shift mode with amber warning accents.',
  },
  {
    id: 'clinical-light',
    name: 'High-Contrast Clean White',
    badge: 'Daylight Mode',
    primaryColor: '#0d9488',
    accentBg: 'bg-teal-700',
    accentText: 'text-teal-600',
    accentBorder: 'border-slate-300',
    tagColor: 'bg-slate-100 text-teal-800 border-slate-300',
    description: 'Bright daylight layout with ultra-sharp text and borders.',
  },
];

const THEME_STORAGE_KEY = 'henz_theme_preference_v1';

export function getSavedTheme(): AppTheme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme;
    if (saved && AVAILABLE_THEMES.some((t) => t.id === saved)) {
      return saved;
    }
  } catch {}
  return 'medical-teal';
}

export function saveTheme(theme: AppTheme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  } catch {}
}
