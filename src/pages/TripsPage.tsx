import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/index.js";
import { formatMiles } from "../lib/distance.js";
import { TRIP_PURPOSE_LABELS } from "../types/index.js";
import type { Trip, TripPurpose } from "../types/index.js";

const PURPOSE_COLORS: Record<TripPurpose, string> = {
  business: "bg-blue-900 text-blue-300",
  medical: "bg-purple-900 text-purple-300",
  charity: "bg-yellow-900 text-yellow-300",
  personal: "bg-slate-700 text-slate-400",
};

function TripCard({ trip }: { trip: Trip }) {
  const date = trip.startedAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleDelete = async () => {
    if (trip.id === undefined) return;
    if (!window.confirm("Delete this trip?")) return;
    await db.trips.delete(trip.id);
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${PURPOSE_COLORS[trip.purpose]}`}
          >
            {TRIP_PURPOSE_LABELS[trip.purpose]}
          </span>
          <span className="text-xs text-slate-500">{date}</span>
        </div>
        <p className="text-lg font-semibold text-slate-100">
          {formatMiles(trip.distanceMiles)}
        </p>
        {trip.notes && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{trip.notes}</p>
        )}
      </div>
      <button
        onClick={() => void handleDelete()}
        aria-label="Delete trip"
        className="text-slate-600 hover:text-red-400 transition-colors text-lg leading-none mt-0.5"
      >
        ×
      </button>
    </div>
  );
}

export function TripsPage() {
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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-100">Trips</h1>

      {trips.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-8 text-center">
          <p className="text-slate-400">No completed trips yet.</p>
          <p className="text-slate-500 text-sm mt-1">
            Enable GPS on the Dashboard and drive between your zones.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {trips.map((trip) => (
            <li key={trip.id}>
              <TripCard trip={trip} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
