import { useLiveQuery } from "dexie-react-hooks";
import { db, getSettings, updateSettings } from "../db/index.js";
import { useGeolocation } from "../contexts/GeolocationContext.tsx";
import { useTripTracker } from "../hooks/useTripTracker.js";

import { useBackgroundSync } from "../hooks/useBackgroundSync.js";
import { formatDistance } from "../lib/distance.js";
import {
  getRatesForYear,
  computeDeduction,
  formatCurrency,
} from "../lib/irsRates.js";
import { TRIP_PURPOSE_LABELS } from "../types/index.js";
import type {
  AppSettings,
  TripPurpose,
  TripTemplate,
  Vehicle,
} from "../types/index.js";
import { VEHICLE_TYPE_ICONS } from "../types/index.js";
import { useState, useEffect, useRef } from "react";
import { useWakeLock } from "../hooks/useWakeLock.js";
import { EndTripModal } from "../components/EndTripModal.js";
import { ManageTemplatesModal } from "../components/ManageTemplatesModal.js";
import { OdometerCapture } from "../components/OdometerCapture.js";

const PURPOSE_ICONS: Record<TripPurpose, string> = {
  business: "work",
  medical: "local_hospital",
  charity: "volunteer_activism",
  personal: "home",
};

export function DashboardPage() {
  const { coordinate, accuracy, isWatching, isSupported, error, start, stop } =
    useGeolocation();

  const zones = useLiveQuery(() => db.zones.toArray(), []) ?? [];
  const allTrips = useLiveQuery(() => db.trips.toArray(), []) ?? [];
  const vehicles =
    useLiveQuery<Vehicle[]>(() => db.vehicles.orderBy("name").toArray(), []) ??
    [];
  const templates =
    useLiveQuery<TripTemplate[]>(
      () => db.templates.orderBy("createdAt").toArray(),
      [],
    ) ?? [];

  const [settings, setSettings] = useState<AppSettings | null>(null);
  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  const [showEndModal, setShowEndModal] = useState(false);
  const [showManageTemplates, setShowManageTemplates] = useState(false);

  // Start-trip odometer sheet state
  const [pendingPurpose, setPendingPurpose] = useState<TripPurpose | null>(
    null,
  );
  const [pendingNotes, setPendingNotes] = useState<string>("");
  const [pendingVehicleId, setPendingVehicleId] = useState<number | null>(null);
  const [startOdomReading, setStartOdomReading] = useState("");
  const [startOdomPhoto, setStartOdomPhoto] = useState<string | null>(null);

  const {
    activeTrip,
    isTracking,
    currentMiles,
    startTrip,
    endTrip,
    discardTrip,
    addPitStop,
  } = useTripTracker(coordinate, accuracy, zones, settings);

  useBackgroundSync(isWatching);

  // ── Screen wake lock: keep display on while a trip is in progress ─────────
  useWakeLock(isTracking && (settings?.keepScreenOn ?? true));

  // ── Software dim overlay ──────────────────────────────────────────────────
  // null = auto (follow tracking+settings), true/false = user override
  const [userDimOverride, setUserDimOverride] = useState<boolean | null>(null);
  const undimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset user override when tracking stops (update-during-render pattern —
  // avoids setState-in-effect while keeping dim state in sync with tracking)
  const [prevIsTracking, setPrevIsTracking] = useState(false);
  if (prevIsTracking !== isTracking) {
    setPrevIsTracking(isTracking);
    if (!isTracking) {
      setUserDimOverride(null);
    }
  }

  // Clean up the undim timer when tracking stops or on unmount
  useEffect(() => {
    if (!isTracking) {
      if (undimTimerRef.current) {
        clearTimeout(undimTimerRef.current);
        undimTimerRef.current = null;
      }
    }
    return () => {
      if (undimTimerRef.current) clearTimeout(undimTimerRef.current);
    };
  }, [isTracking]);

  // Derived dim state: user override takes precedence, otherwise auto
  const isDimmed =
    userDimOverride ?? (isTracking && (settings?.autoDimWhenTracking ?? false));

  const handleDimTap = () => {
    setUserDimOverride(false);
    if (undimTimerRef.current) clearTimeout(undimTimerRef.current);
    // Re-dim after 6 s of inactivity
    undimTimerRef.current = setTimeout(() => {
      setUserDimOverride(null);
    }, 6000);
  };

  const currentYear = new Date().getFullYear();
  const rates = settings?.customIrsRates ?? getRatesForYear(currentYear);

  const completedTrips = allTrips.filter((t) => t.status === "completed");
  const totalMiles = completedTrips.reduce(
    (sum, t) => sum + t.distanceMiles,
    0,
  );
  const businessMiles = completedTrips
    .filter((t) => t.purpose === "business")
    .reduce((sum, t) => sum + t.distanceMiles, 0);
  const businessDeduction = computeDeduction(businessMiles, "business", rates);

  const openStartSheet = (purpose: TripPurpose, notes = "") => {
    setPendingPurpose(purpose);
    setPendingNotes(notes);
    // Default to the last used vehicle (stored in settings)
    setPendingVehicleId(settings?.activeVehicleId ?? null);
    setStartOdomReading("");
    setStartOdomPhoto(null);
  };

  const confirmStartTrip = () => {
    if (!pendingPurpose) return;
    const reading =
      startOdomReading.trim() !== "" ? parseFloat(startOdomReading) : null;
    const validReading = reading !== null && !isNaN(reading) ? reading : null;
    void startTrip(
      pendingPurpose,
      null,
      pendingNotes,
      validReading,
      startOdomPhoto,
      pendingVehicleId,
    );
    // Persist the chosen vehicle as the new default for next time
    void updateSettings({ activeVehicleId: pendingVehicleId });
    setPendingPurpose(null);
  };

  const handleEndTripConfirm = (
    notes: string,
    odometerEnd: number | null,
    odometerEndPhoto: string | null,
  ) => {
    setShowEndModal(false);
    void endTrip(null, notes, odometerEnd, odometerEndPhoto);
  };

  const handleEndTripDiscard = () => {
    setShowEndModal(false);
    void discardTrip();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <header style={{ paddingTop: "8px" }}>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "var(--md-on-surface)",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          OpenRoad{" "}
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--md-on-surface-variant)",
            margin: "4px 0 0",
          }}
        >
          {currentYear} Tax Year
        </p>
      </header>

      {/* GPS Status Card */}
      <div className="md-card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--md-on-surface)",
            }}
          >
            GPS Tracking
          </span>
          {isWatching ? (
            <span
              className="md-badge"
              style={{
                backgroundColor: "var(--md-success-container)",
                color: "var(--md-success)",
              }}
            >
              Active
            </span>
          ) : (
            <span
              className="md-badge"
              style={{
                backgroundColor: "var(--md-surface-container-highest)",
                color: "var(--md-on-surface-variant)",
              }}
            >
              Off
            </span>
          )}
        </div>

        {!isSupported && (
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--md-error)",
              marginBottom: "8px",
            }}
          >
            Geolocation is not supported by this browser.
          </p>
        )}
        {error && (
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--md-error)",
              marginBottom: "8px",
            }}
          >
            {error.message}
          </p>
        )}
        {coordinate && (
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--md-on-surface-variant)",
              marginBottom: "12px",
              fontFamily: "monospace",
            }}
          >
            {coordinate.lat.toFixed(5)}, {coordinate.lng.toFixed(5)}
            {accuracy !== null && ` (±${String(Math.round(accuracy))}m)`}
          </p>
        )}

        {!isWatching ? (
          <button
            onClick={start}
            disabled={!isSupported}
            className="md-btn-filled"
            style={{ width: "100%" }}
          >
            Enable GPS
          </button>
        ) : (
          <button
            onClick={stop}
            className="md-btn-outlined"
            style={{ width: "100%" }}
          >
            Disable GPS
          </button>
        )}
      </div>

      {/* Active Trip */}
      {isTracking && activeTrip && (
        <div
          className="md-card md-pulse-ring"
          style={{
            background:
              "linear-gradient(135deg, var(--md-primary-container) 0%, #001d36 100%)",
            border: "1.5px solid var(--md-primary)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--md-on-primary-container)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "var(--md-success)",
                  display: "inline-block",
                }}
              />
              Trip in Progress
            </span>
            <span
              className="md-badge"
              style={{
                backgroundColor: "rgba(0,0,0,0.3)",
                color: "var(--md-on-primary-container)",
                gap: "4px",
              }}
            >
              <span className="ms icon-16" aria-hidden="true">
                {PURPOSE_ICONS[activeTrip.purpose]}
              </span>
              {TRIP_PURPOSE_LABELS[activeTrip.purpose]}
            </span>
          </div>

          <p
            style={{
              fontSize: "3rem",
              fontWeight: 800,
              color: "var(--md-on-primary-container)",
              margin: "4px 0 8px",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {formatDistance(currentMiles, settings?.distanceUnit ?? "miles")}
          </p>

          {settings && currentMiles < settings.minTripDistanceMiles && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#ffb870",
                marginBottom: "12px",
              }}
            >
              Under {settings.minTripDistanceMiles.toFixed(1)} mi minimum — will
              be auto-discarded
            </p>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => {
                setShowEndModal(true);
              }}
              className="md-btn-filled"
              style={{
                flex: 1,
                backgroundColor: "var(--md-success)",
                color: "#002110",
              }}
            >
              End Trip
            </button>
            <button
              onClick={() => {
                addPitStop();
              }}
              className="md-btn-tonal"
              style={{ flexShrink: 0 }}
              aria-label="Add pit stop"
              title="Mark current location as a pit stop"
            >
              <span className="ms icon-20" aria-hidden="true">
                place
              </span>
            </button>
            <button
              onClick={() => {
                setUserDimOverride(!isDimmed);
              }}
              className="md-btn-tonal"
              style={{ flexShrink: 0 }}
              aria-label={isDimmed ? "Undim screen" : "Dim screen"}
              title="Dim screen while tracking"
            >
              <span className="ms icon-20" aria-hidden="true">
                {isDimmed ? "brightness_high" : "brightness_low"}
              </span>
            </button>
            <button
              onClick={() => void discardTrip()}
              className="md-btn-error-text"
              style={{
                flex: 1,
                backgroundColor: "rgba(255,180,171,0.1)",
                border: "1.5px solid rgba(255,180,171,0.3)",
                borderRadius: "100px",
              }}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Start Trip Odometer Sheet */}
      {pendingPurpose && (
        <div
          className="md-bottom-sheet"
          onClick={() => {
            setPendingPurpose(null);
          }}
        >
          <div className="md-bottom-sheet-scrim" />
          <div
            className="md-bottom-sheet-surface"
            style={{ maxWidth: "600px", width: "100%", margin: "0 auto" }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="md-bottom-sheet-handle" />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  color: "var(--md-on-surface)",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span className="ms icon-20" aria-hidden="true">
                  {PURPOSE_ICONS[pendingPurpose]}
                </span>
                Start {TRIP_PURPOSE_LABELS[pendingPurpose]} Trip
              </h2>
              <button
                onClick={() => {
                  setPendingPurpose(null);
                }}
                aria-label="Cancel"
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

            {/* Vehicle picker */}
            {vehicles.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <p className="md-field-label" style={{ marginBottom: "8px" }}>
                  Vehicle
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <button
                    onClick={() => {
                      setPendingVehicleId(null);
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "100px",
                      border: `1.5px solid ${pendingVehicleId === null ? "var(--md-primary)" : "var(--md-outline-variant)"}`,
                      backgroundColor:
                        pendingVehicleId === null
                          ? "var(--md-primary-container)"
                          : "transparent",
                      color:
                        pendingVehicleId === null
                          ? "var(--md-on-primary-container)"
                          : "var(--md-on-surface-variant)",
                      fontSize: "0.875rem",
                      fontWeight: pendingVehicleId === null ? 600 : 400,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    No vehicle
                  </button>
                  {vehicles.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setPendingVehicleId(v.id ?? null);
                      }}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "100px",
                        border: `1.5px solid ${pendingVehicleId === v.id ? "var(--md-primary)" : "var(--md-outline-variant)"}`,
                        backgroundColor:
                          pendingVehicleId === v.id
                            ? "var(--md-primary-container)"
                            : "transparent",
                        color:
                          pendingVehicleId === v.id
                            ? "var(--md-on-primary-container)"
                            : "var(--md-on-surface-variant)",
                        fontSize: "0.875rem",
                        fontWeight: pendingVehicleId === v.id ? 600 : 400,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span className="ms icon-16" aria-hidden="true">
                        {VEHICLE_TYPE_ICONS[v.vehicleType]}
                      </span>
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <OdometerCapture
              label="Start Odometer Reading (optional)"
              reading={startOdomReading}
              photo={startOdomPhoto}
              onReadingChange={setStartOdomReading}
              onPhotoChange={setStartOdomPhoto}
            />

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button
                onClick={() => {
                  setPendingPurpose(null);
                }}
                className="md-btn-outlined"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={confirmStartTrip}
                className="md-btn-filled"
                style={{
                  flex: 2,
                  backgroundColor: "var(--md-success)",
                  color: "#002110",
                }}
              >
                Start Trip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Trip Modal */}
      {showEndModal && activeTrip && (
        <EndTripModal
          miles={currentMiles}
          purpose={activeTrip.purpose}
          onConfirm={handleEndTripConfirm}
          onDiscard={handleEndTripDiscard}
          onCancel={() => {
            setShowEndModal(false);
          }}
        />
      )}

      {/* Manage Templates Modal */}
      {showManageTemplates && (
        <ManageTemplatesModal
          onClose={() => {
            setShowManageTemplates(false);
          }}
        />
      )}

      {/* Manual trip start */}
      {isWatching && !isTracking && (
        <div className="md-card">
          <p
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "var(--md-on-surface-variant)",
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Start a Trip
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            {(["business", "medical", "charity", "personal"] as const).map(
              (purpose) => (
                <button
                  key={purpose}
                  onClick={() => {
                    openStartSheet(purpose);
                  }}
                  className="md-btn-tonal"
                  style={{
                    flexDirection: "column",
                    height: "72px",
                    gap: "4px",
                    fontSize: "0.8125rem",
                  }}
                >
                  <span className="ms icon-24" aria-hidden="true">
                    {PURPOSE_ICONS[purpose]}
                  </span>
                  {TRIP_PURPOSE_LABELS[purpose]}
                </button>
              ),
            )}
          </div>
        </div>
      )}

      {/* Quick Start — template cards (only shown when GPS is on and no active trip) */}
      {isWatching && !isTracking && templates.length > 0 && (
        <div className="md-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
            }}
          >
            <p
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--md-on-surface-variant)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                margin: 0,
              }}
            >
              Quick Start
            </p>
            <button
              onClick={() => {
                setShowManageTemplates(true);
              }}
              aria-label="Manage templates"
              style={{
                background: "none",
                border: "none",
                color: "var(--md-primary)",
                cursor: "pointer",
                fontSize: "0.8125rem",
                fontWeight: 500,
                padding: "2px 4px",
                borderRadius: "4px",
              }}
            >
              Manage
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {templates.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => {
                  openStartSheet(tmpl.purpose, tmpl.notes);
                }}
                className="md-btn-tonal"
                style={{
                  justifyContent: "flex-start",
                  gap: "12px",
                  padding: "12px 16px",
                  height: "auto",
                  textAlign: "left",
                }}
              >
                <span
                  className="ms icon-20"
                  aria-hidden="true"
                  style={{ flexShrink: 0 }}
                >
                  {PURPOSE_ICONS[tmpl.purpose]}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      fontWeight: 600,
                      fontSize: "0.9375rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tmpl.name}
                  </span>
                  {tmpl.notes && (
                    <span
                      style={{
                        display: "block",
                        fontSize: "0.75rem",
                        color: "var(--md-on-surface-variant)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tmpl.notes}
                    </span>
                  )}
                </span>
                <span
                  className="ms icon-20"
                  aria-hidden="true"
                  style={{
                    color: "var(--md-on-surface-variant)",
                    flexShrink: 0,
                  }}
                >
                  arrow_forward
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manage Templates link (shown when GPS off or no templates yet) */}
      {!isTracking && (
        <button
          onClick={() => {
            setShowManageTemplates(true);
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--md-primary)",
            cursor: "pointer",
            fontSize: "0.8125rem",
            fontWeight: 500,
            padding: "4px 0",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            alignSelf: "flex-start",
          }}
        >
          <span className="ms icon-16" aria-hidden="true">
            bookmark
          </span>
          {templates.length === 0
            ? "Create a quick-start template"
            : "Manage templates"}
        </button>
      )}

      {/* YTD Stats */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
      >
        <div
          className="md-card-filled"
          style={{ textAlign: "center", padding: "20px 16px" }}
        >
          <p
            style={{
              fontSize: "0.6875rem",
              color: "var(--md-on-surface-variant)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "6px",
            }}
          >
            Total {settings?.distanceUnit === "kilometers" ? "Km" : "Miles"}
          </p>
          <p
            style={{
              fontSize: "1.625rem",
              fontWeight: 700,
              color: "var(--md-on-surface)",
              lineHeight: 1,
            }}
          >
            {formatDistance(totalMiles, settings?.distanceUnit ?? "miles", 1)}
          </p>
        </div>

        <div
          className="md-card-filled"
          style={{ textAlign: "center", padding: "20px 16px" }}
        >
          <p
            style={{
              fontSize: "0.6875rem",
              color: "var(--md-on-surface-variant)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "6px",
            }}
          >
            Business {settings?.distanceUnit === "kilometers" ? "Km" : "Miles"}
          </p>
          <p
            style={{
              fontSize: "1.625rem",
              fontWeight: 700,
              color: "var(--md-primary)",
              lineHeight: 1,
            }}
          >
            {formatDistance(
              businessMiles,
              settings?.distanceUnit ?? "miles",
              1,
            )}
          </p>
        </div>

        <div
          className="md-card-filled"
          style={{
            gridColumn: "1 / -1",
            padding: "20px 16px",
          }}
        >
          <p
            style={{
              fontSize: "0.6875rem",
              color: "var(--md-on-surface-variant)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "4px",
            }}
          >
            Est. Business Deduction ({currentYear})
          </p>
          <p
            style={{
              fontSize: "1.875rem",
              fontWeight: 800,
              color: "var(--md-success)",
              lineHeight: 1,
              marginBottom: "4px",
            }}
          >
            {formatCurrency(businessDeduction)}
          </p>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--md-on-surface-variant)",
            }}
          >
            @ {rates.business}¢/mi —{" "}
            {settings?.customIrsRates ? "custom rate" : "IRS standard rate"}
          </p>
        </div>
      </div>

      {/* Dim overlay — covers viewport above nav bar while tracking with screen dim on */}
      {isDimmed && isTracking && (
        <div
          role="button"
          aria-label="Screen dimmed — tap to temporarily restore brightness"
          onClick={handleDimTap}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: "calc(80px + env(safe-area-inset-bottom, 0px))", // Leave room for bottom nav
            zIndex: 9999,
            backgroundColor: `rgba(0,0,0,${String(settings?.dimLevel ?? 0.85)})`,
            cursor: "pointer",
          }}
        />
      )}
    </div>
  );
}
