// On-the-fly content translation for user-visible strings that live in the
// database in English (topic cards, etc.). i18n handles static UI strings;
// this handles dynamic content.
//
// Cost model — free and sustainable:
//   L1  in-memory + localStorage (per device)
//   L2  Supabase `content_translations` (shared across all users, forever)
//   L3  free provider (Google's keyless `gtx` endpoint) — hit at most once per
//       unique phrase ever, since the result is written back to L2.
// Every layer degrades gracefully: any failure falls back to the original
// English text, so the card always renders. To move to a paid/official
// provider later, swap only `fetchTranslation`.

import { supabase } from './supabase';

type Lang = string;

const memCache = new Map<string, string>();
const LS_KEY = 'wny_tx_cache_v1';
let lsLoaded = false;

function normalizeLang(lang: Lang): Lang {
  return (lang || 'en').split('-')[0].toLowerCase();
}

function key(lang: Lang, text: string): string {
  return `${lang}::${text}`;
}

function loadLsCache(): void {
  if (lsLoaded) return;
  lsLoaded = true;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, string>;
      for (const k in obj) memCache.set(k, obj[k]);
    }
  } catch { /* ignore corrupt/absent cache */ }
}

let persistTimer: number | undefined;
function persistLsCache(): void {
  // Debounced so a burst of translations writes once. Cap the stored size so
  // the cache can't grow unbounded in localStorage.
  if (persistTimer) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    try {
      const entries = Array.from(memCache.entries()).slice(-2000);
      localStorage.setItem(LS_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch { /* storage full / unavailable — fine, memory cache still works */ }
  }, 500);
}

async function fetchTranslation(text: string, targetLang: Lang): Promise<string> {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' +
    encodeURIComponent(targetLang) +
    '&dt=t&q=' +
    encodeURIComponent(text);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`translate ${res.status}`);
  const data = await res.json();
  // Response shape: [[[ "translated", "original", ... ], ...], ...]
  const segments: string = Array.isArray(data?.[0])
    ? data[0].map((seg: unknown[]) => (Array.isArray(seg) ? seg[0] : '')).join('')
    : '';
  return segments || text;
}

// L2: shared Supabase cache. Reads are public; a hit means no provider call.
async function fetchFromDbCache(text: string, lang: Lang): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('content_translations')
      .select('translated_text')
      .eq('lang', lang)
      .eq('source_text', text)
      .maybeSingle();
    if (error) return null;
    return (data as { translated_text?: string } | null)?.translated_text ?? null;
  } catch {
    return null;
  }
}

// Persist a provider result to the shared cache so every other user/device
// gets it free next time. Ignores conflicts (another client may have raced us).
async function writeToDbCache(text: string, lang: Lang, translated: string): Promise<void> {
  try {
    await supabase
      .from('content_translations')
      .upsert({ lang, source_text: text, translated_text: translated }, { onConflict: 'lang,source_text', ignoreDuplicates: true });
  } catch { /* cache write is best-effort */ }
}

function remember(k: string, translated: string): void {
  memCache.set(k, translated);
  persistLsCache();
}

// Translate a single string. English (or empty) is a no-op. Never throws —
// returns the original text if translation fails.
export async function translateText(text: string, targetLang: Lang): Promise<string> {
  const lang = normalizeLang(targetLang);
  if (!text || lang === 'en') return text;
  loadLsCache();
  const k = key(lang, text);

  // L1: local
  const cached = memCache.get(k);
  if (cached !== undefined) return cached;

  // L2: shared DB cache
  const fromDb = await fetchFromDbCache(text, lang);
  if (fromDb !== null) {
    remember(k, fromDb);
    return fromDb;
  }

  // L3: free provider, then populate the shared cache
  try {
    const translated = await fetchTranslation(text, lang);
    remember(k, translated);
    if (translated && translated !== text) void writeToDbCache(text, lang, translated);
    return translated;
  } catch {
    return text;
  }
}

// Translate several strings, preserving order. Falls back per-item.
export async function translateMany(texts: string[], targetLang: Lang): Promise<string[]> {
  const lang = normalizeLang(targetLang);
  if (lang === 'en') return texts;
  return Promise.all(texts.map((t) => translateText(t, lang)));
}
