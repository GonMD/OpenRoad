import { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSettings } from "../db/index.js";
import { formatDistance } from "../lib/distance.js";
import { TRIP_PURPOSE_LABELS, VEHICLE_TYPE_ICONS } from "../types/index.js";
import type {
  Trip,
  TripPurpose,
  DistanceUnit,
  Vehicle,
} from "../types/index.js";

const EMPTY_VEHICLES: Vehicle[] = [];
import { EditTripModal } from "../components/EditTripModal.js";
import { TripMap } from "../components/TripMap.js";

const PURPOSE_BADGE_CLASS: Record<TripPurpose, string> = {
  business: "badge-business",
  medical: "badge-medical",
  charity: "badge-charity",
  personal: "badge-personal",
};

function TripCard({
  trip,
  distanceUnit,
  vehicleMap,
  onEdit,
}: {
  trip: Trip;
  distanceUnit: DistanceUnit;
  vehicleMap: Map<number, Vehicle>;
  onEdit: (trip: Trip) => void;
}) {
  const [showMap, setShowMap] = useState(false);

  const date = trip.startedAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const startTime = fmt(trip.startedAt);
  const endTime = trip.endedAt ? fmt(trip.endedAt) : null;

  // Only show end date if it's a different calendar day than the start
  const endDateStr =
    trip.endedAt &&
    trip.endedAt.toDateString() !== trip.startedAt.toDateString()
      ? trip.endedAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : null;

  const handleDelete = async () => {
    if (trip.id === undefined) return;
    if (!window.confirm("Delete this trip?")) return;
    await db.trips.delete(trip.id);
  };

  return (
    <div className="md-card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Clickable header row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
          cursor: "pointer",
          transition: "background-color 0.15s",
          padding: "14px 16px",
        }}
        onClick={() => {
          onEdit(trip);
        }}
        role="button"
        tabIndex={0}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.backgroundColor =
            "var(--md-surface-container-high)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.backgroundColor =
            "transparent";
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onEdit(trip);
        }}
      >
        {/* Left: trip details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "6px",
            }}
          >
            <span className={`md-badge ${PURPOSE_BADGE_CLASS[trip.purpose]}`}>
              {TRIP_PURPOSE_LABELS[trip.purpose]}
            </span>
            {trip.vehicleId !== null && vehicleMap.has(trip.vehicleId) && (
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--md-on-surface-variant)",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <span className="ms icon-14" aria-hidden="true">
                  {
                    VEHICLE_TYPE_ICONS[
                      vehicleMap.get(trip.vehicleId)?.vehicleType ?? "car"
                    ]
                  }
                </span>
                {vehicleMap.get(trip.vehicleId)?.name}
              </span>
            )}
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--md-on-surface-variant)",
              }}
            >
              {date}
            </span>
          </div>
          <p
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--md-on-surface)",
              margin: 0,
            }}
          >
            {formatDistance(trip.distanceMiles, distanceUnit)}
          </p>

          {/* Start → End time */}
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--md-on-surface-variant)",
              margin: "2px 0 0",
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <span className="ms icon-14" aria-hidden="true">
              schedule
            </span>
            {startTime}
            {endTime && (
              <>
                <span aria-hidden="true" style={{ color: "var(--md-outline)" }}>
                  →
                </span>
                {endDateStr && (
                  <span style={{ color: "var(--md-outline)" }}>
                    {endDateStr}
                  </span>
                )}
                {endTime}
              </>
            )}
          </p>

          {/* Origin → Destination addresses */}
          {(trip.originAddress ?? trip.destinationAddress) && (
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--md-on-surface-variant)",
                marginTop: "4px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {trip.originAddress ?? "—"}{" "}
              <span aria-hidden="true" style={{ color: "var(--md-outline)" }}>
                →
              </span>{" "}
              {trip.destinationAddress ?? "—"}
            </p>
          )}

          {/* Pit stops */}
          {trip.pitStops.length > 0 && (
            <div
              style={{
                marginTop: "6px",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              {trip.pitStops.map((ps, idx) => (
                <p
                  key={idx}
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--md-outline)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span
                    className="ms icon-16"
                    aria-hidden="true"
                    style={{ flexShrink: 0 }}
                  >
                    place
                  </span>
                  {ps.address ?? ps.label}
                  <span style={{ color: "var(--md-outline)", opacity: 0.6 }}>
                    · {ps.milesFromOrigin.toFixed(1)} mi
                  </span>
                </p>
              ))}
            </div>
          )}

          {trip.notes && (
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--md-on-surface-variant)",
                marginTop: "4px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {trip.notes}
            </p>
          )}

          {/* Odometer span */}
          {(trip.odometerStart !== null || trip.odometerEnd !== null) && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--md-on-surface-variant)",
                marginTop: "4px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span className="ms icon-14" aria-hidden="true">
                speed
              </span>
              {trip.odometerStart !== null
                ? trip.odometerStart.toLocaleString()
                : "—"}
              <span aria-hidden="true" style={{ color: "var(--md-outline)" }}>
                →
              </span>
              {trip.odometerEnd !== null
                ? trip.odometerEnd.toLocaleString()
                : "—"}
            </p>
          )}
        </div>

        {/* Right: action buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMap((v) => !v);
            }}
            aria-label={showMap ? "Hide map" : "Show map"}
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
            <span className="ms icon-20" aria-hidden="true">
              map
            </span>
          </button>
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--md-primary)",
              fontWeight: 500,
            }}
          >
            Edit
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              void handleDelete();
            }}
            aria-label="Delete trip"
            style={{
              background: "none",
              border: "none",
              color: "var(--md-on-surface-variant)",
              cursor: "pointer",
              fontSize: "1.375rem",
              lineHeight: 1,
              padding: "4px",
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

      {/* Lazy trip path map — rendered below the header row, inside the card */}
      {showMap && trip.id !== undefined && (
        <div
          style={{ padding: "0 16px 16px" }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <TripMap tripId={trip.id} />
        </div>
      )}
    </div>
  );
}

