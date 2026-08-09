// City -> coordinates, cached, for the Community "Local" radius filter.
//
// Users only store a free-text `city`, so to include *nearby* towns (not just
// an exact string match) we geocode each city once and compare distances.
// Results are cached in localStorage forever (a city's coordinates don't
// change) so we don't hammer Nominatim on every feed render.

import { geocodeAddress } from './geocode';

export interface Coords {
  latitude: number;
  longitude: number;
}

const CACHE_KEY = 'wny_city_coords_v1';

function loadCache(): Record<string, Coords> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, Coords>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable — geocoding still works, just uncached */
  }
}

// Geocode a city name to coordinates. Cache hits return without a network call.
// Failures are NOT cached, so a transient error doesn't poison a city forever.
export async function geocodeCity(city: string): Promise<Coords | null> {
  const key = (city || '').trim().toLowerCase();
  if (!key) return null;

  const cache = loadCache();
  if (cache[key]) return cache[key];

  const res = await geocodeAddress(key);
  if (res) {
    cache[key] = res;
    saveCache(cache);
  }
  return res;
}

// Great-circle distance between two points, in kilometres.
export function distanceKm(a: Coords, b: Coords): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
