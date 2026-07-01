// Build a URL that opens the user's native map app when tapped.
//
// - iOS: `maps://` isn't allowed in <a href> from arbitrary origins, so we
//   use `https://maps.apple.com/?q=…` which iOS will hand off to Apple Maps
//   automatically.
// - Android: `geo:` is the universal intent; Chrome / most browsers prompt
//   to open Google Maps. We include the address in `q=` so it geocodes.
// - Everything else (desktop web): Google Maps search.
export function mapLinkFor(address: string): string {
  const trimmed = (address || '').trim();
  if (!trimmed) return '#';

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  const encoded = encodeURIComponent(trimmed);
  if (isIOS) {
    return `https://maps.apple.com/?q=${encoded}`;
  }
  if (isAndroid) {
    return `geo:0,0?q=${encoded}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}
