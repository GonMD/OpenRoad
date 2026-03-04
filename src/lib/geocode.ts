// ─── Nominatim Geocoding (OpenStreetMap) ─────────────────────────────────────
// Free, no API key required.
// Usage policy: max 1 request/second, must include a User-Agent.
// https://nominatim.org/release-docs/latest/api/Search/

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
    {
      headers: {
        // Nominatim requires a descriptive User-Agent
        "User-Agent": "MileageCalcPWA/0.1.0 (mileage-tax-tracker)",
        "Accept-Language": "en",
      },
    },
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
