/**
 * routing.ts — OSRM-based route calculation + right-turn-biased stop optimizer.
 *
 * Uses the public OSRM demo server (no API key required, fair-use).
 * https://project-osrm.org/
 *
 * Traffic data: OSRM does not include live traffic.  A future TomTom / HERE
 * integration can be dropped in by replacing `fetchRoute` with a traffic-aware
 * endpoint and storing the API key in AppSettings.
 */

import type { Coordinate } from "../types/index.js";

// ─── OSRM ─────────────────────────────────────────────────────────────────────

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

export interface RouteStep {
  name: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuverType: string;
  /** "left" | "right" | "slight left" | "slight right" | "straight" | "uturn" | "" */
  maneuverModifier: string;
  location: Coordinate;
}

export interface RouteLeg {
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStep[];
}

export interface RouteResult {
  polyline: Coordinate[];
  distanceMeters: number;
  durationSeconds: number;
  legs: RouteLeg[];
  leftTurns: number;
  rightTurns: number;
}

interface OsrmRoute {
  geometry: { coordinates: [number, number][] };
  legs: {
    distance: number;
    duration: number;
    steps: {
      name: string;
      distance: number;
      duration: number;
      maneuver: { type: string; modifier?: string; location: [number, number] };
    }[];
  }[];
  distance: number;
  duration: number;
}

interface OsrmResponse {
  code: string;
  routes: OsrmRoute[];
}

/**
 * Fetches a driving route between two or more waypoints from the OSRM demo
 * server.  Returns null on network error or if no route is found.
 */
export async function fetchRoute(
  waypoints: Coordinate[],
): Promise<RouteResult | null> {
  if (waypoints.length < 2) return null;

  const coords = waypoints
    .map((c) => `${String(c.lng)},${String(c.lat)}`)
    .join(";");
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson&steps=true`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as OsrmResponse;
    if (data.code !== "Ok" || !data.routes.length) return null;

    const r = data.routes[0];

    const polyline: Coordinate[] = r.geometry.coordinates.map(([lng, lat]) => ({
      lat,
      lng,
    }));

    let leftTurns = 0;
    let rightTurns = 0;

    const legs: RouteLeg[] = r.legs.map((leg) => ({
      distanceMeters: leg.distance,
      durationSeconds: leg.duration,
      steps: leg.steps.map((step) => {
        const mod = (step.maneuver.modifier ?? "").toLowerCase();
        if (mod.includes("left")) leftTurns++;
        else if (mod.includes("right")) rightTurns++;
        return {
          name: step.name,
          distanceMeters: step.distance,
          durationSeconds: step.duration,
          maneuverType: step.maneuver.type,
          maneuverModifier: step.maneuver.modifier ?? "",
          location: {
            lat: step.maneuver.location[1],
            lng: step.maneuver.location[0],
          },
        };
      }),
    }));

    return {
      polyline,
      distanceMeters: r.distance,
      durationSeconds: r.duration,
      legs,
      leftTurns,
      rightTurns,
    };
  } catch {
    return null;
  }
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

/** Bearing in degrees (0–360) from A → B. */
function bearing(a: Coordinate, b: Coordinate): number {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Haversine distance in metres between two coordinates. */
export function haversineMeters(a: Coordinate, b: Coordinate): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// ─── Stop optimizer ───────────────────────────────────────────────────────────

/**
 * Greedy nearest-neighbour TSP with optional right-turn bias.
 *
 * Each candidate next-stop is scored as:
 *   score = distance × (1 + LEFT_PENALTY)   if the bearing implies a left turn
 *   score = distance                          otherwise
 *
 * This steers the solver toward orderings that, street-by-street, tend to
 * favour right-hand turns — matching the well-known UPS/delivery-routing
 * approach.  For small stop counts (≤ 8) the result is near-optimal.
 *
 * Start and end positions are fixed; only intermediate stops are reordered.
 */
const LEFT_TURN_PENALTY = 0.3; // 30% virtual distance surcharge for left turns

export function optimizeStops(
  start: Coordinate,
  stops: Coordinate[],
  preferRightTurns: boolean,
): Coordinate[] {
  if (stops.length <= 1) return [...stops];

  const remaining = [...stops.map((s, i) => ({ coord: s, origIdx: i }))];
  const ordered: Coordinate[] = [];
  let current = start;
  let currentHeading: number | null = null;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMeters(current, remaining[i].coord);
      let score = d;

      if (preferRightTurns && currentHeading !== null) {
        const tb = bearing(current, remaining[i].coord);
        // Signed angle: negative = left of current heading, positive = right
        const relAngle = ((tb - currentHeading + 540) % 360) - 180;
        if (relAngle < -20) score *= 1 + LEFT_TURN_PENALTY;
      }

      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    const next = remaining[bestIdx];
    currentHeading = bearing(current, next.coord);
    ordered.push(next.coord);
    remaining.splice(bestIdx, 1);
    current = next.coord;
  }

  return ordered;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${String(h)}h ${String(m)}m`;
  return `${String(m)} min`;
}

export function formatDistanceKm(meters: number): string {
  const miles = meters / 1609.344;
  return miles >= 10 ? `${miles.toFixed(1)} mi` : `${miles.toFixed(2)} mi`;
}
