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

// ─── Export ───────────────────────────────────────────────────────────────────

export type ExportFormat = "csv" | "pdf";
