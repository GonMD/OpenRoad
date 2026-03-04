import Dexie, { type EntityTable } from "dexie";
import type {
  Trip,
  Zone,
  LocationSample,
  AppSettings,
} from "../types/index.js";

// ─── Database Schema ──────────────────────────────────────────────────────────

class MileageCalcDB extends Dexie {
  trips!: EntityTable<Trip, "id">;
  zones!: EntityTable<Zone, "id">;
  locationSamples!: EntityTable<LocationSample, "id">;
  settings!: EntityTable<AppSettings, "id">;

  constructor() {
    super("MileageCalcDB");

    this.version(1).stores({
      // prettier-ignore
      trips: "++id, purpose, status, originZoneId, destinationZoneId, startedAt, endedAt, createdAt",
      zones: "++id, name, createdAt",
      locationSamples: "++id, tripId, timestamp",
      settings: "++id",
    });
  }
}

export const db = new MileageCalcDB();

// ─── Default Settings ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: Omit<AppSettings, "id"> = {
  distanceUnit: "miles",
  customIrsRates: null,
  showAccuracyWarnings: true,
  maxAccuracyThresholdMeters: 50,
  minTripDistanceMiles: 0.1,
  locationSampleMaxAgeDays: 90,
  updatedAt: new Date(),
};

/**
 * Ensures at least one settings record exists.
 * Call this once on app startup.
 */
export async function ensureDefaultSettings(): Promise<void> {
  const count = await db.settings.count();
  if (count === 0) {
    await db.settings.add(DEFAULT_SETTINGS as AppSettings);
  }
}

/**
 * Get the single app settings record.
 */
export async function getSettings(): Promise<AppSettings> {
  const settings = await db.settings.toArray();
  if (settings.length === 0) {
    await ensureDefaultSettings();
    return getSettings();
  }
  // settings.length > 0 is guaranteed by the guard above;
  // spread into a new variable to satisfy strict rules
  const [first, ...rest] = settings;
  void rest;
  return first;
}

/**
 * Update app settings (partial update supported).
 */
export async function updateSettings(
  patch: Partial<Omit<AppSettings, "id">>,
): Promise<void> {
  const current = await getSettings();
  if (current.id === undefined) throw new Error("Settings record has no id");
  await db.settings.update(current.id, {
    ...patch,
    updatedAt: new Date(),
  });
}
