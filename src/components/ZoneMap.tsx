/**
 * ZoneMap — renders a Leaflet map centred on a zone with a circle overlay.
 *
 * Leaflet requires a concrete DOM element; we mount/unmount it imperatively
 * inside a useEffect so React doesn't fight with it.
 *
 * The map is lazy — it renders only when the user taps "Show Map" on the
 * ZoneCard, keeping the Zones list fast.
 */

import { useEffect, useRef } from "react";
import L from "leaflet";
// Leaflet CSS bundled via Vite — avoids separate <link> in index.html
import "leaflet/dist/leaflet.css";

// Fix the broken default marker icon path that Vite/webpack mangles.
// We use a circle marker instead, so this is only needed if we ever
// render default markers elsewhere.
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;

interface ZoneMapProps {
  lat: number;
  lng: number;
  radiusMeters: number;
}

export function ZoneMap({ lat, lng, radiusMeters }: ZoneMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Initialise map
    const map = L.map(el, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Zone circle
    const circle = L.circle([lat, lng], {
      radius: radiusMeters,
      color: "#9ecaff",
      fillColor: "#9ecaff",
      fillOpacity: 0.15,
      weight: 2,
    }).addTo(map);

    // Centre dot
    L.circleMarker([lat, lng], {
      radius: 6,
      color: "#9ecaff",
      fillColor: "#9ecaff",
      fillOpacity: 1,
      weight: 2,
    }).addTo(map);

    mapRef.current = map;
    circleRef.current = circle;

    // Force Leaflet to recalculate dimensions after the container is visible
    setTimeout(() => {
      map.invalidateSize();
    }, 0);

    return () => {
      map.remove();
      mapRef.current = null;
      circleRef.current = null;
    };
    // We intentionally run this only once per mount — lat/lng/radius changes
    // are handled in the sibling effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync map when props change without remounting
  useEffect(() => {
    const map = mapRef.current;
    const circle = circleRef.current;
    if (!map || !circle) return;
    map.setView([lat, lng], map.getZoom());
    circle.setLatLng([lat, lng]);
    circle.setRadius(radiusMeters);
  }, [lat, lng, radiusMeters]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "200px",
        borderRadius: "12px",
        overflow: "hidden",
        marginTop: "12px",
        // Leaflet z-index baseline — keep below our modals (z 200+)
        position: "relative",
        zIndex: 0,
      }}
    />
  );
}
