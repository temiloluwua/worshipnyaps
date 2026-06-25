import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { BibleVersion } from '../lib/bibleLink';

export type FontFamily = 'default' | 'serif' | 'modern';
export type AccentColor = 'blue' | 'teal' | 'purple' | 'amber' | 'pink';

export interface UserPreferences {
  bibleVersion: BibleVersion;
  fontFamily: FontFamily;
  accent: AccentColor;
}

const DEFAULTS: UserPreferences = {
  bibleVersion: 'NIV',
  fontFamily: 'default',
  accent: 'blue',
};

// CSS variable values per accent. Applied to :root so any inline style or
// custom utility class that references --wny-accent picks them up.
const ACCENT_VARS: Record<AccentColor, { color: string; hover: string }> = {
  blue:   { color: '#2563eb', hover: '#1d4ed8' },
  teal:   { color: '#14b8a6', hover: '#0d9488' },
  purple: { color: '#a855f7', hover: '#9333ea' },
  amber:  { color: '#f59e0b', hover: '#d97706' },
  pink:   { color: '#ec4899', hover: '#db2777' },
};

const ACCENT_CLASSES: Record<AccentColor, string> = {
  blue:   '',
  teal:   'wny-accent-teal',
  purple: 'wny-accent-purple',
  amber:  'wny-accent-amber',
  pink:   'wny-accent-pink',
};

// Body classes per font preference. Tailwind/global CSS targets `.wny-font-serif`
// and `.wny-font-modern` (see index.css). Default leaves the body alone.
const FONT_CLASSES: Record<FontFamily, string> = {
  default: '',
  serif:   'wny-font-serif',
  modern:  'wny-font-modern',
};

function readFromStorage(key: string): UserPreferences {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function applyToRoot(prefs: UserPreferences) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const accent = ACCENT_VARS[prefs.accent];
  root.style.setProperty('--wny-accent', accent.color);
  root.style.setProperty('--wny-accent-hover', accent.hover);
  // Strip any previous font class, then set the current one.
  root.classList.remove('wny-font-serif', 'wny-font-modern');
  const fontCls = FONT_CLASSES[prefs.fontFamily];
  if (fontCls) root.classList.add(fontCls);
  // Strip any previous accent class, then set the current one. The CSS in
  // index.css remaps Tailwind's blue utility classes (bg-blue-600, etc.)
  // through CSS variables that flip when this class changes.
  root.classList.remove('wny-accent-teal', 'wny-accent-purple', 'wny-accent-amber', 'wny-accent-pink');
  const accentCls = ACCENT_CLASSES[prefs.accent];
  if (accentCls) root.classList.add(accentCls);
}

export function usePreferences() {
  const { user } = useAuth();
  const key = `wny_prefs_${user?.id ?? 'guest'}`;
  const [prefs, setPrefs] = useState<UserPreferences>(() => readFromStorage(key));

  // Re-load when user changes (sign-in/out) so a different user sees their
  // own saved prefs (or defaults).
  useEffect(() => {
    const next = readFromStorage(key);
    setPrefs(next);
    applyToRoot(next);
  }, [key]);

  // Apply on first mount too.
  useEffect(() => { applyToRoot(prefs); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback((patch: Partial<UserPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
      applyToRoot(next);
      return next;
    });
  }, [key]);

  return { prefs, update };
}
