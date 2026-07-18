import React from 'react'
import ReactDOM from 'react-dom/client'
import { App as CapacitorApp } from '@capacitor/app'
import App from './App'
import './index.css'
import './i18n'
import { Toaster } from 'react-hot-toast'
import { initSentry, sentryEnabled, Sentry } from './lib/sentry'
import { RootErrorBoundary } from './components/RootErrorBoundary'

// Init Sentry in a try/catch — a busted DSN or network hiccup during
// startup shouldn't take down the whole app render.
try {
  initSentry()
} catch (e) {
  console.error('[main] initSentry failed:', e)
}

// Surface uncaught errors + promise rejections in the console so App Store
// review logs can be diagnosed. Without these, a bad JS eval in production
// leaves no trace.
window.addEventListener('error', (e) => {
  console.error('[window.onerror]', e.message, e.error);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[unhandledrejection]', e.reason);
});

CapacitorApp.addListener('backButton', () => {
  const modal = document.querySelector('div[role="dialog"]')
  if (modal) {
    modal.remove()
  } else {
    CapacitorApp.exitApp()
  }
})

const AppTree = (
  <>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 2000,
        style: { background: '#363636', color: '#fff' },
        success: { duration: 2000, iconTheme: { primary: '#4ade80', secondary: '#fff' } },
        error: { duration: 2500, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
      }}
    />
  </>
)

// Branded splash handling. The splash stays up through the whole load — App
// calls window.__removeAppSplash() only once it's ready to paint real content,
// so there is never a white gap between "splash gone" and "app painted".
const removeSplash = () => {
  const splash = document.getElementById('app-splash');
  if (!splash) return;
  splash.classList.add('app-splash--hide');
  window.setTimeout(() => splash.remove(), 400);
};
(window as unknown as { __removeAppSplash?: () => void }).__removeAppSplash = removeSplash;

const rootEl = document.getElementById('root');

// Mark that React actually committed DOM to #root. This distinguishes a real
// bundle failure (script never executed → this never fires → show Reload) from
// a merely slow load (React mounted, still fetching → keep the branded splash).
if (rootEl) {
  const mo = new MutationObserver(() => {
    if (rootEl.childElementCount > 0) {
      (window as unknown as { __reactMounted?: boolean }).__reactMounted = true;
      mo.disconnect();
    }
  });
  mo.observe(rootEl, { childList: true });
}

if (!rootEl) {
  // No #root — hydrate a visible message instead of the previous non-null
  // assertion that would silently throw. Extremely unlikely, but shipped as
  // a safety net.
  document.body.innerHTML =
    '<div style="padding:24px;font-family:system-ui;text-align:center">App failed to mount. Please reload.</div>';
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <RootErrorBoundary>
        {sentryEnabled ? (
          <Sentry.ErrorBoundary
            fallback={
              <div style={{ padding: 24, fontFamily: 'system-ui' }}>Something went wrong. Please reload the app.</div>
            }
          >
            {AppTree}
          </Sentry.ErrorBoundary>
        ) : (
          AppTree
        )}
      </RootErrorBoundary>
    </React.StrictMode>,
  );
}
