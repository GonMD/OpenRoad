/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useRef, useEffect } from "react";
import type { Coordinate } from "../types/index.js";

export interface GeolocationState {
  coordinate: Coordinate | null;
  accuracy: number | null;
  error: GeolocationPositionError | null;
  isWatching: boolean;
  isSupported: boolean;
}

interface GeolocationContextValue extends GeolocationState {
  start: () => void;
  stop: () => void;
}

const GeolocationContext = createContext<GeolocationContextValue | null>(null);

export function useGeolocation(): GeolocationContextValue {
  const context = useContext(GeolocationContext);
  if (!context) {
    throw new Error("useGeolocation must be used within GeolocationProvider");
  }
  return context;
}

function initGeolocation(): GeolocationState {
  const isSupported =
    typeof navigator !== "undefined" && "geolocation" in navigator;
  return {
    coordinate: null,
    accuracy: null,
    error: null,
    isWatching: false,
    isSupported,
  };
}

export function GeolocationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<GeolocationState>(initGeolocation);
  const watchIdRef = useRef<number | null>(null);

  const start = () => {
    if (!("geolocation" in navigator)) return;
    if (watchIdRef.current !== null) return;

    const posOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 5_000,
    };

    setState((prev) => ({ ...prev, isWatching: true, error: null }));

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          coordinate: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          accuracy: position.coords.accuracy,
          error: null,
          isWatching: true,
          isSupported: true,
        });
      },
      (error) => {
        setState((prev) => ({ ...prev, error, isWatching: false }));
        watchIdRef.current = null;
      },
      posOptions,
    );
  };

  const stop = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState((prev) => ({ ...prev, isWatching: false }));
  };

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    if (watchIdRef.current !== null) return;

    const posOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 5_000,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setState({
          coordinate: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          accuracy: position.coords.accuracy,
          error: null,
          isWatching: true,
          isSupported: true,
        });
      },
      (error) => {
        setState((prev) => ({ ...prev, error, isWatching: false }));
        watchIdRef.current = null;
      },
      posOptions,
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return (
    <GeolocationContext.Provider value={{ ...state, start, stop }}>
      {children}
    </GeolocationContext.Provider>
  );
}
