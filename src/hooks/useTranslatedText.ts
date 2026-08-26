import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { translateText } from '../lib/translate';

// Translate a single English string to the active UI language on the fly.
// Returns the original immediately (so text always renders), then swaps in the
// translation when it arrives. English is a no-op; failures keep the original.
export function useTranslatedText(text: string): string {
  const { i18n } = useTranslation();
  const lang = (i18n.language || 'en').split('-')[0].toLowerCase();
  const [out, setOut] = useState(text);

  useEffect(() => {
    let cancelled = false;
    if (lang === 'en' || !text || !text.trim()) {
      setOut(text);
      return;
    }
    setOut(text);
    translateText(text, lang).then((t) => { if (!cancelled) setOut(t); });
    return () => { cancelled = true; };
  }, [text, lang]);

  return out;
}
