import { useState, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/index.js";
import { geocodeAddress } from "../lib/geocode.js";
import type { GeocodeResult } from "../lib/geocode.js";
import type { Zone } from "../types/index.js";
import { ZoneMap } from "../components/ZoneMap.js";

// ─── Zone Card ────────────────────────────────────────────────────────────────

interface ZoneCardProps {
  zone: Zone;
  onEdit: (zone: Zone) => void;
}

function ZoneCard({ zone, onEdit }: ZoneCardProps) {
  const [showMap, setShowMap] = useState(false);

  const handleDelete = async () => {
    if (zone.id === undefined) return;
    if (!window.confirm(`Delete zone "${zone.name}"?`)) return;
    await db.zones.delete(zone.id);
  };

  return (
    <div className="md-card">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "var(--md-primary-container)",
              color: "var(--md-on-primary-container)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span className="ms icon-20" aria-hidden="true">
              location_on
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontWeight: 600,
                color: "var(--md-on-surface)",
                margin: 0,
                fontSize: "0.9375rem",
              }}
            >
              {zone.name}
            </p>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--md-on-surface-variant)",
                margin: "2px 0 0",
                fontFamily: "monospace",
              }}
            >
              {zone.lat.toFixed(5)}, {zone.lng.toFixed(5)} &bull; r=
              {zone.radiusMeters}m
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          {/* Map toggle button */}
          <button
            onClick={() => {
              setShowMap((v) => !v);
            }}
            aria-label={showMap ? "Hide map" : "Show map"}
            title={showMap ? "Hide map" : "Show map"}
            style={{
              background: "none",
              border: "none",
              color: showMap
                ? "var(--md-primary)"
                : "var(--md-on-surface-variant)",
              cursor: "pointer",
              lineHeight: 1,
              padding: "6px",
              borderRadius: "50%",
              transition: "color 0.15s, background-color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--md-primary)";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(158,202,255,0.1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = showMap
                ? "var(--md-primary)"
                : "var(--md-on-surface-variant)";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "transparent";
            }}
          >
            <span className="ms icon-20" aria-hidden="true">
              map
            </span>
          </button>
          {/* Edit button */}
          <button
            onClick={() => {
              onEdit(zone);
            }}
            aria-label={`Edit zone ${zone.name}`}
            style={{
              background: "none",
              border: "none",
              color: "var(--md-on-surface-variant)",
              cursor: "pointer",
              lineHeight: 1,
              padding: "6px",
              borderRadius: "50%",
              transition: "color 0.15s, background-color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--md-primary)";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(158,202,255,0.1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--md-on-surface-variant)";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "transparent";
            }}
          >
            <span className="ms icon-20" aria-hidden="true">
              edit
            </span>
          </button>
          {/* Delete button */}
          <button
            onClick={() => void handleDelete()}
            aria-label={`Delete zone ${zone.name}`}
            style={{
              background: "none",
              border: "none",
              color: "var(--md-on-surface-variant)",
              cursor: "pointer",
              fontSize: "1.375rem",
              lineHeight: 1,
              padding: "6px",
              borderRadius: "50%",
              transition: "color 0.15s, background-color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--md-error)";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(255,180,171,0.1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--md-on-surface-variant)";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "transparent";
            }}
          >
            ×
          </button>
        </div>
      </div>

      {showMap && (
        <ZoneMap
          lat={zone.lat}
          lng={zone.lng}
          radiusMeters={zone.radiusMeters}
        />
      )}
    </div>
  );
}

// ─── Shared zone form fields ──────────────────────────────────────────────────

interface ZoneFormFieldsProps {
  name: string;
  setName: (v: string) => void;
  address: string;
  lat: string;
  lng: string;
  radius: string;
  setRadius: (v: string) => void;
  isLocating: boolean;
  isGeocoding: boolean;
  suggestions: GeocodeResult[];
  error: string | null;
  onAddressChange: (v: string) => void;
  onApplySuggestion: (r: GeocodeResult) => void;
  onUseCurrentLocation: () => void;
  onClearCoords: () => void;
}

