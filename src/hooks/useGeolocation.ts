import { useState, useEffect, useCallback, useRef } from "react";
import type { Coordinate } from "../types/index.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeolocationState {
  position: GeolocationPosition | null;
  coordinate: Coordinate | null;
  accuracy: number | null;
  error: GeolocationPositionError | null;
  isWatching: boolean;
  isSupported: boolean;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Provides continuous GPS watching via the Web Geolocation API.
 * Exposes start/stop controls so the caller decides when to track.
 */
export function useGeolocation(options: UseGeolocationOptions = {}) {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    coordinate: null,
    accuracy: null,
    error: null,
    isWatching: false,
    isSupported: "geolocation" in navigator,
  });

  const watchIdRef = useRef<number | null>(null);
  // Keep options in a ref so start() doesn't need them in its dep array
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    if (watchIdRef.current !== null) return; // already watching

    const posOptions: PositionOptions = {
      enableHighAccuracy: optionsRef.current.enableHighAccuracy ?? true,
      timeout: optionsRef.current.timeout ?? 15_000,
      maximumAge: optionsRef.current.maximumAge ?? 5_000,
    };

    setState((prev) => ({ ...prev, isWatching: true, error: null }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setState((prev) => ({
          ...prev,
          position,
          coordinate: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          accuracy: position.coords.accuracy,
          error: null,
        }));
      },
      (error) => {
        setState((prev) => ({ ...prev, error, isWatching: false }));
        watchIdRef.current = null;
      },
      posOptions,
    );
  }, []);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState((prev) => ({ ...prev, isWatching: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { ...state, start, stop };
}
