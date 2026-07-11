// Free address geocoding via OpenStreetMap Nominatim.
//
// Accuracy notes baked into this file:
// - Nominatim's usage policy REQUIRES a descriptive User-Agent. Without
//   it your IP gets throttled or served stale/empty responses with no
//   error. We send one on every request.
// - We bias to North America by default (ca + us) since the app is
//   Calgary-focused. Callers can override with their own country codes
//   when expanding to other regions, or pass [] to disable.
// - We ask for addressdetails so results carry a class/type and we can
//   downrank broad matches like city / country / administrative regions
//   when the user clearly typed a street address.

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const DEFAULT_COUNTRIES = ['ca', 'us'];
const USER_AGENT = 'WorshipNYaps/1.0 (https://worshipnyaps.com)';

interface GeocodeOptions {
  countryCodes?: string[];      // ISO 3166-1 alpha-2, e.g. ['ca', 'us']
  viewbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  bounded?: boolean;            // Restrict to viewbox vs. just prefer it
}

function buildBaseUrl(query: string, opts: GeocodeOptions): URL {
  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');

  const codes = opts.countryCodes ?? DEFAULT_COUNTRIES;
  if (codes.length > 0) url.searchParams.set('countrycodes', codes.join(','));

  if (opts.viewbox) {
    url.searchParams.set('viewbox', opts.viewbox.join(','));
    if (opts.bounded) url.searchParams.set('bounded', '1');
  }
  return url;
}

// Looks like a real street-level result (not a country/state/city centroid).
// Nominatim's "class" + "type" carry this signal — addresses are usually
// place=house or building, while broad matches are place=city/country.
function looksLikeStreetAddress(row: { class?: string; type?: string }): boolean {
  if (!row.class || !row.type) return true; // keep if unknown
  const broadPlaceTypes = new Set([
    'country', 'state', 'region', 'province', 'county',
    'administrative', 'continent', 'island',
  ]);
  if (row.class === 'place' && broadPlaceTypes.has(row.type)) return false;
  return true;
}

export async function geocodeAddress(
  address: string,
  opts: GeocodeOptions = {},
): Promise<{ latitude: number; longitude: number } | null> {
  if (!address || !address.trim()) return null;
  try {
    const url = buildBaseUrl(address.trim(), opts);
    url.searchParams.set('limit', '5');

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    // Prefer the first result that looks like a real address, not a country.
    const best = data.find(looksLikeStreetAddress) ?? data[0];
    const lat = parseFloat(best.lat);
    const lon = parseFloat(best.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
    if (lat === 0 && lon === 0) return null; // null-island guard
    return { latitude: lat, longitude: lon };
  } catch {
    return null;
  }
}

export interface AddressSuggestion {
  displayName: string;
  latitude: number;
  longitude: number;
}

export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
  limit = 5,
  opts: GeocodeOptions = {},
): Promise<AddressSuggestion[]> {
  const q = query?.trim();
  if (!q || q.length < 3) return [];
  try {
    const url = buildBaseUrl(q, opts);
    url.searchParams.set('limit', String(Math.min(limit * 2, 20)));

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    const seen = new Set<string>();
    return data
      .filter(looksLikeStreetAddress)
      .map((row: any) => {
        const lat = parseFloat(row.lat);
        const lon = parseFloat(row.lon);
        if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
        if (lat === 0 && lon === 0) return null;
        const displayName = String(row.display_name || '').trim();
        if (!displayName || seen.has(displayName)) return null;
        seen.add(displayName);
        return { displayName, latitude: lat, longitude: lon } as AddressSuggestion;
      })
      .filter((r): r is AddressSuggestion => r !== null)
      .slice(0, limit);
  } catch {
    return [];
  }
}