function ZoneFormFields({
  name,
  setName,
  address,
  lat,
  lng,
  radius,
  setRadius,
  isLocating,
  isGeocoding,
  suggestions,
  error,
  onAddressChange,
  onApplySuggestion,
  onUseCurrentLocation,
  onClearCoords,
}: ZoneFormFieldsProps) {
  const coordsSet = lat !== "" && lng !== "";
  return (
    <>
      {error && (
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--md-error)",
            backgroundColor: "var(--md-error-container)",
            padding: "10px 14px",
            borderRadius: "8px",
            margin: 0,
          }}
        >
          {error}
        </p>
      )}

      <div className="md-field">
        <label className="md-field-label" htmlFor="zone-name">
          Zone Name
        </label>
        <input
          id="zone-name"
          type="text"
          placeholder="e.g. Home, Office"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          className="md-input"
          required
        />
      </div>

      <div className="md-field" style={{ position: "relative" }}>
        <label className="md-field-label" htmlFor="zone-address">
          Address Search
        </label>
        <div style={{ position: "relative" }}>
          <input
            id="zone-address"
            type="text"
            placeholder="123 Main St, City, State"
            value={address}
            onChange={(e) => {
              onAddressChange(e.target.value);
            }}
            autoComplete="off"
            className="md-input"
          />
          {isGeocoding && (
            <span
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              <span
                className="md-spinner"
                style={{ width: "16px", height: "16px", borderWidth: "2px" }}
              />
            </span>
          )}
        </div>

        {suggestions.length > 0 && (
          <ul
            style={{
              position: "absolute",
              zIndex: 50,
              left: 0,
              right: 0,
              top: "100%",
              backgroundColor: "var(--md-surface-container-highest)",
              border: "1px solid var(--md-outline-variant)",
              borderRadius: "0 0 12px 12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              overflow: "hidden",
              listStyle: "none",
              margin: 0,
              padding: 0,
            }}
          >
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => {
                    onApplySuggestion(s);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 16px",
                    fontSize: "0.875rem",
                    color: "var(--md-on-surface)",
                    background: "none",
                    border: "none",
                    borderBottom:
                      i < suggestions.length - 1
                        ? "1px solid var(--md-outline-variant)"
                        : "none",
                    cursor: "pointer",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (
                      e.currentTarget as HTMLButtonElement
                    ).style.backgroundColor = "rgba(158,202,255,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (
                      e.currentTarget as HTMLButtonElement
                    ).style.backgroundColor = "transparent";
                  }}
                >
                  {s.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {coordsSet ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: "var(--md-success-container)",
            borderRadius: "8px",
            padding: "10px 14px",
          }}
        >
          <span style={{ color: "var(--md-success)", fontSize: "1rem" }}>
            ✓
          </span>
          <span
            style={{
              color: "var(--md-on-surface)",
              fontSize: "0.8125rem",
              fontFamily: "monospace",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
          </span>
          <button
            type="button"
            onClick={onClearCoords}
            className="md-btn-text"
            style={{ padding: "2px 8px", fontSize: "0.75rem" }}
          >
            Clear
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "12px" }}>
          <div className="md-field" style={{ flex: 1 }}>
            <label className="md-field-label" htmlFor="zone-lat">
              Latitude
            </label>
            <input
              id="zone-lat"
              type="number"
              step="any"
              placeholder="37.7749"
              value={lat}
              readOnly
              onChange={() => {
                /* read-only; use address search or GPS */
              }}
              className="md-input"
            />
          </div>
          <div className="md-field" style={{ flex: 1 }}>
            <label className="md-field-label" htmlFor="zone-lng">
              Longitude
            </label>
            <input
              id="zone-lng"
              type="number"
              step="any"
              placeholder="-122.4194"
              value={lng}
              readOnly
              onChange={() => {
                /* read-only; use address search or GPS */
              }}
              className="md-input"
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onUseCurrentLocation}
        disabled={isLocating}
        className="md-btn-tonal"
        style={{ width: "100%" }}
      >
        {isLocating ? (
          <>
            <span
              className="md-spinner"
              style={{ width: "16px", height: "16px", borderWidth: "2px" }}
            />
            Locating…
          </>
        ) : (
          "Use Current Location"
        )}
      </button>

      <div className="md-field">
        <label className="md-field-label" htmlFor="zone-radius">
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
          className="md-input"
          required
        />
      </div>
    </>
  );
}

