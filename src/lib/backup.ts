import { db } from "../db/index.js";
import type {
  Trip,
  Zone,
  LocationSample,
  AppSettings,
} from "../types/index.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BackupData {
  version: 1;
  exportedAt: string; // ISO-8601
  trips: Trip[];
  zones: Zone[];
  locationSamples: LocationSample[];
  settings: AppSettings[];
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Serialises the entire database to a JSON blob and triggers a file download.
 */
export async function exportBackup(): Promise<void> {
  const [trips, zones, locationSamples, settings] = await Promise.all([
    db.trips.toArray(),
    db.zones.toArray(),
    db.locationSamples.toArray(),
    db.settings.toArray(),
  ]);

  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    trips,
    zones,
    locationSamples,
    settings,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `openroad_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Import ───────────────────────────────────────────────────────────────────

/**
 * Reads a backup JSON file chosen by the user and restores it into the database.
 * Existing data is cleared first.
 * Returns a summary string on success, throws on validation failure.
 */
export async function importBackup(file: File): Promise<string> {
  const text = await file.text();
  const raw: unknown = JSON.parse(text);

  if (
    typeof raw !== "object" ||
    raw === null ||
    (raw as Record<string, unknown>).version !== 1
  ) {
    throw new Error("Invalid backup file — missing version field.");
  }

  const data = raw as BackupData;

  // Validate array shapes are present (not empty-checking, just type check)
  if (
    !Array.isArray(data.trips) ||
    !Array.isArray(data.zones) ||
    !Array.isArray(data.locationSamples) ||
    !Array.isArray(data.settings)
  ) {
    throw new Error("Invalid backup file — malformed data arrays.");
  }

  // Restore — clear existing data then bulk-insert
  // Strip out `id` fields so Dexie auto-assigns new ones cleanly
  await db.transaction(
    "rw",
    db.trips,
    db.zones,
    db.locationSamples,
    db.settings,
    async () => {
      await db.trips.clear();
      await db.zones.clear();
      await db.locationSamples.clear();
      await db.settings.clear();

      // Re-hydrate Date objects from ISO strings before inserting
      const trips = data.trips.map((t) => ({
        ...t,
        startedAt: new Date(t.startedAt),
        endedAt: t.endedAt ? new Date(t.endedAt) : null,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      }));

      const zones = data.zones.map((z) => ({
        ...z,
        createdAt: new Date(z.createdAt),
        updatedAt: new Date(z.updatedAt),
      }));

      const samples = data.locationSamples.map((s) => ({
        ...s,
        timestamp: new Date(s.timestamp),
      }));

      const settings = data.settings.map((s) => ({
        ...s,
        updatedAt: new Date(s.updatedAt),
      }));

      await db.trips.bulkAdd(trips);
      await db.zones.bulkAdd(zones);
      await db.locationSamples.bulkAdd(samples);
      await db.settings.bulkAdd(settings);
    },
  );

  return `Restored ${String(data.trips.length)} trips, ${String(data.zones.length)} zones.`;
}
