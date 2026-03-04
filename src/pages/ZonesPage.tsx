import { useState, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/index.js";
import { geocodeAddress } from "../lib/geocode.js";
import type { GeocodeResult } from "../lib/geocode.js";
import type { Zone } from "../types/index.js";

// ─── Zone Card ────────────────────────────────────────────────────────────────

function ZoneCard({ zone }: { zone: Zone }) {
  const handleDelete = async () => {
    if (zone.id === undefined) return;
    if (!window.confirm(`Delete zone "${zone.name}"?`)) return;
    await db.zones.delete(zone.id);
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
      <div>
        <p className="font-semibold text-slate-100">{zone.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {zone.lat.toFixed(5)}, {zone.lng.toFixed(5)} &bull; r=
          {zone.radiusMeters}m
        </p>
      </div>
      <button
        onClick={() => void handleDelete()}
        aria-label={`Delete zone ${zone.name}`}
        className="text-slate-600 hover:text-red-400 transition-colors text-xl leading-none"
      >
        ×
      </button>
    </div>
  );
}

// ─── Add Zone Form ────────────────────────────────────────────────────────────

interface AddZoneFormProps {
  onCancel: () => void;
}

function AddZoneForm({ onCancel }: AddZoneFormProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("200");

  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Debounce ref — avoid hammering Nominatim on every keystroke
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAddressChange = (value: string) => {
    setAddress(value);
    setSuggestions([]);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 4) return;

    debounceRef.current = setTimeout(() => {
      setIsGeocoding(true);
      geocodeAddress(value)
        .then((results) => {
          setSuggestions(results);
          if (results.length === 0)
            setError("No results found for that address.");
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Geocoding failed.");
        })
        .finally(() => {
          setIsGeocoding(false);
        });
    }, 600);
  };

  const applySuggestion = (result: GeocodeResult) => {
    setLat(result.lat.toFixed(6));
    setLng(result.lng.toFixed(6));
    setAddress(result.displayName);
    setSuggestions([]);
    // Auto-fill name from first part of display name if empty
    if (!name.trim()) {
      setName(result.displayName.split(",")[0]?.trim() ?? "");
    }
  };

  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported.");
      return;
    }
    setIsLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setAddress("");
        setSuggestions([]);
        setIsLocating(false);
      },
      (err) => {
        setError(err.message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedRadius = parseInt(radius, 10);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setError("Enter an address or use current location to set coordinates.");
      return;
    }
    if (isNaN(parsedRadius) || parsedRadius < 50) {
      setError("Radius must be at least 50m.");
      return;
    }

    const now = new Date();
    await db.zones.add({
      name: name.trim(),
      lat: parsedLat,
      lng: parsedLng,
      radiusMeters: parsedRadius,
      createdAt: now,
      updatedAt: now,
    } as Zone);
    onCancel();
  };

  const coordsSet = lat !== "" && lng !== "";

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="bg-slate-800 rounded-xl p-4 space-y-3"
    >
      <h2 className="font-semibold text-slate-100">New Zone</h2>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Zone name */}
      <div className="space-y-1">
        <label className="text-xs text-slate-400" htmlFor="zone-name">
          Name
        </label>
        <input
          id="zone-name"
          type="text"
          placeholder="e.g. Home, Office"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          className="w-full bg-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Address search */}
      <div className="space-y-1 relative">
        <label className="text-xs text-slate-400" htmlFor="zone-address">
          Address search
        </label>
        <div className="relative">
          <input
            id="zone-address"
            type="text"
            placeholder="123 Main St, City, State"
            value={address}
            onChange={(e) => {
              handleAddressChange(e.target.value);
            }}
            autoComplete="off"
            className="w-full bg-slate-700 text-slate-100 rounded-lg px-3 py-2 pr-8 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          {isGeocoding && (
            <span className="absolute right-2.5 top-2.5 text-slate-400 text-xs animate-pulse">
              ...
            </span>
          )}
        </div>

        {/* Suggestion dropdown */}
        {suggestions.length > 0 && (
          <ul className="absolute z-50 left-0 right-0 bg-slate-700 border border-slate-600 rounded-lg shadow-xl overflow-hidden mt-0.5">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => {
                    applySuggestion(s);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-600 transition-colors border-b border-slate-600 last:border-0"
                >
                  {s.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Coordinates — read-only display once set */}
      {coordsSet ? (
        <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
          <span className="text-green-400 text-sm">&#10003;</span>
          <span className="text-slate-300 text-xs font-mono flex-1 truncate">
            {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
          </span>
          <button
            type="button"
            onClick={() => {
              setLat("");
              setLng("");
              setAddress("");
            }}
            className="text-slate-500 hover:text-red-400 text-xs transition-colors"
          >
            clear
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-slate-400" htmlFor="zone-lat">
              Latitude
            </label>
            <input
              id="zone-lat"
              type="number"
              step="any"
              placeholder="37.7749"
              value={lat}
              onChange={(e) => {
                setLat(e.target.value);
              }}
              className="w-full bg-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs text-slate-400" htmlFor="zone-lng">
              Longitude
            </label>
            <input
              id="zone-lng"
              type="number"
              step="any"
              placeholder="-122.4194"
              value={lng}
              onChange={(e) => {
                setLng(e.target.value);
              }}
              className="w-full bg-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={useCurrentLocation}
        disabled={isLocating}
        className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-sm py-2 rounded-lg transition-colors"
      >
        {isLocating ? "Locating..." : "Use Current Location"}
      </button>

      {/* Radius */}
      <div className="space-y-1">
        <label className="text-xs text-slate-400" htmlFor="zone-radius">
          Radius (meters)
        </label>
        <input
          id="zone-radius"
          type="number"
          min="50"
          max="5000"
          value={radius}
          onChange={(e) => {
            setRadius(e.target.value);
          }}
          className="w-full bg-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium py-2 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          Save Zone
        </button>
      </div>
    </form>
  );
}

// ─── Zones Page ───────────────────────────────────────────────────────────────

export function ZonesPage() {
  const [showForm, setShowForm] = useState(false);
  const zones = useLiveQuery(() => db.zones.toArray(), []) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Zones</h1>
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Add Zone
          </button>
        )}
      </div>

      {showForm && (
        <AddZoneForm
          onCancel={() => {
            setShowForm(false);
          }}
        />
      )}

      {zones.length === 0 && !showForm ? (
        <div className="bg-slate-800 rounded-xl p-8 text-center">
          <p className="text-slate-400">No zones defined yet.</p>
          <p className="text-slate-500 text-sm mt-1">
            Add your home, office, or any location to auto-track trips.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {zones.map((zone) => (
            <li key={zone.id}>
              <ZoneCard zone={zone} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
