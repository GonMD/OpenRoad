import Dexie, { type EntityTable } from "dexie";
import type {
  Trip,
  Zone,
  LocationSample,
  AppSettings,
  TripTemplate,
  Vehicle,
  SavedRoute,
} from "../types/index.js";

// ─── Database Schema ──────────────────────────────────────────────────────────

class OpenRoadDB extends Dexie {
  trips!: EntityTable<Trip, "id">;
  zones!: EntityTable<Zone, "id">;
  locationSamples!: EntityTable<LocationSample, "id">;
  settings!: EntityTable<AppSettings, "id">;
  templates!: EntityTable<TripTemplate, "id">;
  vehicles!: EntityTable<Vehicle, "id">;
  savedRoutes!: EntityTable<SavedRoute, "id">;

  constructor() {
    super("MileageCalcDB");

    this.version(1).stores({
      // prettier-ignore
      trips: "++id, purpose, status, originZoneId, destinationZoneId, startedAt, endedAt, createdAt",
      zones: "++id, name, createdAt",
      locationSamples: "++id, tripId, timestamp",
      settings: "++id",
    });

    // v2: adds originAddress, destinationAddress, pitStops to trips
    this.version(2)
      .stores({
        // prettier-ignore
        trips: "++id, purpose, status, originZoneId, destinationZoneId, startedAt, endedAt, createdAt",
        zones: "++id, name, createdAt",
        locationSamples: "++id, tripId, timestamp",
        settings: "++id",
      })
      .upgrade((tx) => {
        return tx
          .table("trips")
          .toCollection()
          .modify((trip: Record<string, unknown>) => {
            if (trip.originAddress === undefined) trip.originAddress = null;
            if (trip.destinationAddress === undefined)
              trip.destinationAddress = null;
            if (trip.pitStops === undefined) trip.pitStops = [];
          });
      });

    // v3: adds templates table
    this.version(3).stores({
      // prettier-ignore
      trips: "++id, purpose, status, originZoneId, destinationZoneId, startedAt, endedAt, createdAt",
      zones: "++id, name, createdAt",
      locationSamples: "++id, tripId, timestamp",
      settings: "++id",
      templates: "++id, name, purpose, createdAt",
    });

    // v4: adds vehicles table, vehicleId to trips, activeVehicleId to settings
    this.version(4)
      .stores({
        // prettier-ignore
        trips: "++id, purpose, status, originZoneId, destinationZoneId, vehicleId, startedAt, endedAt, createdAt",
        zones: "++id, name, createdAt",
        locationSamples: "++id, tripId, timestamp",
        settings: "++id",
        templates: "++id, name, purpose, createdAt",
        vehicles: "++id, name, createdAt",
      })
      .upgrade(async (tx) => {
        await tx
          .table("trips")
          .toCollection()
          .modify((trip: Record<string, unknown>) => {
            if (trip.vehicleId === undefined) trip.vehicleId = null;
          });
        await tx
          .table("settings")
          .toCollection()
          .modify((s: Record<string, unknown>) => {
            if (s.activeVehicleId === undefined) s.activeVehicleId = null;
          });
      });

    // v5: adds odometerStart, odometerEnd, odometerStartPhoto, odometerEndPhoto to trips
    this.version(5)
      .stores({
        // prettier-ignore
        trips: "++id, purpose, status, originZoneId, destinationZoneId, vehicleId, startedAt, endedAt, createdAt",
        zones: "++id, name, createdAt",
        locationSamples: "++id, tripId, timestamp",
        settings: "++id",
        templates: "++id, name, purpose, createdAt",
        vehicles: "++id, name, createdAt",
      })
      .upgrade((tx) => {
        return tx
          .table("trips")
          .toCollection()
          .modify((trip: Record<string, unknown>) => {
            if (trip.odometerStart === undefined) trip.odometerStart = null;
            if (trip.odometerEnd === undefined) trip.odometerEnd = null;
            if (trip.odometerStartPhoto === undefined)
              trip.odometerStartPhoto = null;
            if (trip.odometerEndPhoto === undefined)
              trip.odometerEndPhoto = null;
          });
      });

    // v7: adds vehicleType, photo, vin to vehicles
    this.version(7)
      .stores({
        // prettier-ignore
        trips: "++id, purpose, status, originZoneId, destinationZoneId, vehicleId, startedAt, endedAt, createdAt",
        zones: "++id, name, createdAt",
        locationSamples: "++id, tripId, timestamp",
        settings: "++id",
        templates: "++id, name, purpose, createdAt",
        vehicles: "++id, name, createdAt",
      })
      .upgrade((tx) => {
        return tx
          .table("vehicles")
          .toCollection()
          .modify((v: Record<string, unknown>) => {
            if (v.vehicleType === undefined) v.vehicleType = "car";
            if (v.photo === undefined) v.photo = null;
            if (v.vin === undefined) v.vin = "";
          });
      });

    // v6: adds keepScreenOn, autoDimWhenTracking, dimLevel to settings
    this.version(6)
      .stores({
        // prettier-ignore
        trips: "++id, purpose, status, originZoneId, destinationZoneId, vehicleId, startedAt, endedAt, createdAt",
        zones: "++id, name, createdAt",
        locationSamples: "++id, tripId, timestamp",
        settings: "++id",
        templates: "++id, name, purpose, createdAt",
        vehicles: "++id, name, createdAt",
      })
      .upgrade((tx) => {
        return tx
          .table("settings")
          .toCollection()
          .modify((s: Record<string, unknown>) => {
            if (s.keepScreenOn === undefined) s.keepScreenOn = true;
            if (s.autoDimWhenTracking === undefined)
              s.autoDimWhenTracking = false;
            if (s.dimLevel === undefined) s.dimLevel = 0.85;
          });
      });

    // v8: adds savedRoutes table
    this.version(8).stores({
      // prettier-ignore
      trips: "++id, purpose, status, originZoneId, destinationZoneId, vehicleId, startedAt, endedAt, createdAt",
      zones: "++id, name, createdAt",
      locationSamples: "++id, tripId, timestamp",
      settings: "++id",
      templates: "++id, name, purpose, createdAt",
      vehicles: "++id, name, createdAt",
      savedRoutes: "++id, name, createdAt",
    });
  }
}

export const db = new OpenRoadDB();

// ─── Default Settings ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: Omit<AppSettings, "id"> = {
  distanceUnit: "miles",
  customIrsRates: null,
  showAccuracyWarnings: true,
  maxAccuracyThresholdMeters: 50,
  minTripDistanceMiles: 0.1,
  locationSampleMaxAgeDays: 90,
  employerReimbursementCents: 0,
  activeVehicleId: null,
  keepScreenOn: true,
  autoDimWhenTracking: false,
  dimLevel: 0.85,
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

/**
 * Deletes location samples older than the configured age threshold.
 * Runs on startup; does nothing if locationSampleMaxAgeDays is 0.
 */
export async function purgeOldLocationSamples(): Promise<void> {
  const settings = await getSettings();
  const maxDays = settings.locationSampleMaxAgeDays;
  if (maxDays <= 0) return;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDays);

  const all = await db.locationSamples.toArray();
  const idsToDelete = all
    .filter((s) => s.timestamp.getTime() < cutoff.getTime())
    .map((s) => s.id)
    .filter((id): id is number => id !== undefined);
  if (idsToDelete.length > 0) {
    await db.locationSamples.bulkDelete(idsToDelete);
  }
}
