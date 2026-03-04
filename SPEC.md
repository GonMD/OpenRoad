# OpenRoad — Technical Specification

## Overview

OpenRoad is a Progressive Web App (PWA) that automatically tracks vehicle
mileage using GPS and geofencing for use in tax deductions (IRS standard mileage
rate) and employer benefit programs.

No app stores. No developer accounts. No fees. Install via browser on Android
or iOS.

---

## Distribution

| Platform | Method                      | Notes                                                        |
| -------- | --------------------------- | ------------------------------------------------------------ |
| Android  | Chrome "Add to Home Screen" | Full PWA support, background sync                            |
| iOS      | Safari "Add to Home Screen" | Limited background location; foreground tracking recommended |

---

## Technology Stack

| Layer      | Library / Tool                  | Version       |
| ---------- | ------------------------------- | ------------- |
| Framework  | React                           | ^19           |
| Build tool | Vite                            | ^7            |
| Language   | TypeScript                      | ~5.9 (strict) |
| Styling    | Tailwind CSS v4                 | ^4            |
| Routing    | React Router DOM                | ^7            |
| Local DB   | Dexie.js (IndexedDB)            | ^4            |
| PWA        | vite-plugin-pwa + Workbox       | ^1 / ^7       |
| PDF export | jsPDF                           | ^4            |
| CSV export | PapaParse                       | ^5            |
| Linter     | ESLint (flat config, strict TS) | ^9            |
| Formatter  | Prettier                        | ^3            |
| Git hooks  | Husky + lint-staged             | ^9 / ^16      |

---

## Data Model

### `Zone`

```ts
{
  id: number; // auto-increment PK
  name: string; // "Home", "Office", etc.
  lat: number;
  lng: number;
  radiusMeters: number; // default 200m
  createdAt: Date;
  updatedAt: Date;
}
```

Indexes: `name`, `createdAt`

### `Trip`

```ts
{
  id: number;
  purpose: "business" | "medical" | "charity" | "personal";
  status: "in_progress" | "completed" | "discarded";
  originZoneId: number | null;
  destinationZoneId: number | null;
  startedAt: Date;
  endedAt: Date | null;
  distanceMiles: number; // computed from breadcrumbs
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}
```

Indexes: `purpose`, `status`, `originZoneId`, `destinationZoneId`, `startedAt`, `createdAt`

### `LocationSample`

```ts
{
  id: number;
  tripId: number; // FK → Trip.id
  lat: number;
  lng: number;
  accuracy: number; // meters
  timestamp: Date;
}
```

Indexes: `tripId`, `timestamp`

### `AppSettings` (singleton)

```ts
{
  id: number;
  distanceUnit: "miles" | "kilometers";
  customIrsRates: IrsRates | null;
  showAccuracyWarnings: boolean;
  maxAccuracyThresholdMeters: number;
  minTripDistanceMiles: number; // trips below this are discarded
  locationSampleMaxAgeDays: number; // purge old breadcrumbs after N days
  employerReimbursementCents: number; // cents/mile for employer programs
  updatedAt: Date;
}
```

---

## Geofencing Architecture

The Web Geolocation API does not provide native geofencing. MileageCalc
implements software geofencing:

1. `useGeolocation` — wraps `navigator.geolocation.watchPosition`. Returns a
   live `Coordinate` updated every GPS poll cycle.

2. `useGeofence` — receives the live coordinate and a list of `Zone` records.
   On every coordinate update it computes which zones contain the coordinate
   (Haversine ≤ radius). It diffs the current inside-set against the previous
   inside-set to fire `enter` / `exit` events.

3. `useTripTracker` — consumes geofence events:
   - `exit` event on any zone → `startTrip(defaultPurpose, zoneId)`
   - `enter` event on any zone → `endTrip(zoneId)`
     Also exposes `startTrip` / `endTrip` / `discardTrip` for manual control.

4. Breadcrumbs — every GPS coordinate while a trip is `in_progress` is appended
   to `LocationSample` in IndexedDB. Distance is computed as the sum of
   Haversine segments over the breadcrumb path.

### iOS Limitations

Safari does not allow background geolocation in PWAs. The app will:

- Warn users on iOS that the screen must stay active during a trip.
- Fall back gracefully to a straight-line distance estimate if < 3 breadcrumbs
  were captured.

### GPS Accuracy Filtering

Readings with `accuracy > settings.maxAccuracyThresholdMeters` are discarded
to avoid GPS drift inflating mileage.

---

## IRS Standard Mileage Rates

Built-in rates (cents/mile):

| Year | Business | Medical | Charity |
| ---- | -------- | ------- | ------- |
| 2025 | 70¢      | 21¢     | 14¢     |
| 2024 | 67¢      | 21¢     | 14¢     |
| 2023 | 65.5¢    | 22¢     | 14¢     |
| 2022 | 58.5¢    | 18¢     | 14¢     |

Custom rate overrides are planned (stored in `AppSettings.customIrsRates`).

---

## UI Design System

MileageCalc uses a hand-rolled **Material Design 3 (MD3)** dark theme defined
entirely in `src/index.css` via CSS custom properties and component utility
classes. No MD3 component library is used.

