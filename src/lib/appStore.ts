// Single source of truth for the live App Store listing and the web → store
// call-to-action used by the landing page CTA and the recurring install banner.
export const APP_STORE_URL = 'https://apps.apple.com/us/app/worship-n-yaps/id6772068578';

// Open the App Store listing in a new tab (web only — inside the native app
// there's nothing to install, so callers gate on Capacitor.isNativePlatform()).
export function openAppStore(): void {
  window.open(APP_STORE_URL, '_blank', 'noopener,noreferrer');
}
