import { useState, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  getSettings,
  updateSettings,
  purgeOldLocationSamples,
} from "../db/index.js";
import { IRS_RATES } from "../lib/irsRates.js";
import { exportBackup, importBackup } from "../lib/backup.js";
import { useThemeContext } from "../contexts/ThemeContext.js";
import { ManageVehiclesModal } from "../components/ManageVehiclesModal.js";
import { vehicleLabel } from "../lib/vehicleLabel.js";
import type { AppSettings, IrsRates, Vehicle } from "../types/index.js";

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      <p className="md-section-header">{title}</p>
      <div
        className="md-card"
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        {children}
      </div>
    </section>
  );
}

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [customBusiness, setCustomBusiness] = useState("");
  const [customMedical, setCustomMedical] = useState("");
  const [customCharity, setCustomCharity] = useState("");
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [purgeStatus, setPurgeStatus] = useState<string | null>(null);
  const [showManageVehicles, setShowManageVehicles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useThemeContext();

  const vehicles =
    useLiveQuery<Vehicle[]>(
      () => db.vehicles.orderBy("createdAt").toArray(),
      [],
    ) ?? [];

  useEffect(() => {
    void getSettings().then((s) => {
      setSettings(s);
      if (s.customIrsRates) {
        setCustomBusiness(String(s.customIrsRates.business));
        setCustomMedical(String(s.customIrsRates.medical));
        setCustomCharity(String(s.customIrsRates.charity));
      }
    });
  }, []);

  if (!settings) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "128px",
        }}
      >
        <span className="md-spinner" />
      </div>
    );
  }

  const flash = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
    }, 2000);
  };

  const handleChange = async (patch: Partial<Omit<AppSettings, "id">>) => {
    await updateSettings(patch);
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
    flash();
  };

  const handleSaveCustomRates = async () => {
    const business = parseFloat(customBusiness);
    const medical = parseFloat(customMedical);
    const charity = parseFloat(customCharity);
    if (isNaN(business) || isNaN(medical) || isNaN(charity)) return;
    const customRates: IrsRates = {
      year: new Date().getFullYear(),
      business,
      medical,
      charity,
    };
    await handleChange({ customIrsRates: customRates });
  };

  const handleClearCustomRates = async () => {
    setCustomBusiness("");
    setCustomMedical("");
    setCustomCharity("");
    await handleChange({ customIrsRates: null });
  };

  const latestRates = IRS_RATES[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "8px",
          paddingBottom: "8px",
        }}
      >
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--md-on-surface)",
            margin: 0,
          }}
        >
          Settings
        </h1>
        {saved && (
          <span
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "var(--md-success)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            ✓ Saved
          </span>
        )}
      </div>

      {/* Distance Unit */}
      <SectionCard title="Distance Unit">
        <div style={{ display: "flex", gap: "8px" }}>
          {(["miles", "kilometers"] as const).map((unit) => (
            <button
              key={unit}
              onClick={() => void handleChange({ distanceUnit: unit })}
              className={
                settings.distanceUnit === unit
                  ? "md-btn-filled"
                  : "md-btn-outlined"
              }
              style={{ flex: 1 }}
            >
              {unit.charAt(0).toUpperCase() + unit.slice(1)}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Appearance */}
      <SectionCard title="Appearance">
        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
          }}
        >
          <div>
            <span
              style={{ fontSize: "0.9375rem", color: "var(--md-on-surface)" }}
            >
              Light mode
            </span>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--md-on-surface-variant)",
                margin: "2px 0 0",
              }}
            >
              {theme === "light" ? "Light theme active" : "Dark theme active"}
            </p>
          </div>
          <input
            type="checkbox"
            checked={theme === "light"}
            onChange={toggleTheme}
            className="md-switch"
          />
        </label>
      </SectionCard>

      {/* Vehicle */}
      <SectionCard title="Vehicle">
        {vehicles.length === 0 ? (
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--md-on-surface-variant)",
              margin: 0,
            }}
          >
            No vehicles added yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* "None" option */}
            <button
              onClick={() => void handleChange({ activeVehicleId: null })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 12px",
                borderRadius: "12px",
                backgroundColor:
                  settings.activeVehicleId === null
                    ? "var(--md-primary-container)"
                    : "var(--md-surface-container-high)",
                border:
                  settings.activeVehicleId === null
                    ? "1.5px solid var(--md-primary)"
                    : "1.5px solid transparent",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                transition: "background-color 0.15s, border-color 0.15s",
              }}
            >
              <span
                className="ms icon-20"
                aria-hidden="true"
                style={{
                  color:
                    settings.activeVehicleId === null
                      ? "var(--md-primary)"
                      : "var(--md-on-surface-variant)",
                  flexShrink: 0,
                }}
              >
                do_not_disturb_on
              </span>
              <span
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  color:
                    settings.activeVehicleId === null
                      ? "var(--md-on-primary-container)"
                      : "var(--md-on-surface)",
                }}
              >
                No vehicle
              </span>
              {settings.activeVehicleId === null && (
                <span
                  className="ms icon-20"
                  aria-hidden="true"
                  style={{ color: "var(--md-primary)", marginLeft: "auto" }}
                >
                  check
                </span>
              )}
            </button>

            {vehicles.map((v) => (
              <button
                key={v.id}
                onClick={() =>
                  void handleChange({ activeVehicleId: v.id ?? null })
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  backgroundColor:
                    settings.activeVehicleId === v.id
                      ? "var(--md-primary-container)"
                      : "var(--md-surface-container-high)",
                  border:
                    settings.activeVehicleId === v.id
                      ? "1.5px solid var(--md-primary)"
                      : "1.5px solid transparent",
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                  transition: "background-color 0.15s, border-color 0.15s",
                }}
              >
                <span
                  className="ms icon-20"
                  aria-hidden="true"
                  style={{
                    color:
                      settings.activeVehicleId === v.id
                        ? "var(--md-primary)"
                        : "var(--md-on-surface-variant)",
                    flexShrink: 0,
                  }}
                >
                  directions_car
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: settings.activeVehicleId === v.id ? 600 : 400,
                      fontSize: "0.9375rem",
                      color:
                        settings.activeVehicleId === v.id
                          ? "var(--md-on-primary-container)"
                          : "var(--md-on-surface)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {vehicleLabel(v)}
                  </p>
                </div>
                {settings.activeVehicleId === v.id && (
                  <span
                    className="ms icon-20"
                    aria-hidden="true"
                    style={{ color: "var(--md-primary)", flexShrink: 0 }}
                  >
                    check
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => {
            setShowManageVehicles(true);
          }}
          className="md-btn-tonal"
          style={{ width: "100%", gap: "8px" }}
        >
          <span className="ms icon-20" aria-hidden="true">
            garage
          </span>
          Manage Vehicles
        </button>
      </SectionCard>

      {/* GPS Accuracy */}
      <SectionCard title="GPS Accuracy">
        <div className="md-field">
          <label className="md-field-label" htmlFor="accuracy-threshold">
            Ignore readings worse than (meters)
          </label>
          <input
            id="accuracy-threshold"
            type="number"
            min="10"
            max="500"
            value={settings.maxAccuracyThresholdMeters}
            onChange={(e) =>
              void handleChange({
                maxAccuracyThresholdMeters: parseInt(e.target.value, 10),
              })
            }
            className="md-input"
          />
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
          }}
        >
          <span
            style={{ fontSize: "0.9375rem", color: "var(--md-on-surface)" }}
          >
            Show accuracy warnings
          </span>
          <input
            type="checkbox"
            checked={settings.showAccuracyWarnings}
            onChange={(e) =>
              void handleChange({ showAccuracyWarnings: e.target.checked })
            }
            className="md-switch"
          />
        </label>
      </SectionCard>

      {/* Minimum Trip Distance */}
      <SectionCard title="Minimum Trip Distance">
        <div className="md-field">
          <label className="md-field-label" htmlFor="min-trip-distance">
            Auto-discard trips shorter than (miles)
          </label>
          <input
            id="min-trip-distance"
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={settings.minTripDistanceMiles}
            onChange={(e) =>
              void handleChange({
                minTripDistanceMiles: parseFloat(e.target.value),
              })
            }
            className="md-input"
          />
        </div>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--md-on-surface-variant)",
            margin: 0,
          }}
        >
          Trips under this distance are silently discarded when ended.
        </p>
      </SectionCard>

      {/* IRS Rates */}
      <SectionCard title="IRS Mileage Rates">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--md-on-surface-variant)",
              margin: 0,
            }}
          >
            Built-in rates ({latestRates.year})
          </p>
          {settings.customIrsRates && (
            <span
              className="md-badge"
              style={{ backgroundColor: "#2d1600", color: "#ffb870" }}
            >
              Custom
            </span>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "12px",
          }}
        >
          {(["business", "medical", "charity"] as const).map((key) => (
            <div
              key={key}
              className="md-card-filled"
              style={{ textAlign: "center", padding: "12px 8px" }}
            >
              <p
                style={{
                  fontSize: "0.6875rem",
                  color: "var(--md-on-surface-variant)",
                  margin: "0 0 4px",
                  textTransform: "capitalize",
                }}
              >
                {key}
              </p>
              <p
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--md-on-surface)",
                  margin: 0,
                }}
              >
                {latestRates[key]}¢
              </p>
            </div>
          ))}
        </div>

        <hr className="md-divider" />

        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--md-on-surface-variant)",
            margin: 0,
          }}
        >
          Override with custom rates (¢/mi):
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "12px",
          }}
        >
          {[
            {
              id: "custom-business",
              label: "Business",
              value: customBusiness,
              setter: setCustomBusiness,
            },
            {
              id: "custom-medical",
              label: "Medical",
              value: customMedical,
              setter: setCustomMedical,
            },
            {
              id: "custom-charity",
              label: "Charity",
              value: customCharity,
              setter: setCustomCharity,
            },
          ].map(({ id, label, value, setter }) => (
            <div key={id} className="md-field">
              <label className="md-field-label" htmlFor={id}>
                {label}
              </label>
              <input
                id={id}
                type="number"
                min="0"
                max="200"
                step="0.5"
                placeholder={String(
                  latestRates[
                    id.replace("custom-", "") as
                      | "business"
                      | "medical"
                      | "charity"
                  ],
                )}
                value={value}
                onChange={(e) => {
                  setter(e.target.value);
                }}
                className="md-input"
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => void handleSaveCustomRates()}
            className="md-btn-filled"
            style={{ flex: 1 }}
          >
            Save Custom Rates
          </button>
          {settings.customIrsRates && (
            <button
              onClick={() => void handleClearCustomRates()}
              className="md-btn-outlined"
              style={{ flex: 1 }}
            >
              Use Built-in
            </button>
          )}
        </div>
      </SectionCard>

      {/* Employer Reimbursement */}
      <SectionCard title="Employer Reimbursement">
        <div className="md-field">
          <label className="md-field-label" htmlFor="employer-rate">
            Employer rate (cents per mile, 0 = not tracked)
          </label>
          <input
            id="employer-rate"
            type="number"
            min="0"
            max="200"
            step="0.5"
            value={settings.employerReimbursementCents}
            onChange={(e) =>
              void handleChange({
                employerReimbursementCents: parseFloat(e.target.value),
              })
            }
            className="md-input"
          />
        </div>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--md-on-surface-variant)",
            margin: 0,
          }}
        >
          Reports will show the gap between the IRS standard rate and your
          employer's rate.
        </p>
      </SectionCard>

      {/* Location Data Retention */}
      <SectionCard title="Location Data Retention">
        <div className="md-field">
          <label className="md-field-label" htmlFor="sample-max-age">
            Delete GPS breadcrumbs older than (days, 0 = keep forever)
          </label>
          <input
            id="sample-max-age"
            type="number"
            min="0"
            max="730"
            step="1"
            value={settings.locationSampleMaxAgeDays}
            onChange={(e) =>
              void handleChange({
                locationSampleMaxAgeDays: parseInt(e.target.value, 10),
              })
            }
            className="md-input"
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => {
              void purgeOldLocationSamples().then(() => {
                setPurgeStatus("Purged.");
                setTimeout(() => {
                  setPurgeStatus(null);
                }, 2500);
              });
            }}
            className="md-btn-tonal"
            style={{ flex: 1 }}
          >
            Purge Now
          </button>
          {purgeStatus && (
            <span
              style={{
                fontSize: "0.8125rem",
                color: "var(--md-success)",
                fontWeight: 600,
              }}
            >
              ✓ {purgeStatus}
            </span>
          )}
        </div>
      </SectionCard>

      {/* Backup & Restore */}
      <SectionCard title="Backup & Restore">
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--md-on-surface-variant)",
            margin: 0,
          }}
        >
          Export all trips, zones, and settings to a JSON file, or restore from
          a previous backup.
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => void exportBackup()}
            className="md-btn-tonal"
            style={{ flex: 1 }}
          >
            Export Backup
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="md-btn-outlined"
            style={{ flex: 1 }}
          >
            Restore Backup
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setRestoreStatus(null);
            setRestoreError(null);
            if (
              !window.confirm(
                "Restoring will overwrite ALL current data. Continue?",
              )
            ) {
              e.target.value = "";
              return;
            }
            void importBackup(file)
              .then((msg) => {
                setRestoreStatus(msg);
                e.target.value = "";
              })
              .catch((err: unknown) => {
                setRestoreError(
                  err instanceof Error ? err.message : "Restore failed.",
                );
                e.target.value = "";
              });
          }}
        />
        {restoreStatus && (
          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--md-success)",
              margin: 0,
            }}
          >
            ✓ {restoreStatus}
          </p>
        )}
        {restoreError && (
          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--md-error)",
              margin: 0,
            }}
          >
            {restoreError}
          </p>
        )}
      </SectionCard>

      {/* Danger zone */}
      <SectionCard title="Data">
        <button
          onClick={() => {
            if (
              window.confirm(
                "Delete ALL trips, zones, and settings? This cannot be undone.",
              )
            ) {
              void Promise.all([
                db.trips.clear(),
                db.zones.clear(),
                db.locationSamples.clear(),
              ]);
            }
          }}
          className="md-btn-error-text"
          style={{
            width: "100%",
            border: "1.5px solid rgba(255,180,171,0.3)",
            borderRadius: "100px",
            padding: "12px",
          }}
        >
          Clear All Data
        </button>
      </SectionCard>

      <p
        style={{
          fontSize: "0.75rem",
          textAlign: "center",
          color: "var(--md-outline)",
          padding: "16px 0",
        }}
      >
        OpenRoad v0.1.0 — All data stored locally on this device.
      </p>

      {showManageVehicles && (
        <ManageVehiclesModal
          onClose={() => {
            setShowManageVehicles(false);
          }}
        />
      )}
    </div>
  );
}