// ─── Shared form state hook ───────────────────────────────────────────────────

function useZoneFormState(initial?: Zone) {
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(initial ? String(initial.lat) : "");
  const [lng, setLng] = useState(initial ? String(initial.lng) : "");
  const [radius, setRadius] = useState(String(initial?.radiusMeters ?? 200));
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [error, setError] = useState<string | null>(null);
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

  const clearCoords = () => {
    setLat("");
    setLng("");
    setAddress("");
  };

  const validate = (): {
    parsedLat: number;
    parsedLng: number;
    parsedRadius: number;
  } | null => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedRadius = parseInt(radius, 10);
    if (!name.trim()) {
      setError("Name is required.");
      return null;
    }
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setError("Enter an address or use current location to set coordinates.");
      return null;
    }
    if (isNaN(parsedRadius) || parsedRadius < 50) {
      setError("Radius must be at least 50m.");
      return null;
    }
    return { parsedLat, parsedLng, parsedRadius };
  };

  return {
    name,
    setName,
    address,
    lat,
    lng,
    radius,
    setRadius,
    isLocating,
    isGeocoding,
    suggestions,
    error,
    setError,
    handleAddressChange,
    applySuggestion,
    useCurrentLocation,
    clearCoords,
    validate,
  };
}

// ─── Add Zone Form ────────────────────────────────────────────────────────────

interface AddZoneFormProps {
  onCancel: () => void;
}

function AddZoneForm({ onCancel }: AddZoneFormProps) {
  const form = useZoneFormState();

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    form.setError(null);
    const vals = form.validate();
    if (!vals) return;
    const now = new Date();
    await db.zones.add({
      name: form.name.trim(),
      lat: vals.parsedLat,
      lng: vals.parsedLng,
      radiusMeters: vals.parsedRadius,
      createdAt: now,
      updatedAt: now,
    } as Zone);
    onCancel();
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="md-card"
      style={{ display: "flex", flexDirection: "column", gap: "16px" }}
    >
      <h2
        style={{
          fontSize: "1.125rem",
          fontWeight: 700,
          color: "var(--md-on-surface)",
          margin: 0,
        }}
      >
        New Zone
      </h2>

      <ZoneFormFields
        name={form.name}
        setName={form.setName}
        address={form.address}
        lat={form.lat}
        lng={form.lng}
        radius={form.radius}
        setRadius={form.setRadius}
        isLocating={form.isLocating}
        isGeocoding={form.isGeocoding}
        suggestions={form.suggestions}
        error={form.error}
        onAddressChange={form.handleAddressChange}
        onApplySuggestion={form.applySuggestion}
        onUseCurrentLocation={form.useCurrentLocation}
        onClearCoords={form.clearCoords}
      />

      <div style={{ display: "flex", gap: "10px", paddingTop: "4px" }}>
        <button
          type="button"
          onClick={onCancel}
          className="md-btn-outlined"
          style={{ flex: 1 }}
        >
          Cancel
        </button>
        <button type="submit" className="md-btn-filled" style={{ flex: 1 }}>
          Save Zone
        </button>
      </div>
    </form>
  );
}

