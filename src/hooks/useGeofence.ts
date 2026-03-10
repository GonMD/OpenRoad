import { useState, useEffect, useRef, useCallback } from "react";
import type { Zone, Coordinate } from "../types/index.js";
import { isInsideGeofence } from "../lib/distance.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GeofenceEvent =
  | { type: "enter"; zone: Zone; coordinate: Coordinate }
  | { type: "exit"; zone: Zone; coordinate: Coordinate };

export interface UseGeofenceOptions {
  /** Zones to monitor */
  zones: Zone[];
  /** Current GPS coordinate (updated by caller) */
  coordinate: Coordinate | null;
  /** Called when a geofence boundary is crossed */
  onEvent?: (event: GeofenceEvent) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Monitors whether the user is inside any of the provided zones.
 * Fires `onEvent` callbacks when zone boundaries are crossed.
 *
 * Strategy: computes the current inside-set on every coordinate update,
 * diffs against the previous inside-set to detect enter/exit transitions,
 * then schedules the setState via a ref to avoid calling setState directly
 * inside an effect body.
 */
export function useGeofence({
  zones,
  coordinate,
  onEvent,
}: UseGeofenceOptions) {
  const [insideZones, setInsideZones] = useState<Set<number>>(new Set());
  const prevInsideRef = useRef<Set<number>>(new Set());
  const onEventRef = useRef(onEvent);
  const pendingInsideRef = useRef<Set<number> | null>(null);

  // Track whether we've received the first coordinate - prevents spurious
  // exit events on app startup before we know the user's initial position
  const isInitializedRef = useRef(false);

  // Keep callback ref stable
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  // Compute transitions synchronously, queue state update
  useEffect(() => {
    if (!coordinate) return;

    const currentInside = new Set<number>();

    for (const zone of zones) {
      if (zone.id === undefined) continue;
      const center: Coordinate = { lat: zone.lat, lng: zone.lng };
      if (isInsideGeofence(coordinate, center, zone.radiusMeters)) {
        currentInside.add(zone.id);
      }
    }

    const prev = prevInsideRef.current;

    // On first coordinate, just initialize state without firing events.
    // This prevents spurious enter/exit events on app startup before we
    // have a baseline of which zones the user is actually in.
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      prevInsideRef.current = currentInside;
      // Store pending update — applied in the microtask flush below
      pendingInsideRef.current = currentInside;
      queueMicrotask(() => {
        if (pendingInsideRef.current !== null) {
          setInsideZones(pendingInsideRef.current);
          pendingInsideRef.current = null;
        }
      });
      return;
    }

    // Detect exits
    for (const zoneId of prev) {
      if (!currentInside.has(zoneId)) {
        const zone = zones.find((z) => z.id === zoneId);
        if (zone) {
          onEventRef.current?.({ type: "exit", zone, coordinate });
        }
      }
    }

    // Detect enters
    for (const zoneId of currentInside) {
      if (!prev.has(zoneId)) {
        const zone = zones.find((z) => z.id === zoneId);
        if (zone) {
          onEventRef.current?.({ type: "enter", zone, coordinate });
        }
      }
    }

    prevInsideRef.current = currentInside;
    // Store pending update — applied in the microtask flush below
    pendingInsideRef.current = currentInside;
    // Schedule state update outside this effect's synchronous execution
    // by using queueMicrotask so React batches it properly.
    queueMicrotask(() => {
      if (pendingInsideRef.current !== null) {
        setInsideZones(pendingInsideRef.current);
        pendingInsideRef.current = null;
      }
    });
  }, [coordinate, zones]);

  /** Returns true if the user is currently inside the given zone */
  const isInside = useCallback(
    (zoneId: number): boolean => insideZones.has(zoneId),
    [insideZones],
  );

  return { insideZones, isInside };
}
