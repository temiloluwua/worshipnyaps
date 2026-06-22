import { lazy, ComponentType } from 'react';

/**
 * Wraps React.lazy with a one-time, self-healing retry.
 *
 * Why this exists (fixes Sentry JAVASCRIPT-REACT-2 / JAVASCRIPT-REACT-4
 * "TypeError: Importing a module script failed."):
 *
 * After we ship a new deploy, a browser tab that's been open since the
 * previous deploy still has an index.html referencing JS chunk filenames
 * (e.g. `LocationsView-abc123.js`) that may no longer exist once the old
 * build's assets are replaced. The next time that tab lazily imports one
 * of those chunks (e.g. the user taps "Locations" or "Shop"), the dynamic
 * `import()` 404s and throws — which crashes the whole app via the
 * Suspense boundary.
 *
 * Fix: on import failure, reload the page once so the browser re-fetches
 * the current index.html and the up-to-date chunk manifest. A
 * sessionStorage flag (scoped per chunk) prevents an infinite reload loop
 * if the import keeps failing for some other reason (e.g. offline).
 */

function readFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    if (value) {
      sessionStorage.setItem(key, '1');
    } else {
      sessionStorage.removeItem(key);
    }
  } catch {
    // sessionStorage unavailable (e.g. private mode) — fall back to a
    // single attempt without dedup; not worth crashing over.
  }
}

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  chunkName: string
) {
  const reloadFlagKey = `wny_chunk_reload_${chunkName}`;

  return lazy(() =>
    factory()
      .then((module) => {
        // Successful load — clear any stale retry flag so a future
        // transient failure for this chunk gets its own retry.
        writeFlag(reloadFlagKey, false);
        return module;
      })
      .catch((error: unknown) => {
        if (!readFlag(reloadFlagKey)) {
          writeFlag(reloadFlagKey, true);
          window.location.reload();
          // The reload navigates away; return a promise that never
          // resolves so React doesn't render an error state first.
          return new Promise<{ default: T }>(() => {});
        }
        // Already retried once this session and it's still failing —
        // surface the real error instead of reload-looping forever.
        writeFlag(reloadFlagKey, false);
        throw error;
      })
  );
}
