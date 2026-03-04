import { useState, useEffect, useRef, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type {
  Trip,
  TripPurpose,
  Zone,
  Coordinate,
  AppSettings,
} from "../types/index.js";
import { db } from "../db/index.js";
import { pathDistanceMiles } from "../lib/distance.js";
import { useGeofence } from "./useGeofence.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TripTrackerState {
  activeTrip: Trip | null;
  isTracking: boolean;
  currentMiles: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages automatic trip start/stop based on geofence events and
 * manual overrides.  Breadcrumbs are persisted to IndexedDB in real time.
 */
export function useTripTracker(
  coordinate: Coordinate | null,
  accuracy: number | null,
  zones: Zone[],
  settings: Pick<
    AppSettings,
    "maxAccuracyThresholdMeters" | "minTripDistanceMiles"
  > | null,
  defaultPurpose: TripPurpose = "business",
) {
  // activeTripId drives the live query — use state so the query re-evaluates
  const [activeTripId, setActiveTripId] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const breadcrumbsRef = useRef<Coordinate[]>([]);
  const [currentMiles, setCurrentMiles] = useState(0);

  // Live query: returns the active trip from DB reactively
  const activeTrip =
    useLiveQuery<Trip | undefined>(
      () =>
        activeTripId !== null
          ? db.trips.get(activeTripId)
          : Promise.resolve(undefined),
      [activeTripId],
    ) ?? null;

  // Append breadcrumb (accuracy-filtered) and persist to IndexedDB
  useEffect(() => {
    if (!isTracking || !coordinate || activeTripId === null) return;

    // Drop readings that are too inaccurate
    const threshold = settings?.maxAccuracyThresholdMeters ?? 50;
    if (accuracy !== null && accuracy > threshold) return;

    breadcrumbsRef.current.push(coordinate);

    void db.locationSamples.add({
      tripId: activeTripId,
      lat: coordinate.lat,
      lng: coordinate.lng,
      accuracy: accuracy ?? 0,
      timestamp: new Date(),
    });

    // Update distance display — done in same effect to avoid a second render
    setCurrentMiles(pathDistanceMiles(breadcrumbsRef.current));
  }, [coordinate, accuracy, isTracking, activeTripId, settings]);

  const startTrip = useCallback(
    async (
      purpose: TripPurpose = defaultPurpose,
      originZoneId: number | null = null,
    ) => {
      const now = new Date();
      const tripId = await db.trips.add({
        purpose,
        status: "in_progress",
        originZoneId,
        destinationZoneId: null,
        startedAt: now,
        endedAt: null,
        distanceMiles: 0,
        notes: "",
        createdAt: now,
        updatedAt: now,
      } as Trip);

      const resolvedId = tripId ?? null;
      breadcrumbsRef.current = coordinate ? [coordinate] : [];
      setActiveTripId(resolvedId);
      setCurrentMiles(0);
      setIsTracking(true);
    },
    [coordinate, defaultPurpose],
  );

  const endTrip = useCallback(
    async (destinationZoneId: number | null = null, notesOverride?: string) => {
      if (activeTripId === null) return;

      const miles = pathDistanceMiles(breadcrumbsRef.current);
      const minMiles = settings?.minTripDistanceMiles ?? 0.1;

      // Auto-discard trips that don't meet the minimum distance threshold
      if (miles < minMiles) {
        await db.trips.update(activeTripId, {
          status: "discarded",
          endedAt: new Date(),
          distanceMiles: miles,
          updatedAt: new Date(),
        });

        breadcrumbsRef.current = [];
        setActiveTripId(null);
        setCurrentMiles(0);
        setIsTracking(false);
        return;
      }

      const now = new Date();

      await db.trips.update(activeTripId, {
        status: "completed",
        destinationZoneId,
        endedAt: now,
        distanceMiles: miles,
        ...(notesOverride !== undefined ? { notes: notesOverride } : {}),
        updatedAt: now,
      });

      breadcrumbsRef.current = [];
      setActiveTripId(null);
      setCurrentMiles(0);
      setIsTracking(false);
    },
    [activeTripId, settings],
  );

  const discardTrip = useCallback(async () => {
    if (activeTripId === null) return;

    await db.trips.update(activeTripId, {
      status: "discarded",
      endedAt: new Date(),
      updatedAt: new Date(),
    });

    breadcrumbsRef.current = [];
    setActiveTripId(null);
    setCurrentMiles(0);
    setIsTracking(false);
  }, [activeTripId]);

  // Auto-start / auto-end via geofencing
  useGeofence({
    zones,
    coordinate,
    onEvent: (event) => {
      if (event.type === "exit" && !isTracking) {
        void startTrip(defaultPurpose, event.zone.id ?? null);
      }
      if (event.type === "enter" && isTracking) {
        void endTrip(event.zone.id ?? null);
      }
    },
  });

  return {
    activeTrip,
    isTracking,
    currentMiles,
    startTrip,
    endTrip,
    discardTrip,
  };
}
