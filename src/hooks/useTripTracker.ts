import { useState, useEffect, useRef, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type {
  Trip,
  TripPurpose,
  Zone,
  Coordinate,
  AppSettings,
  PitStop,
} from "../types/index.js";
import { db } from "../db/index.js";
import { pathDistanceMiles } from "../lib/distance.js";
import { hapticStart, hapticEnd, hapticDiscard } from "../lib/haptic.js";
import { resolveAddresses } from "../lib/geocode.js";
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
 *
 * Address resolution and pit stop detection are handled automatically:
 * - Addresses are reverse-geocoded after trip ends (fire-and-forget, Nominatim).
 * - Entering a zone mid-trip records a PitStop instead of ending the trip.
 */
export function useTripTracker(
  coordinate: Coordinate | null,
  accuracy: number | null,
  zones: Zone[],
  settings: Pick<
    AppSettings,
    "maxAccuracyThresholdMeters" | "minTripDistanceMiles" | "activeVehicleId"
  > | null,
  defaultPurpose: TripPurpose = "business",
) {
  // activeTripId drives the live query — use state so the query re-evaluates
  const [activeTripId, setActiveTripId] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const breadcrumbsRef = useRef<Coordinate[]>([]);
  const [currentMiles, setCurrentMiles] = useState(0);

  // Pit stops accumulated during the current trip (in-memory until trip ends)
  const pitStopsRef = useRef<PitStop[]>([]);

  // Track which zone ids have already generated a pit stop this trip to avoid
  // duplicate entries when GPS oscillates on a zone boundary.
  const visitedZonesRef = useRef<Set<number>>(new Set());

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
      notes = "",
      odometerStart: number | null = null,
      odometerStartPhoto: string | null = null,
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
        notes,
        originAddress: null,
        destinationAddress: null,
        pitStops: [],
        vehicleId: settings?.activeVehicleId ?? null,
        odometerStart,
        odometerEnd: null,
        odometerStartPhoto,
        odometerEndPhoto: null,
        createdAt: now,
        updatedAt: now,
      } as Trip);

      const resolvedId = tripId ?? null;
      breadcrumbsRef.current = coordinate ? [coordinate] : [];
      pitStopsRef.current = [];
      visitedZonesRef.current = new Set();
      // If we started from a known zone, mark it as visited so we don't
      // immediately record it as a pit stop when we re-enter later.
      if (originZoneId !== null) visitedZonesRef.current.add(originZoneId);
      setActiveTripId(resolvedId);
      setCurrentMiles(0);
      setIsTracking(true);
      hapticStart();
    },
    [coordinate, defaultPurpose, settings?.activeVehicleId],
  );

  /**
   * Resolves addresses for the trip's origin, pit stops, and destination
   * coordinates, then writes them back to the DB.  Fire-and-forget.
   */
  const resolveAndPersistAddresses = useCallback(
    (tripId: number, crumbs: Coordinate[], pitStops: PitStop[]) => {
      if (crumbs.length === 0) return;

      const originCoord = crumbs[0];
      const destCoord = crumbs[crumbs.length - 1];

      // Build a flat list: [origin, ...pit stop coords (approximated from crumbs), dest]
      // We only have milesFromOrigin for pit stops, not a stored coordinate.
      // Use the closest breadcrumb at that mileage point.
      const coordsToResolve: Coordinate[] = [originCoord];
      for (const ps of pitStops) {
        // Find the breadcrumb nearest to the pit stop mileage point
        let accumulated = 0;
        let best: Coordinate = originCoord;
        for (let i = 1; i < crumbs.length; i++) {
          const prev = crumbs[i - 1];
          const curr = crumbs[i];
          accumulated += pathDistanceMiles([prev, curr]);
          best = curr;
          if (accumulated >= ps.milesFromOrigin) break;
        }
        coordsToResolve.push(best);
      }
      coordsToResolve.push(destCoord);

      void resolveAddresses(coordsToResolve).then((addresses) => {
        const originAddress = addresses[0] ?? null;
        const destinationAddress = addresses[addresses.length - 1] ?? null;

        // Patch pit stop addresses in-place
        const updatedPitStops = pitStops.map((ps, idx) => ({
          ...ps,
          address: addresses[idx + 1] ?? null,
        }));

        void db.trips.update(tripId, {
          originAddress,
          destinationAddress,
          pitStops: updatedPitStops,
          updatedAt: new Date(),
        });
      });
    },
    [],
  );

  const endTrip = useCallback(
    async (
      destinationZoneId: number | null = null,
      notesOverride?: string,
      odometerEnd: number | null = null,
      odometerEndPhoto: string | null = null,
    ) => {
      if (activeTripId === null) return;

      const miles = pathDistanceMiles(breadcrumbsRef.current);
      const minMiles = settings?.minTripDistanceMiles ?? 0.1;
      const crumbsSnapshot = [...breadcrumbsRef.current];
      const pitStopsSnapshot = [...pitStopsRef.current];
      const tripIdSnapshot = activeTripId;

      // Auto-discard trips that don't meet the minimum distance threshold
      if (miles < minMiles) {
        await db.trips.update(activeTripId, {
          status: "discarded",
          endedAt: new Date(),
          distanceMiles: miles,
          updatedAt: new Date(),
        });

        breadcrumbsRef.current = [];
        pitStopsRef.current = [];
        visitedZonesRef.current = new Set();
        setActiveTripId(null);
        setCurrentMiles(0);
        setIsTracking(false);
        hapticDiscard();
        return;
      }

      const now = new Date();

      await db.trips.update(activeTripId, {
        status: "completed",
        destinationZoneId,
        endedAt: now,
        distanceMiles: miles,
        pitStops: pitStopsSnapshot,
        odometerEnd,
        odometerEndPhoto,
        ...(notesOverride !== undefined ? { notes: notesOverride } : {}),
        updatedAt: now,
      });

      breadcrumbsRef.current = [];
      pitStopsRef.current = [];
      visitedZonesRef.current = new Set();
      setActiveTripId(null);
      setCurrentMiles(0);
      setIsTracking(false);
      hapticEnd();

      // Fire-and-forget: reverse-geocode origin, pit stop coords, and destination
      resolveAndPersistAddresses(
        tripIdSnapshot,
        crumbsSnapshot,
        pitStopsSnapshot,
      );
    },
    [activeTripId, settings, resolveAndPersistAddresses],
  );

  const discardTrip = useCallback(async () => {
    if (activeTripId === null) return;

    await db.trips.update(activeTripId, {
      status: "discarded",
      endedAt: new Date(),
      updatedAt: new Date(),
    });

    breadcrumbsRef.current = [];
    pitStopsRef.current = [];
    visitedZonesRef.current = new Set();
    setActiveTripId(null);
    setCurrentMiles(0);
    setIsTracking(false);
    hapticDiscard();
  }, [activeTripId]);

  /**
   * Manually adds a pit stop at the current GPS position during an active trip.
   * The label defaults to the current mileage point.
   */
  const addPitStop = useCallback(
    (label?: string) => {
      if (!isTracking) return;
      const miles = pathDistanceMiles(breadcrumbsRef.current);
      const ps: PitStop = {
        zoneId: null,
        label: label ?? `Stop at ${miles.toFixed(1)} mi`,
        milesFromOrigin: miles,
        arrivedAt: new Date().toISOString(),
        address: null,
      };
      pitStopsRef.current = [...pitStopsRef.current, ps].sort(
        (a, b) => a.milesFromOrigin - b.milesFromOrigin,
      );
    },
    [isTracking],
  );

  // Auto-start / auto-end via geofencing
  // Mid-trip zone entry → pit stop; first zone entry → end trip
  useGeofence({
    zones,
    coordinate,
    onEvent: (event) => {
      if (event.type === "exit" && !isTracking) {
        void startTrip(defaultPurpose, event.zone.id ?? null);
      }
      if (event.type === "enter" && isTracking) {
        const zoneId = event.zone.id;

        // If this is a zone we've already visited (origin), end the trip
        // (user returned to origin zone). Otherwise record a pit stop.
        if (zoneId !== undefined && !visitedZonesRef.current.has(zoneId)) {
          visitedZonesRef.current.add(zoneId);
          const miles = pathDistanceMiles(breadcrumbsRef.current);
          const ps: PitStop = {
            zoneId: zoneId,
            label: event.zone.name,
            milesFromOrigin: miles,
            arrivedAt: new Date().toISOString(),
            address: null,
          };
          pitStopsRef.current = [...pitStopsRef.current, ps].sort(
            (a, b) => a.milesFromOrigin - b.milesFromOrigin,
          );
        } else {
          // End the trip — arrived at a previously-visited zone or unknown zone
          void endTrip(zoneId ?? null);
        }
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
    addPitStop,
  };
}
