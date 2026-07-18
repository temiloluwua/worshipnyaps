import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { SplashScreen } from '@capacitor/splash-screen'
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

// Reveal the app once React has actually painted its first screen: hide the
// native splash (iOS/Android) and remove the branded HTML splash together, so
// the blue splash covers the entire cold-start window with no white gap.
let revealed = false;
const revealApp = () => {
  if (revealed) return;
  revealed = true;
  if (Capacitor.isNativePlatform()) {
    SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
  }
  const splash = document.getElementById('app-splash');
  if (splash) {
    splash.classList.add('app-splash--hide');
    window.setTimeout(() => splash.remove(), 400);
  }
};

const rootEl = document.getElementById('root');

// Reveal as soon as React commits its first DOM into #root, then wait one paint
// frame so the content is actually on-screen before the splash fades. Setting
// __reactMounted also lets the HTML failsafe tell a real bundle failure (never
// mounts → show Reload) from a merely slow load.
if (rootEl) {
  const mo = new MutationObserver(() => {
    if (rootEl.childElementCount > 0) {
      (window as unknown as { __reactMounted?: boolean }).__reactMounted = true;
      mo.disconnect();
      requestAnimationFrame(() => requestAnimationFrame(revealApp));
    }
  });
  mo.observe(rootEl, { childList: true });
}

// Failsafe: never keep the splash up longer than this even if something above
// misfires. The native launchShowDuration is a second, independent backstop.
window.setTimeout(revealApp, 7000);

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
