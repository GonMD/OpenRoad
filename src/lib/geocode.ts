// ─── Nominatim Geocoding (OpenStreetMap) ─────────────────────────────────────
// Free, no API key required.
// Usage policy: max 1 request/second, must include a User-Agent.
// https://nominatim.org/release-docs/latest/api/Search/

const NOMINATIM_HEADERS = {
  "User-Agent": "OpenRoadPWA/0.1.0 (mileage-tax-tracker)",
  "Accept-Language": "en",
};

export interface GeocodeResult {
  displayName: string;
  lat: number;
  lng: number;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface NominatimReverseResult {
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  error?: string;
}

/**
 * Geocodes a free-form address string using the Nominatim API.
 * Returns up to 5 candidate results.
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "5",
    addressdetails: "0",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    { headers: NOMINATIM_HEADERS },
  );

  if (!response.ok) {
    throw new Error(`Geocoding request failed: ${String(response.status)}`);
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Unexpected geocoding response format");
  }

  return (data as NominatimResult[]).map((item) => ({
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
  }));
}

/**
 * Reverse-geocodes a lat/lng coordinate to a short human-readable address.
 * Returns a compact string like "123 Main St, Springfield" or null on failure.
 * Rate-limited by Nominatim to 1 req/s — callers should sequence requests.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      lat: lat.toFixed(6),
      lon: lng.toFixed(6),
      format: "json",
      addressdetails: "1",
      zoom: "17", // street level
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      { headers: NOMINATIM_HEADERS },
    );

    if (!response.ok) return null;

    const data = (await response.json()) as NominatimReverseResult;
    if (data.error) return null;

    const a = data.address;
    // Build a compact address: "123 Main St, City" or fallback to display_name truncated
    const street = [a.house_number, a.road].filter(Boolean).join(" ");
    const city = a.city ?? a.town ?? a.village ?? a.suburb ?? "";
    if (street && city) return `${street}, ${city}`;
    if (street) return street;
    if (city) return city;
    // Fallback: first two comma-separated parts of display_name
    return data.display_name.split(",").slice(0, 2).join(",").trim();
  } catch {
    return null;
  }
}

/**
 * Resolves addresses for a trip's origin, pit stops, and destination.
 * Sequences requests 1.1 s apart to respect Nominatim's 1 req/s limit.
 */
export async function resolveAddresses(
  coords: { lat: number; lng: number }[],
): Promise<(string | null)[]> {
  const results: (string | null)[] = [];
  for (let i = 0; i < coords.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1100));
    const c = coords[i];
    results.push(await reverseGeocode(c.lat, c.lng));
  }
  return results;
}
