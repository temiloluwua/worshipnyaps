import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// Production origin where the static legal/support pages are hosted. In the
// native app window.location.origin is capacitor://localhost, which can't be
// opened by the system/in-app browser, so we point at the real site.
const WEB_ORIGIN = 'https://worshipnyaps.app';

// Open a URL the right way per platform:
// - Native: in-app Safari sheet (@capacitor/browser). Relative paths are
//   resolved against the production origin since capacitor:// isn't openable.
// - Web: a new tab.
export async function openExternal(url: string): Promise<void> {
  const isRelative = url.startsWith('/');
  if (Capacitor.isNativePlatform()) {
    const full = isRelative ? `${WEB_ORIGIN}${url}` : url;
    try {
      await Browser.open({ url: full, presentationStyle: 'popover' });
      return;
    } catch {
      // fall through to window.open as a last resort
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
