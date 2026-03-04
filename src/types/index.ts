// ─── Trip Purpose ────────────────────────────────────────────────────────────

export type TripPurpose = "business" | "medical" | "charity" | "personal";

export const TRIP_PURPOSE_LABELS: Record<TripPurpose, string> = {
  business: "Business",
  medical: "Medical",
  charity: "Charity",
  personal: "Personal",
};

// ─── IRS Standard Mileage Rates (cents per mile) ─────────────────────────────

export interface IrsRates {
  year: number;
  business: number; // cents per mile
  medical: number;
  charity: number;
}

// ─── Coordinate ───────────────────────────────────────────────────────────────

export interface Coordinate {
  lat: number;
  lng: number;
}

// ─── Geofence Zone ────────────────────────────────────────────────────────────

export interface Zone {
  id?: number;
  name: string;
  lat: number;
  lng: number;
  /** Radius in meters */
  radiusMeters: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Location Sample (raw GPS breadcrumb) ────────────────────────────────────

export interface LocationSample {
  id?: number;
  tripId: number;
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: Date;
}

// ─── Pit Stop ─────────────────────────────────────────────────────────────────

export interface PitStop {
  /** Zone id if auto-detected, null if manual */
  zoneId: number | null;
  /** Zone name or manual label */
  label: string;
  /** Miles from trip origin at time of stop */
  milesFromOrigin: number;
  /** ISO timestamp of the stop */
  arrivedAt: string;
  /** Reverse-geocoded address (resolved async after trip ends) */
  address: string | null;
}

// ─── Vehicle Profile ──────────────────────────────────────────────────────────

export interface Vehicle {
  id?: number;
  name: string;
  year: number | null;
  make: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Trip ─────────────────────────────────────────────────────────────────────

export type TripStatus = "in_progress" | "completed" | "discarded";

export interface Trip {
  id?: number;
  purpose: TripPurpose;
  status: TripStatus;
  /** Zone id the trip started from */
  originZoneId: number | null;
  /** Zone id the trip ended at */
  destinationZoneId: number | null;
  startedAt: Date;
  endedAt: Date | null;
  /** Computed total distance in miles */
  distanceMiles: number;
  notes: string;
  /** Reverse-geocoded start address (resolved async after trip ends) */
  originAddress: string | null;
  /** Reverse-geocoded end address (resolved async after trip ends) */
  destinationAddress: string | null;
  /** Pit stops along the route, sorted by milesFromOrigin ascending */
  pitStops: PitStop[];
  /** Vehicle profile id (null = unassigned) */
  vehicleId: number | null;
  /** Odometer reading at trip start (user-entered, in the user's preferred unit) */
  odometerStart: number | null;
  /** Odometer reading at trip end (user-entered, in the user's preferred unit) */
  odometerEnd: number | null;
  /** Base64-encoded JPEG photo of odometer at start (compressed) */
  odometerStartPhoto: string | null;
  /** Base64-encoded JPEG photo of odometer at end (compressed) */
  odometerEndPhoto: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export type DistanceUnit = "miles" | "kilometers";

export interface AppSettings {
  id?: number;
  distanceUnit: DistanceUnit;
  /** Custom IRS rate overrides (falls back to built-in rates if null) */
  customIrsRates: IrsRates | null;
  /** Whether to show battery/accuracy warnings */
  showAccuracyWarnings: boolean;
  /** Minimum accuracy threshold in meters (readings above this are ignored) */
  maxAccuracyThresholdMeters: number;
  /** Trips shorter than this (miles) are auto-discarded on end */
  minTripDistanceMiles: number;
  /** Location samples older than this many days are purged on startup (0 = never) */
  locationSampleMaxAgeDays: number;
  /** Employer reimbursement rate in cents per mile (0 = disabled) */
  employerReimbursementCents: number;
  /** The currently active vehicle profile id (null = no vehicle selected) */
  activeVehicleId: number | null;
  updatedAt: Date;
}

// ─── Report Filter ────────────────────────────────────────────────────────────

export interface ReportFilter {
  startDate: Date | null;
  endDate: Date | null;
  purposes: TripPurpose[];
  minMiles: number | null;
  maxMiles: number | null;
}

// ─── Trip Template ────────────────────────────────────────────────────────────

export interface TripTemplate {
  id?: number;
  /** Display name shown on the quick-start button */
  name: string;
  purpose: TripPurpose;
  /** Pre-filled notes when a trip is started from this template */
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Export ───────────────────────────────────────────────────────────────────

export type ExportFormat = "csv" | "pdf";
