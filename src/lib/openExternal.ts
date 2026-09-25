import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// Production origin where the static legal/support pages are hosted. In the
// native app window.location.origin is capacitor://localhost, which can't be
// opened by the system/in-app browser, so we point at the real site.
const WEB_ORIGIN = 'https://www.worshipnyaps.com';

// The origin to use when building SHAREABLE links (event invites, team links,
// etc.). Never use window.location.origin directly for these: in the native
// app it's capacitor://localhost and in dev it's http://localhost — neither
// resolves for the recipient. Use the real site in those cases.
export function shareOrigin(): string {
  try {
    const origin = window.location.origin;
    const isUnshareable =
      origin.startsWith('capacitor://') ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('https://localhost') ||
      origin.startsWith('http://127.0.0.1');
    return isUnshareable ? WEB_ORIGIN : origin;
  } catch {
    return WEB_ORIGIN;
  }
}

// Build a shareable absolute URL for an in-app path (e.g. "/event/123").
export function shareUrl(path: string): string {
  return `${shareOrigin()}${path.startsWith('/') ? path : `/${path}`}`;
}

// Build the shareable invite link for an event. Prefers the compact
// /e/{short_code} slug (which also carries the invite code server-side, so it
// works for private/friends events). Falls back to the canonical
// /event/{id}?invite={code} form if an older client lacks short_code.
export function eventShareUrl(event: { id: string; short_code?: string | null; invite_code?: string | null }): string {
  if (event.short_code) {
    return `${shareOrigin()}/e/${event.short_code}`;
  }
  const url = new URL(`/event/${event.id}`, shareOrigin());
  if (event.invite_code) {
    url.searchParams.set('invite', event.invite_code);
  }
  return url.toString();
}

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
