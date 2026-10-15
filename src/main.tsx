import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import { Toaster } from 'react-hot-toast'
import { RootErrorBoundary } from './components/RootErrorBoundary'

// Surface uncaught errors + promise rejections in the console so App Store
// review logs can be diagnosed. Without these, a bad JS eval in production
// leaves no trace.
window.addEventListener('error', (e) => {
  console.error('[window.onerror]', e.message, e.error);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[unhandledrejection]', e.reason);
});

const rootEl = document.getElementById('root');

// Reveal the app once React has actually painted its first screen: hide the
// native splash (iOS/Android) and remove the branded HTML splash together, so
// the blue splash covers the entire cold-start window with no white gap.
let revealed = false;
const revealApp = async () => {
  if (revealed) return;
  revealed = true;
  if (Capacitor.isNativePlatform()) {
    try {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
    } catch { /* plugin missing — nothing to hide */ }
  }
  const splash = document.getElementById('app-splash');
  if (splash) {
    splash.classList.add('app-splash--hide');
    window.setTimeout(() => splash.remove(), 400);
  }
};

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

// Last-resort, React-free error screen. If the app's module graph throws while
// it is being imported (e.g. a browser API that misbehaves inside WKWebView on
// a particular device), ReactDOM.render never runs and every in-React safety
// net is bypassed — which is exactly the silent "couldn't finish loading"
// failsafe App Store review hit. Rendering plain DOM into #root here gives the
// user an honest, actionable screen and, because #root now has children, stops
// the HTML cold-start failsafe from firing.
function showBootError(err: unknown) {
  console.error('[boot] fatal error during startup:', err);
  if (!rootEl) {
    document.body.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,sans-serif;text-align:center">App failed to start. Please reload.</div>';
    return;
  }
  rootEl.innerHTML =
    '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,sans-serif;background:#f9fafb;color:#111827">' +
      '<div style="max-width:360px;text-align:center">' +
        '<div style="font-size:44px;margin-bottom:12px">😕</div>' +
        '<h1 style="font-size:20px;font-weight:700;margin:0 0 8px">Something went wrong</h1>' +
        '<p style="font-size:14px;color:#4b5563;margin:0 0 20px;line-height:1.5">We hit a snag starting the app. Tap reload to try again.</p>' +
        '<button onclick="try{sessionStorage.removeItem(\'wny_boot_retry\')}catch(e){};window.location.reload()" ' +
          'style="padding:10px 20px;background:#2563eb;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600">Reload</button>' +
      '</div>' +
    '</div>';
  // #root now has children, so revealApp() runs and the splash clears.
}

// Boot the heavy app graph dynamically inside a try/catch. Static top-level
// imports of the whole app tree (App, i18n, sentry, and everything they pull
// in) run before any of our code and cannot be guarded — a single throw there
// takes the entire launch down silently. Importing them here means an
// import-time failure is caught and surfaced instead of hanging on the splash.
async function boot() {
  if (!rootEl) {
    showBootError(new Error('#root element missing'));
    return;
  }
  try {
    // i18n initializes on import (and touches localStorage); keep it inside the
    // guard so a storage/init failure can't block the whole render.
    await import('./i18n');

    let sentryEnabled = false;
    let Sentry: typeof import('./lib/sentry')['Sentry'] | null = null;
    try {
      const sentry = await import('./lib/sentry');
      sentry.initSentry();
      sentryEnabled = sentry.sentryEnabled;
      Sentry = sentry.Sentry;
    } catch (e) {
      console.error('[main] Sentry init failed:', e);
    }

    const { default: App } = await import('./App');

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
    );

    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <RootErrorBoundary>
          {sentryEnabled && Sentry ? (
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

    // Native listeners are set up AFTER render so a plugin hiccup can never
    // block the app from painting. Guarded because a throwing addListener would
    // otherwise reach the boot catch and needlessly show the error screen.
    try {
      const { App: CapacitorApp } = await import('@capacitor/app');
      CapacitorApp.addListener('backButton', () => {
        const modal = document.querySelector('div[role="dialog"]');
        if (modal) {
          modal.remove();
        } else {
          CapacitorApp.exitApp();
        }
      });
    } catch (e) {
      console.error('[main] back-button listener failed:', e);
    }
  } catch (err) {
    showBootError(err);
  }
}

boot();
