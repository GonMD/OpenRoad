import { useState, useEffect } from "react";
import { db } from "../db/index.js";
import type { Trip, TripPurpose, Vehicle } from "../types/index.js";
import { TRIP_PURPOSE_LABELS, VEHICLE_TYPE_ICONS } from "../types/index.js";
import { TripMap } from "./TripMap.js";
import { OdometerCapture } from "./OdometerCapture.js";

interface EditTripModalProps {
  trip: Trip;
  onClose: () => void;
}

const PURPOSE_ICONS: Record<TripPurpose, string> = {
  business: "work",
  medical: "local_hospital",
  charity: "volunteer_activism",
  personal: "home",
};

export function EditTripModal({ trip, onClose }: EditTripModalProps) {
  const [purpose, setPurpose] = useState<TripPurpose>(trip.purpose);
  const [notes, setNotes] = useState(trip.notes);
  const [distanceStr, setDistanceStr] = useState(trip.distanceMiles.toFixed(2));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [savedAsTemplate, setSavedAsTemplate] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  // Odometer state
  const [odomStartStr, setOdomStartStr] = useState(
    trip.odometerStart !== null ? String(trip.odometerStart) : "",
  );
  const [odomEndStr, setOdomEndStr] = useState(
    trip.odometerEnd !== null ? String(trip.odometerEnd) : "",
  );
  const [odomStartPhoto, setOdomStartPhoto] = useState<string | null>(
    trip.odometerStartPhoto ?? null,
  );
  const [odomEndPhoto, setOdomEndPhoto] = useState<string | null>(
    trip.odometerEndPhoto ?? null,
  );

  useEffect(() => {
    if (trip.vehicleId === null) return;
    void db.vehicles.get(trip.vehicleId).then((v) => {
      setVehicle(v ?? null);
    });
  }, [trip.vehicleId]);

  const handleSaveAsTemplate = async () => {
    const now = new Date();
    await db.templates.add({
      name: notes.trim() || TRIP_PURPOSE_LABELS[purpose],
      purpose,
      notes: notes.trim(),
      createdAt: now,
      updatedAt: now,
    });
    setSavedAsTemplate(true);
    setTimeout(() => {
      setSavedAsTemplate(false);
    }, 2000);
  };

  const handleSave = async () => {
    const distance = parseFloat(distanceStr);
    if (isNaN(distance) || distance < 0) {
      setError("Distance must be a positive number.");
      return;
    }
    if (trip.id === undefined) return;
    setSaving(true);

    const odomStart =
      odomStartStr.trim() !== "" ? parseFloat(odomStartStr) : null;
    const odomEnd = odomEndStr.trim() !== "" ? parseFloat(odomEndStr) : null;

    await db.trips.update(trip.id, {
      purpose,
      notes,
      distanceMiles: distance,
      odometerStart: odomStart !== null && !isNaN(odomStart) ? odomStart : null,
      odometerEnd: odomEnd !== null && !isNaN(odomEnd) ? odomEnd : null,
      odometerStartPhoto: odomStartPhoto,
      odometerEndPhoto: odomEndPhoto,
      updatedAt: new Date(),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="md-bottom-sheet" onClick={onClose}>
      <div className="md-bottom-sheet-scrim" />
      <div
        className="md-bottom-sheet-surface"
        style={{ maxWidth: "600px", width: "100%", margin: "0 auto" }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="md-bottom-sheet-handle" />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              color: "var(--md-on-surface)",
              margin: 0,
            }}
          >
            Edit Trip
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {trip.id !== undefined && (
              <button
                onClick={() => {
                  setShowMap((v) => !v);
                }}
                aria-label={showMap ? "Hide route map" : "Show route map"}
                style={{
                  background: "none",
                  border: "none",
                  color: showMap
                    ? "var(--md-primary)"
                    : "var(--md-on-surface-variant)",
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: "4px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color 0.15s",
                }}
              >
                <span className="ms icon-24" aria-hidden="true">
                  map
                </span>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: "none",
                border: "none",
                color: "var(--md-on-surface-variant)",
                cursor: "pointer",
                lineHeight: 1,
                padding: "4px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="ms icon-24" aria-hidden="true">
                close
              </span>
            </button>
          </div>
        </div>

        {/* Route map (lazy) */}
        {showMap && trip.id !== undefined && (
          <div style={{ marginBottom: "20px" }}>
            <TripMap tripId={trip.id} />
          </div>
        )}

        {/* Vehicle */}
        {vehicle && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
              padding: "8px 10px",
              borderRadius: "8px",
              backgroundColor: "var(--md-surface-container-high)",
              fontSize: "0.8125rem",
              color: "var(--md-on-surface-variant)",
            }}
          >
            <span
              className="ms icon-16"
              aria-hidden="true"
              style={{ color: "var(--md-outline)", flexShrink: 0 }}
            >
              {VEHICLE_TYPE_ICONS[vehicle.vehicleType]}
            </span>
            <span>
              {vehicle.name}
              {vehicle.year || vehicle.make || vehicle.model
                ? ` — ${[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}`
                : ""}
            </span>
          </div>
        )}

        {/* Purpose */}
        <div style={{ marginBottom: "20px" }}>
          <p className="md-field-label" style={{ marginBottom: "10px" }}>
            Purpose
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
            }}
          >
            {(["business", "medical", "charity", "personal"] as const).map(
              (p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPurpose(p);
                  }}
                  className={
                    purpose === p ? "md-btn-filled" : "md-btn-outlined"
                  }
                  style={{
                    flexDirection: "column",
                    height: "64px",
                    gap: "4px",
                    fontSize: "0.8125rem",
                  }}
                >
                  <span className="ms icon-20" aria-hidden="true">
                    {PURPOSE_ICONS[p]}
                  </span>
                  {TRIP_PURPOSE_LABELS[p]}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Origin → Destination */}
        {(trip.originAddress ?? trip.destinationAddress) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "16px",
              fontSize: "0.8125rem",
              color: "var(--md-on-surface-variant)",
            }}
          >
            <span
              className="ms icon-16"
              aria-hidden="true"
              style={{ color: "var(--md-outline)" }}
            >
              trip_origin
            </span>
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {trip.originAddress ?? "—"}
            </span>
            <span
              className="ms icon-16"
              aria-hidden="true"
              style={{ color: "var(--md-outline)", flexShrink: 0 }}
            >
              arrow_forward
            </span>
            <span
              className="ms icon-16"
              aria-hidden="true"
              style={{ color: "var(--md-outline)" }}
            >
              place
            </span>
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {trip.destinationAddress ?? "—"}
            </span>
          </div>
        )}

        {/* Pit stops */}
        {trip.pitStops.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <p className="md-field-label" style={{ marginBottom: "8px" }}>
              Pit Stops
            </p>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              {trip.pitStops.map((ps, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    backgroundColor: "var(--md-surface-container-high)",
                    fontSize: "0.8125rem",
                    color: "var(--md-on-surface-variant)",
                  }}
                >
                  <span
                    className="ms icon-16"
                    aria-hidden="true"
                    style={{ color: "var(--md-outline)", flexShrink: 0 }}
                  >
                    place
                  </span>
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ps.address ?? ps.label}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--md-outline)",
                      flexShrink: 0,
                    }}
                  >
                    {ps.milesFromOrigin.toFixed(1)} mi
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Distance */}
        <div className="md-field" style={{ marginBottom: "16px" }}>
          <label className="md-field-label" htmlFor="edit-distance">
            Distance (miles)
          </label>
          <input
            id="edit-distance"
            type="number"
            min="0"
            step="0.01"
            value={distanceStr}
            onChange={(e) => {
              setDistanceStr(e.target.value);
              setError(null);
            }}
            className="md-input"
          />
          {error && (
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--md-error)",
                margin: "4px 0 0",
              }}
            >
              {error}
            </p>
          )}
        </div>

        {/* Odometer readings */}
        <div
          style={{
            marginBottom: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <OdometerCapture
            label="Start Odometer Reading"
            reading={odomStartStr}
            photo={odomStartPhoto}
            onReadingChange={setOdomStartStr}
            onPhotoChange={setOdomStartPhoto}
          />
          <OdometerCapture
            label="End Odometer Reading"
            reading={odomEndStr}
            photo={odomEndPhoto}
            onReadingChange={setOdomEndStr}
            onPhotoChange={setOdomEndPhoto}
          />
        </div>

        {/* Notes */}
        <div className="md-field" style={{ marginBottom: "8px" }}>
          <label className="md-field-label" htmlFor="edit-notes">
            Notes
          </label>
          <textarea
            id="edit-notes"
            rows={3}
            maxLength={500}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
            }}
            className="md-textarea"
          />
          <p
            style={{
              textAlign: "right",
              fontSize: "0.75rem",
              color: "var(--md-outline)",
              margin: "4px 0 0",
            }}
          >
            {notes.length}/500
          </p>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "8px",
            flexDirection: "column",
          }}
        >
          <button
            onClick={() => void handleSaveAsTemplate()}
            style={{
              background: "none",
              border: "none",
              color: savedAsTemplate
                ? "var(--md-success)"
                : "var(--md-primary)",
              cursor: "pointer",
              fontSize: "0.8125rem",
              fontWeight: 500,
              padding: "6px 0",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              alignSelf: "flex-start",
              transition: "color 0.2s",
            }}
          >
            <span className="ms icon-16" aria-hidden="true">
              {savedAsTemplate ? "check" : "bookmark_add"}
            </span>
            {savedAsTemplate ? "Saved as template" : "Save as template"}
          </button>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={onClose}
              className="md-btn-outlined"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="md-btn-filled"
              style={{ flex: 2, opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
