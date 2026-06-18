// Cloudflare Turnstile wrapper. Reads the site key from VITE_TURNSTILE_SITE_KEY.
// If the env var is unset, getTurnstileToken() returns undefined and the caller
// should treat captcha as disabled (signup will still work as long as the
// Supabase Auth captcha setting is also off).

declare global {
  interface Window {
    turnstile?: {
      ready: (cb: () => void) => void;
      execute: (container: string | HTMLElement, opts: { sitekey: string; action?: string }) => string;
      remove: (widgetId?: string) => void;
      render: (
        container: string | HTMLElement,
        opts: {
          sitekey: string;
          action?: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          execution?: 'render' | 'execute';
          size?: 'normal' | 'compact' | 'invisible';
        }
      ) => string;
    };
  }
}

const SITE_KEY: string | undefined = (import.meta as any).env?.VITE_TURNSTILE_SITE_KEY;

function waitForTurnstile(timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (window.turnstile?.render) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error('Turnstile failed to load'));
      setTimeout(tick, 100);
    };
    tick();
  });
}

// Renders a hidden Turnstile widget once and returns a token. Captcha is bound
// to a single use — call this fresh each time you need a token.
export async function getTurnstileToken(action: string): Promise<string | undefined> {
  if (!SITE_KEY) return undefined;

  try {
    await waitForTurnstile();
  } catch {
    console.warn('Turnstile not loaded; proceeding without captcha token');
    return undefined;
  }

  return new Promise<string | undefined>((resolve) => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    let widgetId: string | undefined;
    const cleanup = () => {
      try { if (widgetId) window.turnstile?.remove(widgetId); } catch { /* ignore */ }
      try { container.remove(); } catch { /* ignore */ }
    };

    try {
      widgetId = window.turnstile!.render(container, {
        sitekey: SITE_KEY,
        action,
        size: 'invisible',
        callback: (token: string) => {
          cleanup();
          resolve(token);
        },
        'error-callback': () => {
          cleanup();
          resolve(undefined);
        },
        'expired-callback': () => {
          cleanup();
          resolve(undefined);
        },
      });
    } catch {
      cleanup();
      resolve(undefined);
    }
  });
}
