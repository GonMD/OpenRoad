import { useState, useEffect } from "react";
import { db, getSettings, updateSettings } from "../db/index.js";
import { IRS_RATES } from "../lib/irsRates.js";
import type { AppSettings, IrsRates } from "../types/index.js";

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);
  // Local state for custom rate fields (string so inputs are controlled cleanly)
  const [customBusiness, setCustomBusiness] = useState("");
  const [customMedical, setCustomMedical] = useState("");
  const [customCharity, setCustomCharity] = useState("");

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
      <div className="flex items-center justify-center h-32">
        <p className="text-slate-400 text-sm">Loading settings…</p>
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

  // IRS_RATES is typed as non-empty tuple; first element is always defined
  const latestRates = IRS_RATES[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Settings</h1>
        {saved && (
          <span className="text-xs text-green-400 font-medium">Saved</span>
        )}
      </div>

      {/* Distance Unit */}
      <section className="bg-slate-800 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">Distance Unit</h2>
        <div className="flex gap-2">
          {(["miles", "kilometers"] as const).map((unit) => (
            <button
              key={unit}
              onClick={() => void handleChange({ distanceUnit: unit })}
              className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors ${
                settings.distanceUnit === unit
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {unit.charAt(0).toUpperCase() + unit.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* GPS Accuracy */}
      <section className="bg-slate-800 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">GPS Accuracy</h2>
        <div className="space-y-1">
          <label
            className="text-xs text-slate-400"
            htmlFor="accuracy-threshold"
          >
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
            className="w-full bg-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.showAccuracyWarnings}
            onChange={(e) =>
              void handleChange({ showAccuracyWarnings: e.target.checked })
            }
            className="rounded"
          />
          <span className="text-sm text-slate-300">Show accuracy warnings</span>
        </label>
      </section>

      {/* Minimum Trip Distance */}
      <section className="bg-slate-800 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">
          Minimum Trip Distance
        </h2>
        <div className="space-y-1">
          <label className="text-xs text-slate-400" htmlFor="min-trip-distance">
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
            className="w-full bg-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <p className="text-xs text-slate-500">
          Trips under this distance are silently discarded when ended.
        </p>
      </section>

      {/* IRS Rates */}
      <section className="bg-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">
            IRS Mileage Rates
          </h2>
          {settings.customIrsRates && (
            <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-0.5 rounded-full">
              Custom
            </span>
          )}
        </div>

        {/* Built-in rates display */}
        <div className="space-y-1">
          <p className="text-xs text-slate-500">
            Built-in rates ({latestRates.year})
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
            <div>
              <p>Business</p>
              <p className="text-slate-100 font-medium">
                {latestRates.business}¢/mi
              </p>
            </div>
            <div>
              <p>Medical</p>
              <p className="text-slate-100 font-medium">
                {latestRates.medical}¢/mi
              </p>
            </div>
            <div>
              <p>Charity</p>
              <p className="text-slate-100 font-medium">
                {latestRates.charity}¢/mi
              </p>
            </div>
          </div>
        </div>

        {/* Custom rate override inputs */}
        <div className="space-y-2 pt-1">
          <p className="text-xs text-slate-400">
            Override with custom rates (cents per mile):
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label
                className="text-xs text-slate-500"
                htmlFor="custom-business"
              >
                Business
              </label>
              <input
                id="custom-business"
                type="number"
                min="0"
                max="200"
                step="0.5"
                placeholder={String(latestRates.business)}
                value={customBusiness}
                onChange={(e) => {
                  setCustomBusiness(e.target.value);
                }}
                className="w-full bg-slate-700 text-slate-100 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label
                className="text-xs text-slate-500"
                htmlFor="custom-medical"
              >
                Medical
              </label>
              <input
                id="custom-medical"
                type="number"
                min="0"
                max="200"
                step="0.5"
                placeholder={String(latestRates.medical)}
                value={customMedical}
                onChange={(e) => {
                  setCustomMedical(e.target.value);
                }}
                className="w-full bg-slate-700 text-slate-100 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label
                className="text-xs text-slate-500"
                htmlFor="custom-charity"
              >
                Charity
              </label>
              <input
                id="custom-charity"
                type="number"
                min="0"
                max="200"
                step="0.5"
                placeholder={String(latestRates.charity)}
                value={customCharity}
                onChange={(e) => {
                  setCustomCharity(e.target.value);
                }}
                className="w-full bg-slate-700 text-slate-100 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => void handleSaveCustomRates()}
              className="flex-1 bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              Save Custom Rates
            </button>
            {settings.customIrsRates && (
              <button
                onClick={() => void handleClearCustomRates()}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium py-2 rounded-lg transition-colors"
              >
                Use Built-in
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Location Data Retention */}
      <section className="bg-slate-800 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">
          Location Data Retention
        </h2>
        <div className="space-y-1">
          <label className="text-xs text-slate-400" htmlFor="sample-max-age">
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
            className="w-full bg-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </section>

      {/* Data */}
      <section className="bg-slate-800 rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">Data</h2>
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
          className="w-full bg-red-900 hover:bg-red-800 text-red-200 text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          Clear All Data
        </button>
      </section>

      <p className="text-xs text-center text-slate-600">
        MileageCalc v0.1.0 — All data stored locally on this device.
      </p>
    </div>
  );
}
