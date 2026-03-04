import type { Coordinate, DistanceUnit } from "../types/index.js";

// ─── Haversine distance ───────────────────────────────────────────────────────

const EARTH_RADIUS_METERS = 6_371_000;
const EARTH_RADIUS_MILES = 3_958.8;
const METERS_PER_MILE = 1_609.344;

/**
 * Returns the great-circle distance between two coordinates in meters.
 */
export function distanceMeters(a: Coordinate, b: Coordinate): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const haversine =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

/**
 * Returns the great-circle distance between two coordinates in miles.
 */
export function distanceMiles(a: Coordinate, b: Coordinate): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const haversine =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(haversine));
}

/**
 * Returns the total path distance in miles by summing segment distances.
 *
 * Fallback rule: if fewer than 3 breadcrumbs are available, use straight-line
 * (haversine) distance between the first and last point rather than returning 0.
 */
export function pathDistanceMiles(points: Coordinate[]): number {
  if (points.length === 0) return 0;
  if (points.length === 1) return 0;

  // Straight-line fallback for sparse breadcrumb collections
  if (points.length < 3) {
    const [first, last] = [points[0], points[points.length - 1]] as [
      Coordinate,
      Coordinate,
    ];
    return distanceMiles(first, last);
  }

  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const [prev, curr] = [points[i - 1], points[i]] as [Coordinate, Coordinate];
    total += distanceMiles(prev, curr);
  }
  return total;
}

/**
 * Converts meters to miles.
 */
export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

/**
 * Converts miles to kilometers.
 */
export function milesToKilometers(miles: number): number {
  return miles * 1.60934;
}

/**
 * Determines whether a coordinate is within a circular geofence.
 */
export function isInsideGeofence(
  point: Coordinate,
  center: Coordinate,
  radiusMeters: number,
): boolean {
  return distanceMeters(point, center) <= radiusMeters;
}

/**
 * Formats a distance in miles to a human-readable string.
 */
export function formatMiles(miles: number, decimals = 1): string {
  return `${miles.toFixed(decimals)} mi`;
}

/**
 * Formats a distance in kilometers to a human-readable string.
 */
export function formatKilometers(km: number, decimals = 1): string {
  return `${km.toFixed(decimals)} km`;
}

/**
 * Formats a distance (given in miles) using the user's preferred unit.
 * Converts to km when unit is "kilometers".
 */
export function formatDistance(
  miles: number,
  unit: DistanceUnit,
  decimals = 1,
): string {
  if (unit === "kilometers") {
    return formatKilometers(milesToKilometers(miles), decimals);
  }
  return formatMiles(miles, decimals);
}
