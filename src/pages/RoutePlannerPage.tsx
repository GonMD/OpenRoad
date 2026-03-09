/**
 * RoutePlannerPage — multi-stop route planner with right-turn optimisation.
 *
 * Uses:
 *  - Nominatim (OSM) for address autocomplete — free, no key required
 *  - OSRM demo server for routing          — free, no key required
 *  - Custom greedy TSP for stop ordering   — client-side, instant
 *
 * Traffic data: OSRM does not carry live traffic.  The UI surfaces this
 * limitation clearly.  A future enhancement can swap the routing call with
 * a traffic-aware endpoint (TomTom / HERE) once an API key is available.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { geocodeAddress } from "../lib/geocode.js";
import type { GeocodeResult } from "../lib/geocode.js";
import {
  fetchRoute,
  optimizeStops,
  formatDuration,
  formatDistanceKm,
} from "../lib/routing.js";
import type { RouteResult } from "../lib/routing.js";
import type { Coordinate } from "../types/index.js";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;

// ─── Stop data model ──────────────────────────────────────────────────────────

let _stopCounter = 0;
function newStopId() {
  return `stop-${String(++_stopCounter)}`;
}

interface Stop {
  id: string;
  query: string;
  suggestions: GeocodeResult[];
  geocoded: GeocodeResult | null;
  searching: boolean;
}

function blankStop(): Stop {
  return {
    id: newStopId(),
    query: "",
    suggestions: [],
    geocoded: null,
    searching: false,
  };
}

// ─── Address input with autocomplete ─────────────────────────────────────────

function StopInput({
  stop,
  label,
  placeholder,
  removable,
  onQueryChange,
  onSelect,
  onRemove,
}: {
  stop: Stop;
  label: string;
  placeholder: string;
  removable: boolean;
  onQueryChange: (id: string, q: string) => void;
  onSelect: (id: string, r: GeocodeResult) => void;
  onRemove: (id: string) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInput = (q: string) => {
    onQueryChange(stop.id, q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.trim().length < 3) return;
    timerRef.current = setTimeout(() => {
      onQueryChange(stop.id, q); // trigger search via parent
    }, 500);
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ flex: 1 }}>
          <p
            className="md-field-label"
            style={{ marginBottom: "4px", fontSize: "0.75rem" }}
          >
            {label}
          </p>
          {stop.geocoded ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 12px",
                borderRadius: "8px",
                backgroundColor: "var(--md-primary-container)",
                border: "1.5px solid var(--md-primary)",
              }}
            >
              <span
                className="ms icon-16"
                aria-hidden="true"
                style={{ color: "var(--md-primary)", flexShrink: 0 }}
              >
                location_on
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: "0.8125rem",
                  color: "var(--md-on-primary-container)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {stop.geocoded.displayName.split(",").slice(0, 2).join(",")}
              </span>
              <button
                type="button"
                onClick={() => {
                  onQueryChange(stop.id, "");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--md-primary)",
                  cursor: "pointer",
                  padding: "2px",
                  display: "flex",
                  alignItems: "center",
                }}
                aria-label="Clear"
              >
                <span className="ms icon-16" aria-hidden="true">
                  close
                </span>
              </button>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={stop.query}
                onChange={(e) => {
                  handleInput(e.target.value);
                }}
                placeholder={placeholder}
                className="md-input"
                style={{ paddingRight: "36px" }}
                autoComplete="off"
              />
              {stop.searching && (
                <span
                  className="md-spinner"
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "16px",
                    height: "16px",
                  }}
                />
              )}
            </div>
          )}
        </div>

        {removable && (
          <button
            type="button"
            onClick={() => {
              onRemove(stop.id);
            }}
            aria-label="Remove stop"
            style={{
              background: "none",
              border: "none",
              color: "var(--md-on-surface-variant)",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              marginTop: "20px",
            }}
          >
            <span className="ms icon-20" aria-hidden="true">
              remove_circle_outline
            </span>
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {!stop.geocoded && stop.suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: removable ? "36px" : 0,
            zIndex: 500,
            backgroundColor: "var(--md-surface-container)",
            border: "1px solid var(--md-outline-variant)",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            overflow: "hidden",
            marginTop: "2px",
          }}
        >
          {stop.suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onSelect(stop.id, s);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                background: "none",
                border: "none",
                borderBottom:
                  i < stop.suggestions.length - 1
                    ? "1px solid var(--md-outline-variant)"
                    : "none",
                cursor: "pointer",
                fontSize: "0.8125rem",
                color: "var(--md-on-surface)",
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
              }}
            >
              <span
                className="ms icon-16"
                aria-hidden="true"
                style={{
                  color: "var(--md-outline)",
                  marginTop: "1px",
                  flexShrink: 0,
                }}
              >
                location_on
              </span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {s.displayName}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Route map ────────────────────────────────────────────────────────────────

function RouteMap({
  route,
  waypoints,
}: {
  route: RouteResult;
  waypoints: (GeocodeResult | null)[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const coords: [number, number][] = route.polyline.map((c) => [
      c.lat,
      c.lng,
    ]);

    const map = L.map(el, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    if (coords.length >= 2) {
      L.polyline(coords, { color: "#9ecaff", weight: 4, opacity: 0.9 }).addTo(
        map,
      );
    }

    // Numbered waypoint markers
    const validWaypoints = waypoints.filter(Boolean) as GeocodeResult[];
    validWaypoints.forEach((wp, idx) => {
      const isStart = idx === 0;
      const isEnd = idx === validWaypoints.length - 1;
      const color = isStart ? "#4caf87" : isEnd ? "#e57373" : "#9ecaff";
      const label = isStart ? "S" : isEnd ? "E" : String(idx);

      const icon = L.divIcon({
        html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)">${label}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        className: "",
      });

      L.marker([wp.lat, wp.lng], { icon })
        .bindTooltip(wp.displayName.split(",")[0], { direction: "top" })
        .addTo(map);
    });

    if (coords.length >= 2) {
      map.fitBounds(L.latLngBounds(coords), { padding: [20, 20] });
    } else if (coords.length === 1) {
      map.setView(coords[0], 14);
    }

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [route, waypoints]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "260px",
        borderRadius: "12px",
        overflow: "hidden",
        position: "relative",
        zIndex: 0,
      }}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function RoutePlannerPage() {
  const [stops, setStops] = useState<Stop[]>([blankStop(), blankStop()]);
  const [preferRightTurns, setPreferRightTurns] = useState(true);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced geocode search when query changes
  const searchTimers = useRef<
    Record<string, ReturnType<typeof setTimeout> | undefined>
  >({});

  const handleQueryChange = useCallback((id: string, q: string) => {
    setStops((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, query: q, geocoded: null, suggestions: [] } : s,
      ),
    );
    setRoute(null);

    if (searchTimers.current[id]) clearTimeout(searchTimers.current[id]);
    if (q.trim().length < 3) return;

    setStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, searching: true } : s)),
    );

    searchTimers.current[id] = setTimeout(() => {
      void geocodeAddress(q.trim())
        .then((results) => {
          setStops((prev) =>
            prev.map((s) =>
              s.id === id
                ? { ...s, suggestions: results.slice(0, 5), searching: false }
                : s,
            ),
          );
        })
        .catch(() => {
          setStops((prev) =>
            prev.map((s) => (s.id === id ? { ...s, searching: false } : s)),
          );
        });
    }, 500);
  }, []);

  const handleSelect = useCallback((id: string, r: GeocodeResult) => {
    setStops((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, geocoded: r, query: r.displayName, suggestions: [] }
          : s,
      ),
    );
    setRoute(null);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setStops((prev) => prev.filter((s) => s.id !== id));
    setRoute(null);
  }, []);

  const addStop = () => {
    // Insert before the last (end) stop
    setStops((prev) => [
      ...prev.slice(0, -1),
      blankStop(),
      prev[prev.length - 1],
    ]);
    setRoute(null);
  };

  const moveStop = (id: string, dir: -1 | 1) => {
    setStops((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      // Keep first and last fixed; only move intermediates (idx 1..n-2)
      const newIdx = idx + dir;
      if (newIdx < 1 || newIdx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
    setRoute(null);
  };

  const geocodedWaypoints = stops.map((s) => s.geocoded);
  const allGeocoded =
    geocodedWaypoints.length >= 2 && geocodedWaypoints.every((g) => g !== null);
  const intermediates = stops.slice(1, -1);

  const handleOptimize = () => {
    if (!allGeocoded) return;
    setOptimizing(true);
    setError(null);

    const startCoord: Coordinate = {
      lat: geocodedWaypoints[0].lat,
      lng: geocodedWaypoints[0].lng,
    };
    const midCoords: Coordinate[] = stops
      .slice(1, -1)
      .map((s) => ({ lat: s.geocoded!.lat, lng: s.geocoded!.lng }));

    const optimized = optimizeStops(startCoord, midCoords, preferRightTurns);

    // Reorder the intermediate stops to match the optimized coordinate order
    setStops((prev) => {
      const start = prev[0];
      const end = prev[prev.length - 1];
      const mids = prev.slice(1, -1);
      const reordered = optimized.map((coord) => {
        const match = mids.find(
          (s) => s.geocoded?.lat === coord.lat && s.geocoded?.lng === coord.lng, // eslint-disable-line @typescript-eslint/no-unnecessary-condition
        );
        return match ?? mids[0];
      });
      return [start, ...reordered, end];
    });

    setOptimizing(false);
  };

  const handleCalculate = async () => {
    if (!allGeocoded) return;
    setCalculating(true);
    setError(null);
    setRoute(null);

    const waypoints: Coordinate[] = geocodedWaypoints.map((g) => ({
      lat: g.lat,
      lng: g.lng,
    }));

    const result = await fetchRoute(waypoints);
    if (!result) {
      setError(
        "Could not calculate route. Check your addresses and try again.",
      );
    } else {
      setRoute(result);
    }
    setCalculating(false);
  };

  const distanceMiles = route ? route.distanceMeters / 1609.344 : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <header style={{ paddingTop: "8px" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--md-on-surface)",
            margin: 0,
          }}
        >
          Route Planner
        </h1>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--md-on-surface-variant)",
            margin: "4px 0 0",
          }}
        >
          Plan multi-stop routes · powered by OpenStreetMap
        </p>
      </header>

      {/* Stop list */}
      <div
        className="md-card"
        style={{ display: "flex", flexDirection: "column", gap: "12px" }}
      >
        {stops.map((stop, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === stops.length - 1;
          const isIntermediate = !isFirst && !isLast;
          const label = isFirst
            ? "Start"
            : isLast
              ? "End"
              : `Stop ${String(idx)}`;
          const placeholder = isFirst
            ? "Enter starting address"
            : isLast
              ? "Enter destination (optional — leave blank to end at last stop)"
              : "Enter stop address";

          return (
            <div
              key={stop.id}
              style={{ display: "flex", gap: "4px", alignItems: "flex-start" }}
            >
              {/* Up/down reorder for intermediate stops */}
              {isIntermediate && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    marginTop: "20px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      moveStop(stop.id, -1);
                    }}
                    disabled={idx === 1}
                    aria-label="Move up"
                    style={{
                      background: "none",
                      border: "none",
                      color:
                        idx === 1
                          ? "var(--md-outline-variant)"
                          : "var(--md-on-surface-variant)",
                      cursor: idx === 1 ? "default" : "pointer",
                      padding: "2px",
                      display: "flex",
                    }}
                  >
                    <span className="ms icon-16" aria-hidden="true">
                      arrow_upward
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      moveStop(stop.id, 1);
                    }}
                    disabled={idx === stops.length - 2}
                    aria-label="Move down"
                    style={{
                      background: "none",
                      border: "none",
                      color:
                        idx === stops.length - 2
                          ? "var(--md-outline-variant)"
                          : "var(--md-on-surface-variant)",
                      cursor: idx === stops.length - 2 ? "default" : "pointer",
                      padding: "2px",
                      display: "flex",
                    }}
                  >
                    <span className="ms icon-16" aria-hidden="true">
                      arrow_downward
                    </span>
                  </button>
                </div>
              )}

              <div style={{ flex: 1 }}>
                <StopInput
                  stop={stop}
                  label={label}
                  placeholder={placeholder}
                  removable={isIntermediate}
                  onQueryChange={handleQueryChange}
                  onSelect={handleSelect}
                  onRemove={handleRemove}
                />
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={addStop}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "1.5px dashed var(--md-outline-variant)",
            borderRadius: "8px",
            padding: "8px 12px",
            cursor: "pointer",
            color: "var(--md-primary)",
            fontSize: "0.875rem",
            fontWeight: 500,
            width: "100%",
          }}
        >
          <span className="ms icon-18" aria-hidden="true">
            add_location_alt
          </span>
          Add stop
        </button>
      </div>

      {/* Options */}
      <div className="md-card">
        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
          }}
        >
          <div>
            <span
              style={{ fontSize: "0.9375rem", color: "var(--md-on-surface)" }}
            >
              Prefer right-hand turns
            </span>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--md-on-surface-variant)",
                margin: "2px 0 0",
              }}
            >
              Optimizes stop order to minimise left turns
            </p>
          </div>
          <input
            type="checkbox"
            checked={preferRightTurns}
            onChange={(e) => {
              setPreferRightTurns(e.target.checked);
            }}
            className="md-switch"
          />
        </label>

        {/* Traffic note */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            padding: "8px 10px",
            borderRadius: "8px",
            backgroundColor: "var(--md-surface-container-high)",
            marginTop: "4px",
          }}
        >
          <span
            className="ms icon-16"
            aria-hidden="true"
            style={{
              color: "var(--md-outline)",
              flexShrink: 0,
              marginTop: "2px",
            }}
          >
            info
          </span>
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--md-on-surface-variant)",
              margin: 0,
            }}
          >
            Route times are based on speed limits, not live traffic. Real-time
            traffic requires a TomTom or HERE API key (coming soon).
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "10px" }}>
        {intermediates.length > 0 && (
          <button
            onClick={() => {
              handleOptimize();
            }}
            disabled={!allGeocoded || optimizing}
            className="md-btn-tonal"
            style={{ flex: 1, gap: "6px", opacity: !allGeocoded ? 0.5 : 1 }}
          >
            <span className="ms icon-18" aria-hidden="true">
              {optimizing ? "hourglass_top" : "alt_route"}
            </span>
            {optimizing ? "Optimizing…" : "Optimize Order"}
          </button>
        )}
        <button
          onClick={() => void handleCalculate()}
          disabled={!allGeocoded || calculating}
          className="md-btn-filled"
          style={{ flex: 2, gap: "6px", opacity: !allGeocoded ? 0.5 : 1 }}
        >
          <span className="ms icon-18" aria-hidden="true">
            {calculating ? "hourglass_top" : "route"}
          </span>
          {calculating ? "Calculating…" : "Calculate Route"}
        </button>
      </div>

      {error && (
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--md-error)",
            margin: 0,
          }}
        >
          {error}
        </p>
      )}

      {/* Route results */}
      {route && (
        <>
          {/* Stats bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "8px",
            }}
          >
            {[
              {
                icon: "straighten",
                label: "Distance",
                value: formatDistanceKm(route.distanceMeters),
              },
              {
                icon: "schedule",
                label: "Est. Time",
                value: formatDuration(route.durationSeconds),
              },
              {
                icon: "turn_right",
                label: "Turns",
                value: `${String(route.rightTurns)}R · ${String(route.leftTurns)}L`,
              },
            ].map(({ icon, label, value }) => (
              <div
                key={label}
                className="md-card-filled"
                style={{ padding: "12px 8px", textAlign: "center" }}
              >
                <span
                  className="ms icon-18"
                  aria-hidden="true"
                  style={{
                    color: "var(--md-primary)",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  {icon}
                </span>
                <p
                  style={{
                    fontSize: "0.6875rem",
                    color: "var(--md-on-surface-variant)",
                    margin: "0 0 2px",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    color: "var(--md-on-surface)",
                    margin: 0,
                  }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Map */}
          <RouteMap route={route} waypoints={geocodedWaypoints} />

          {/* Turn-by-turn summary */}
          <div className="md-card">
            <p
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--md-on-surface-variant)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "10px",
              }}
            >
              Turn-by-Turn
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0",
                maxHeight: "280px",
                overflowY: "auto",
              }}
            >
              {route.legs.flatMap((leg, li) =>
                leg.steps
                  .filter((s) => s.maneuverType !== "depart" || li === 0)
                  .map((step, si) => {
                    const mod = step.maneuverModifier.toLowerCase();
                    const isLeft = mod.includes("left");
                    const isRight = mod.includes("right");
                    const icon = isLeft
                      ? "turn_left"
                      : isRight
                        ? "turn_right"
                        : step.maneuverType === "arrive"
                          ? "location_on"
                          : "straight";
                    const iconColor = isLeft
                      ? "var(--md-error)"
                      : isRight
                        ? "var(--md-success)"
                        : "var(--md-on-surface-variant)";
                    return (
                      <div
                        key={`${String(li)}-${String(si)}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "7px 0",
                          borderBottom: "1px solid var(--md-outline-variant)",
                        }}
                      >
                        <span
                          className="ms icon-18"
                          aria-hidden="true"
                          style={{ color: iconColor, flexShrink: 0 }}
                        >
                          {icon}
                        </span>
                        <span
                          style={{
                            flex: 1,
                            fontSize: "0.8125rem",
                            color: "var(--md-on-surface)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {step.name || step.maneuverType}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--md-on-surface-variant)",
                            flexShrink: 0,
                          }}
                        >
                          {formatDistanceKm(step.distanceMeters)}
                        </span>
                      </div>
                    );
                  }),
              )}
            </div>
          </div>

          {/* Log mileage note */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "flex-start",
              padding: "10px 12px",
              borderRadius: "10px",
              backgroundColor: "var(--md-surface-container-high)",
            }}
          >
            <span
              className="ms icon-18"
              aria-hidden="true"
              style={{
                color: "var(--md-primary)",
                flexShrink: 0,
                marginTop: "1px",
              }}
            >
              directions_car
            </span>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--md-on-surface-variant)",
                margin: 0,
              }}
            >
              Planned distance:{" "}
              <strong style={{ color: "var(--md-on-surface)" }}>
                {distanceMiles?.toFixed(2)} mi
              </strong>
              . Start GPS tracking from the Dashboard to log the actual driven
              mileage for your records.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
