// Free address geocoding via OpenStreetMap Nominatim.
// Returns null if the lookup fails or the response is empty.
// Caller should provide a sensible fallback (e.g. don't save the location).
export async function geocodeAddress(
  address: string
): Promise<{ latitude: number; longitude: number } | null> {
  if (!address || !address.trim()) return null;
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', address.trim());
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
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

// Returns up to N geocoding suggestions for partial-address autocomplete.
// Same Nominatim endpoint as above, just with a higher limit and the
// formatted display_name surfaced for each result.
export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
  limit = 5
): Promise<AddressSuggestion[]> {
  const q = query?.trim();
  if (!q || q.length < 3) return [];
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('addressdetails', '0');

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .map((row: any) => {
        const lat = parseFloat(row.lat);
        const lon = parseFloat(row.lon);
        if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
        return {
          displayName: String(row.display_name || '').trim(),
          latitude: lat,
          longitude: lon,
        } as AddressSuggestion;
      })
      .filter((r): r is AddressSuggestion => r !== null);
  } catch {
    return [];
  }
}