### Color tokens (dark scheme, seed: `#4A90D9`)

| Token                       | Value     | Role                     |
| --------------------------- | --------- | ------------------------ |
| `--md-surface`              | `#0f1117` | Page background          |
| `--md-surface-container`    | `#171b26` | Card / nav surface       |
| `--md-primary`              | `#9ecaff` | Interactive accent       |
| `--md-primary-container`    | `#00497d` | FAB / active indicators  |
| `--md-on-primary-container` | `#d1e4ff` | FAB icon color           |
| `--md-secondary-container`  | `#3c4858` | Tonal buttons / nav pill |
| `--md-on-surface`           | `#e3e2e9` | Primary text             |
| `--md-on-surface-variant`   | `#c3c5d0` | Secondary text           |
| `--md-outline-variant`      | `#43454f` | Dividers / input borders |
| `--md-error`                | `#ffb4ab` | Destructive actions      |
| `--md-success`              | `#6ddc8b` | Positive states          |

### Component classes

`.md-card` · `.md-card-elevated` · `.md-card-filled`
`.md-btn-filled` · `.md-btn-tonal` · `.md-btn-outlined` · `.md-btn-text` · `.md-btn-error-text`
`.md-fab` · `.md-fab-extended`
`.md-chip` · `.md-chip-selected`
`.md-input` · `.md-textarea` · `.md-select` · `.md-field` · `.md-field-label`
`.md-badge` · `.badge-business` · `.badge-medical` · `.badge-charity` · `.badge-personal`
`.md-bottom-sheet` · `.md-bottom-sheet-scrim` · `.md-bottom-sheet-surface` · `.md-bottom-sheet-handle`
`.md-nav-bar` · `.md-nav-item` · `.md-nav-item-active` · `.md-nav-indicator` · `.md-nav-indicator-inactive`
`.md-section-header` · `.md-divider` · `.md-list-item`
`.md-switch` · `.md-spinner` · `.md-pulse-ring`

---

## Source Layout

```
src/
  components/
    layout/
      AppLayout.tsx       # Outlet wrapper + surface colors
      BottomNav.tsx       # MD3 nav bar with pill indicators
      BannerBar.tsx       # MD3 primary-container banners (install / offline)
    EndTripModal.tsx      # MD3 bottom sheet — confirm end trip
    EditTripModal.tsx     # MD3 bottom sheet — edit trip details
  db/
    index.ts              # Dexie schema, helpers, default settings
  hooks/
    useGeolocation.ts     # GPS watchPosition wrapper
    useGeofence.ts        # Zone enter/exit event emitter
    useTripTracker.ts     # Trip lifecycle state machine
    usePwaInstall.ts      # beforeinstallprompt + iOS detection + offline
  lib/
    distance.ts           # Haversine, path distance, formatting
    irsRates.ts           # Built-in rate table, deduction calculator
    geocode.ts            # Nominatim (OpenStreetMap) address lookup
    backup.ts             # JSON backup export / import
  pages/
    DashboardPage.tsx     # Active trip card, pulse ring, purpose FAB grid, YTD stats
    TripsPage.tsx         # Trip history with purpose badges
    ZonesPage.tsx         # Zone CRUD with extended FAB
    ReportsPage.tsx       # Filter chips, monthly chart, CSV/PDF export
    SettingsPage.tsx      # Section headers, MD3 switches, rate mini-cards
  types/
    index.ts              # Shared TypeScript interfaces & enums
  App.tsx                 # BrowserRouter + Routes
  main.tsx                # ReactDOM entry point
  index.css               # MD3 design tokens + component classes
public/
  pwa-192x192.png         # PWA icon
  pwa-512x512.png         # PWA icon (maskable)
  apple-touch-icon.png    # iOS home screen icon (180×180)
```

---

## Code Quality

All commits are gated by:

```
husky pre-commit:
  1. lint-staged → prettier --write + eslint --fix on staged files
  2. tsc -b --noEmit (full project typecheck)
```

TypeScript is configured with:

- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`

ESLint rules include:

- `@typescript-eslint/strictTypeChecked`
- `@typescript-eslint/stylisticTypeChecked`
- `react-hooks/rules-of-hooks`
- `react-hooks/exhaustive-deps`
- `prettier/prettier` (reports format violations as errors)

---

## PWA Configuration

- Service worker via Workbox (GenerateSW strategy)
- Precaches all `js`, `css`, `html`, `ico`, `png`, `svg`, `woff2` assets
- Runtime caches Google Fonts (CacheFirst, 1 year TTL)
- `manifest.json` declares `standalone` display, `portrait` orientation
- iOS meta tags for splash screen and status bar configured in `index.html`

---

## Planned Enhancements

See `FEATURES.md` for full feature status.

- Map visualization of trip paths (Leaflet.js)
- Custom IRS rate overrides (UI complete, persisted in `AppSettings.customIrsRates`)
- Employer reimbursement rate tracking (stored in `AppSettings.employerReimbursementCents`)
- Custom date range filter on Reports page
- Trip edit bottom sheet
- Zone edit
- Recurring zone-pair trip templates
- Optional iCloud / Google Drive backup
- Notification reminders to start/end trips
- Periodic Background Sync (Android, requires HTTPS)