// ─── Edit Zone Form ───────────────────────────────────────────────────────────

interface EditZoneFormProps {
  zone: Zone;
  onCancel: () => void;
}

function EditZoneForm({ zone, onCancel }: EditZoneFormProps) {
  const form = useZoneFormState(zone);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    form.setError(null);
    if (zone.id === undefined) return;
    const vals = form.validate();
    if (!vals) return;
    await db.zones.update(zone.id, {
      name: form.name.trim(),
      lat: vals.parsedLat,
      lng: vals.parsedLng,
      radiusMeters: vals.parsedRadius,
      updatedAt: new Date(),
    });
    onCancel();
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="md-card"
      style={{ display: "flex", flexDirection: "column", gap: "16px" }}
    >
      <h2
        style={{
          fontSize: "1.125rem",
          fontWeight: 700,
          color: "var(--md-on-surface)",
          margin: 0,
        }}
      >
        Edit Zone
      </h2>

      <ZoneFormFields
        name={form.name}
        setName={form.setName}
        address={form.address}
        lat={form.lat}
        lng={form.lng}
        radius={form.radius}
        setRadius={form.setRadius}
        isLocating={form.isLocating}
        isGeocoding={form.isGeocoding}
        suggestions={form.suggestions}
        error={form.error}
        onAddressChange={form.handleAddressChange}
        onApplySuggestion={form.applySuggestion}
        onUseCurrentLocation={form.useCurrentLocation}
        onClearCoords={form.clearCoords}
      />

      <div style={{ display: "flex", gap: "10px", paddingTop: "4px" }}>
        <button
          type="button"
          onClick={onCancel}
          className="md-btn-outlined"
          style={{ flex: 1 }}
        >
          Cancel
        </button>
        <button type="submit" className="md-btn-filled" style={{ flex: 1 }}>
          Save Changes
        </button>
      </div>
    </form>
  );
}

// ─── Zones Page ───────────────────────────────────────────────────────────────

type FormMode =
  | { type: "none" }
  | { type: "add" }
  | { type: "edit"; zone: Zone };

export function ZonesPage() {
  const [formMode, setFormMode] = useState<FormMode>({ type: "none" });
  const zones = useLiveQuery(() => db.zones.toArray(), []) ?? [];

  const showForm = formMode.type !== "none";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "8px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--md-on-surface)",
              margin: 0,
            }}
          >
            Zones
          </h1>
          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--md-on-surface-variant)",
              margin: "4px 0 0",
            }}
          >
            {zones.length} location{zones.length !== 1 ? "s" : ""}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setFormMode({ type: "add" });
            }}
            className="md-fab-extended"
          >
            <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>+</span>
            Add Zone
          </button>
        )}
      </div>

      {formMode.type === "add" && (
        <AddZoneForm
          onCancel={() => {
            setFormMode({ type: "none" });
          }}
        />
      )}

      {formMode.type === "edit" && (
        <EditZoneForm
          zone={formMode.zone}
          onCancel={() => {
            setFormMode({ type: "none" });
          }}
        />
      )}

      {zones.length === 0 && !showForm ? (
        <div
          className="md-card"
          style={{ textAlign: "center", padding: "40px 16px" }}
        >
          <p style={{ marginBottom: "8px" }}>
            <span
              className="ms icon-32"
              style={{ color: "var(--md-on-surface-variant)" }}
              aria-hidden="true"
            >
              location_on
            </span>
          </p>
          <p
            style={{
              color: "var(--md-on-surface)",
              fontWeight: 600,
              marginBottom: "4px",
            }}
          >
            No zones yet
          </p>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--md-on-surface-variant)",
            }}
          >
            Add your home, office, or any location to auto-track trips.
          </p>
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {zones.map((zone) => (
            <li key={zone.id}>
              <ZoneCard
                zone={zone}
                onEdit={(z) => {
                  setFormMode({ type: "edit", zone: z });
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
