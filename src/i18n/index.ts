import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

const STORAGE_KEY = 'wny_language';

// Some WKWebView storage states throw on any localStorage access. Detect that
// once so we can drop the localStorage detector/cache instead of letting an
// init-time throw take down the whole app launch (App Store review saw the app
// fail to finish loading — an unguarded storage throw here is one way that
// happens).
const localStorageWorks = (() => {
  try {
    const k = '__wny_ls_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
})();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: localStorageWorks
      ? {
          order: ['localStorage', 'navigator'],
          lookupLocalStorage: STORAGE_KEY,
          caches: ['localStorage'],
        }
      : {
          // No usable localStorage — detect from the browser only, cache nothing.
          order: ['navigator'],
          caches: [],
        },
  });

export default i18n;
export { STORAGE_KEY };