export function TripsPage() {
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>("miles");

  useEffect(() => {
    void getSettings().then((s) => {
      setDistanceUnit(s.distanceUnit);
    });
  }, []);

  const trips =
    useLiveQuery(
      () =>
        db.trips
          .where("status")
          .equals("completed")
          .reverse()
          .sortBy("startedAt"),
      [],
    ) ?? [];

  const vehicles =
    useLiveQuery<Vehicle[]>(() => db.vehicles.toArray(), []) ?? EMPTY_VEHICLES;

  const vehicleMap = useMemo(() => {
    const m = new Map<number, Vehicle>();
    for (const v of vehicles) {
      if (v.id !== undefined) m.set(v.id, v);
    }
    return m;
  }, [vehicles]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <header style={{ paddingTop: "8px" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--md-on-surface)",
            margin: 0,
          }}
        >
          Trips
        </h1>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--md-on-surface-variant)",
            margin: "4px 0 0",
          }}
        >
          {trips.length} completed
        </p>
      </header>

      {trips.length === 0 ? (
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
              directions_car
            </span>
          </p>
          <p
            style={{
              color: "var(--md-on-surface)",
              fontWeight: 600,
              marginBottom: "4px",
            }}
          >
            No trips yet
          </p>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--md-on-surface-variant)",
            }}
          >
            Enable GPS on the Dashboard and drive between your zones.
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
          {trips.map((trip) => (
            <li key={trip.id}>
              <TripCard
                trip={trip}
                distanceUnit={distanceUnit}
                vehicleMap={vehicleMap}
                onEdit={setEditingTrip}
              />
            </li>
          ))}
        </ul>
      )}

      {editingTrip && (
        <EditTripModal
          trip={editingTrip}
          onClose={() => {
            setEditingTrip(null);
          }}
        />
      )}
    </div>
  );
}
