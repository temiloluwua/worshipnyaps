// On-the-fly content translation for user-visible strings that live in the
// database in English (topic cards, etc.). i18n handles static UI strings;
// this handles dynamic content.
//
// Provider: Google's keyless `gtx` translate endpoint. It needs no API key or
// backend, so translation works out of the box. It's unofficial and rate
// limited, so every call degrades gracefully (returns the original text on any
// error) and results are cached hard (in-memory + localStorage) to keep calls
// to a minimum. To move to a paid/official provider later, swap the fetch in
// `fetchTranslation` for a call to a Supabase Edge Function proxy — the rest of
// this module (caching, batching, fallback) stays the same.

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

// Translate a single string. English (or empty) is a no-op. Never throws —
// returns the original text if translation fails.
export async function translateText(text: string, targetLang: Lang): Promise<string> {
  const lang = normalizeLang(targetLang);
  if (!text || lang === 'en') return text;
  loadLsCache();
  const k = key(lang, text);
  const cached = memCache.get(k);
  if (cached !== undefined) return cached;
  try {
    const translated = await fetchTranslation(text, lang);
    memCache.set(k, translated);
    persistLsCache();
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
