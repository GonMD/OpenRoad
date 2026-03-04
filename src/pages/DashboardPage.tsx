import { useLiveQuery } from "dexie-react-hooks";
import { db, getSettings } from "../db/index.js";
import { useGeolocation } from "../hooks/useGeolocation.js";
import { useTripTracker } from "../hooks/useTripTracker.js";
import { formatMiles } from "../lib/distance.js";
import {
  getRatesForYear,
  computeDeduction,
  formatCurrency,
} from "../lib/irsRates.js";
import { TRIP_PURPOSE_LABELS } from "../types/index.js";
import type { AppSettings } from "../types/index.js";
import { useState, useEffect } from "react";
import { EndTripModal } from "../components/EndTripModal.js";

export function DashboardPage() {
  const { coordinate, accuracy, isWatching, isSupported, error, start, stop } =
    useGeolocation();

  const zones = useLiveQuery(() => db.zones.toArray(), []) ?? [];
  const allTrips = useLiveQuery(() => db.trips.toArray(), []) ?? [];

  const [settings, setSettings] = useState<AppSettings | null>(null);
  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  const [showEndModal, setShowEndModal] = useState(false);

  const {
    activeTrip,
    isTracking,
    currentMiles,
    startTrip,
    endTrip,
    discardTrip,
  } = useTripTracker(coordinate, accuracy, zones, settings);

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

  const handleEndTripConfirm = (notes: string) => {
    setShowEndModal(false);
    void endTrip(null, notes);
  };

  const handleEndTripDiscard = () => {
    setShowEndModal(false);
    void discardTrip();
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-100">MileageCalc</h1>
        <p className="text-slate-400 text-sm">{currentYear} Tax Year</p>
      </header>

      {/* GPS Status */}
      <section className="bg-slate-800 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">GPS</span>
          {isWatching ? (
            <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full">
              Active
            </span>
          ) : (
            <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
              Off
            </span>
          )}
        </div>
        {!isSupported && (
          <p className="text-red-400 text-sm">
            Geolocation is not supported by this browser.
          </p>
        )}
        {error && <p className="text-red-400 text-sm">{error.message}</p>}
        {coordinate && (
          <p className="text-slate-400 text-xs">
            {coordinate.lat.toFixed(5)}, {coordinate.lng.toFixed(5)}
            {accuracy !== null && ` (±${String(Math.round(accuracy))}m)`}
          </p>
        )}
        <div className="flex gap-2 pt-1">
          {!isWatching ? (
            <button
              onClick={start}
              disabled={!isSupported}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              Enable GPS
            </button>
          ) : (
            <button
              onClick={stop}
              className="flex-1 bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              Disable GPS
            </button>
          )}
        </div>
      </section>

      {/* Active Trip */}
      {isTracking && activeTrip && (
        <section className="bg-blue-900/40 border border-blue-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-blue-300">
              Trip in Progress
            </span>
            <span className="text-xs text-blue-400">
              {TRIP_PURPOSE_LABELS[activeTrip.purpose]}
            </span>
          </div>
          <p className="text-3xl font-bold text-white">
            {formatMiles(currentMiles)}
          </p>
          {settings && currentMiles < settings.minTripDistanceMiles && (
            <p className="text-xs text-yellow-400">
              Under {settings.minTripDistanceMiles.toFixed(1)} mi minimum — trip
              will be auto-discarded on end
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowEndModal(true);
              }}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              End Trip
            </button>
            <button
              onClick={() => void discardTrip()}
              className="flex-1 bg-red-900 hover:bg-red-800 text-red-200 text-sm font-medium py-2 rounded-lg transition-colors"
            >
              Discard
            </button>
          </div>
        </section>
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

      {/* Manual trip start (when GPS is on and not tracking) */}
      {isWatching && !isTracking && (
        <section className="bg-slate-800 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-slate-300">Start a Trip</p>
          <div className="grid grid-cols-2 gap-2">
            {(["business", "medical", "charity", "personal"] as const).map(
              (purpose) => (
                <button
                  key={purpose}
                  onClick={() => void startTrip(purpose)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium py-2.5 rounded-lg transition-colors capitalize"
                >
                  {TRIP_PURPOSE_LABELS[purpose]}
                </button>
              ),
            )}
          </div>
        </section>
      )}

      {/* YTD Stats */}
      <section className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Total Miles</p>
          <p className="text-xl font-bold text-slate-100">
            {formatMiles(totalMiles, 1)}
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1">Business Miles</p>
          <p className="text-xl font-bold text-slate-100">
            {formatMiles(businessMiles, 1)}
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 col-span-2">
          <p className="text-xs text-slate-400 mb-1">
            Est. Business Deduction ({currentYear})
          </p>
          <p className="text-xl font-bold text-green-400">
            {formatCurrency(businessDeduction)}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            @ {rates.business}¢/mi{" "}
            {settings?.customIrsRates ? "custom rate" : "IRS standard rate"}
          </p>
        </div>
      </section>
    </div>
  );
}
