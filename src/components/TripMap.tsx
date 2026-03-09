/**
 * TripMap — renders a Leaflet map showing the GPS breadcrumb path for a
 * completed trip, with start (green) and end (red) circle markers.
 *
 * The component is lazy — the caller controls visibility and only mounts it
 * when the user explicitly expands the map.  This keeps the Trips list fast.
 *
 * locationSamples are fetched once on mount via IndexedDB.  If there are
 * fewer than 2 samples we fall back to a single-point view (start/end markers
 * only, no polyline).
 */

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { db } from "../db/index.js";
import type { LocationSample } from "../types/index.js";

// Suppress the default icon path breakage (we use circle markers only)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;

interface TripMapProps {
  tripId: number;
  /** Optional fallback coords if locationSamples is empty */
  fallbackLat?: number;
  fallbackLng?: number;
}

export function TripMap({ tripId, fallbackLat, fallbackLng }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<[number, number][] | null>(null);

  // Derived: no GPS data for this trip
  const empty = !loading && coords !== null && coords.length === 0;

  // Effect 1: fetch GPS data from IndexedDB
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      const samples: LocationSample[] = await db.locationSamples
        .where("tripId")
        .equals(tripId)
        .sortBy("timestamp");

      if (cancelled) return;

      const c: [number, number][] =
        samples.length > 0
          ? samples.map((s) => [s.lat, s.lng])
          : fallbackLat !== undefined && fallbackLng !== undefined
            ? [[fallbackLat, fallbackLng]]
            : [];

      setCoords(c);
      setLoading(false);
    };

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [tripId, fallbackLat, fallbackLng]);

  // Effect 2: initialize Leaflet after loading is done and the container div is in the DOM
  useEffect(() => {
    if (loading || coords === null) return;

    const el = containerRef.current;
    if (!el) return;

    if (coords.length === 0) {
      return;
    }

    // Centre on midpoint of the path
    const lats = coords.map(([lat]) => lat);
    const lngs = coords.map(([, lng]) => lng);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

    const map = L.map(el, {
      center: [centerLat, centerLng],
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Polyline (only if ≥ 2 points)
    if (coords.length >= 2) {
      L.polyline(coords, {
        color: "#9ecaff",
        weight: 3,
        opacity: 0.85,
      }).addTo(map);
    }

    // Start marker (green)
    const start = coords[0];
    L.circleMarker(start, {
      radius: 7,
      color: "#4caf87",
      fillColor: "#4caf87",
      fillOpacity: 1,
      weight: 2,
    })
      .bindTooltip("Start", { permanent: false, direction: "top" })
      .addTo(map);

    // End marker (red) — only if different from start
    if (coords.length >= 2) {
      const end = coords[coords.length - 1];
      L.circleMarker(end, {
        radius: 7,
        color: "#e57373",
        fillColor: "#e57373",
        fillOpacity: 1,
        weight: 2,
      })
        .bindTooltip("End", { permanent: false, direction: "top" })
        .addTo(map);
    }

    // Fit the map to the polyline bounds
    if (coords.length >= 2) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [20, 20] });
    }

    mapRef.current = map;
    setTimeout(() => {
      map.invalidateSize();
    }, 0);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [loading, coords]);

  if (loading) {
    return (
      <div
        style={{
          height: "220px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "12px",
          backgroundColor: "var(--md-surface-container-high)",
          marginTop: "12px",
        }}
      >
        <span className="md-spinner" />
      </div>
    );
  }

  if (empty) {
    return (
      <div
        style={{
          height: "80px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "12px",
          backgroundColor: "var(--md-surface-container-high)",
          marginTop: "12px",
          fontSize: "0.8125rem",
          color: "var(--md-on-surface-variant)",
        }}
      >
        No GPS data recorded for this trip.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "220px",
        borderRadius: "12px",
        overflow: "hidden",
        marginTop: "12px",
        position: "relative",
        zIndex: 0,
      }}
    />
  );
}
