# OpenRoad — Feature List

Legend: ✅ Done | 🔧 In Progress | 📋 Planned | ❌ Blocked

---

## Core Infrastructure

| #   | Feature                                   | Status  | Notes                       |
| --- | ----------------------------------------- | ------- | --------------------------- |
| 1   | Vite + React + TypeScript strict scaffold | ✅ Done |                             |
| 2   | Tailwind CSS v4                           | ✅ Done |                             |
| 3   | PWA manifest + service worker (Workbox)   | ✅ Done |                             |
| 4   | Installable on Android via Chrome         | ✅ Done |                             |
| 5   | Installable on iOS via Safari             | ✅ Done | Limited background location |
| 6   | ESLint (strict TS + React hooks)          | ✅ Done |                             |
| 7   | Prettier formatting                       | ✅ Done |                             |
| 8   | Husky pre-commit (lint + typecheck)       | ✅ Done |                             |
| 9   | IndexedDB schema via Dexie.js             | ✅ Done | v1 schema                   |
| 10  | Git repository initialized                | ✅ Done |                             |

---

## Geolocation & Geofencing

| #   | Feature                                   | Status  | Notes                                                                                     |
| --- | ----------------------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| 11  | GPS watchPosition hook (`useGeolocation`) | ✅ Done |                                                                                           |
| 12  | Manual GPS enable/disable from Dashboard  | ✅ Done |                                                                                           |
| 13  | Software geofencing hook (`useGeofence`)  | ✅ Done | Haversine + radius                                                                        |
| 14  | Zone enter/exit event emission            | ✅ Done |                                                                                           |
| 15  | Auto-start trip on zone exit              | ✅ Done | via `useTripTracker`                                                                      |
| 16  | Auto-end trip on zone entry               | ✅ Done | via `useTripTracker`                                                                      |
| 17  | GPS accuracy filtering                    | ✅ Done | threshold from settings (`maxAccuracyThresholdMeters`)                                    |
| 18  | iOS background location warning           | ✅ Done | `usePwaInstall` UA detection + `BannerBar`                                                |
| 19  | Periodic Background Sync (Android)        | ✅ Done | `useBackgroundSync` + custom `src/sw.ts`; `injectManifest` strategy; no-op on iOS/Firefox |

---

## Trip Management

| #   | Feature                                            | Status  | Notes                                |
| --- | -------------------------------------------------- | ------- | ------------------------------------ |
| 20  | Trip data model (purpose, status, distance, zones) | ✅ Done |                                      |
| 21  | Breadcrumb collection to IndexedDB                 | ✅ Done |                                      |
| 22  | Haversine path distance calculation                | ✅ Done |                                      |
| 23  | Manual trip start (purpose selection)              | ✅ Done | Dashboard                            |
| 24  | Manual trip end                                    | ✅ Done | Dashboard                            |
| 25  | Trip discard                                       | ✅ Done | Dashboard                            |
| 26  | Trip history list (completed trips)                | ✅ Done | Trips page                           |
| 27  | Trip delete                                        | ✅ Done | Trips page                           |
| 28  | Trip edit (purpose, notes, distance)               | ✅ Done | `EditTripModal` bottom sheet         |
| 29  | Trip notes field                                   | ✅ Done |                                      |
| 30  | Straight-line fallback (< 3 breadcrumbs)           | ✅ Done | `pathDistanceMiles` in `distance.ts` |

---

## Zone Management

| #   | Feature                                  | Status  | Notes                                                         |
| --- | ---------------------------------------- | ------- | ------------------------------------------------------------- |
| 31  | Zone data model (name, lat, lng, radius) | ✅ Done |                                                               |
| 32  | Add zone (manual coordinates)            | ✅ Done | Zones page                                                    |
| 33  | Add zone (use current GPS location)      | ✅ Done | Zones page                                                    |
| 34  | Delete zone                              | ✅ Done | Zones page                                                    |
| 35  | Edit zone                                | ✅ Done | Inline edit form, same fields as add                          |
| 36  | Zone map preview                         | ✅ Done | Leaflet.js; toggle button on ZoneCard; OSM tiles cached by SW |
| 37a | Address geocoding for zone creation      | ✅ Done | Nominatim (OpenStreetMap, free)                               |

---

## Reports & Export

| #   | Feature                                         | Status  | Notes                                                     |
| --- | ----------------------------------------------- | ------- | --------------------------------------------------------- |
| 37  | YTD mileage summary on Dashboard                | ✅ Done |                                                           |
| 38  | Estimated tax deduction (business) on Dashboard | ✅ Done |                                                           |
| 39  | Reports page with year + purpose filter         | ✅ Done |                                                           |
| 40  | Per-purpose mileage + deduction breakdown       | ✅ Done |                                                           |
| 41  | CSV export                                      | ✅ Done | PapaParse                                                 |
| 42  | PDF export                                      | ✅ Done | jsPDF                                                     |
| 43  | Medical deduction calculation                   | ✅ Done |                                                           |
| 44  | Charity deduction calculation                   | ✅ Done |                                                           |
| 45  | Custom date range filter                        | ✅ Done | Toggle replaces year picker; query uses startDate/endDate |
| 46  | Employer reimbursement rate tracking            | ✅ Done | Settings field + Reports display                          |
| 47  | Monthly bar chart (miles/month)                 | ✅ Done | SVG bars in ReportsPage                                   |

---

## Settings

| #   | Feature                              | Status  | Notes                                                                            |
| --- | ------------------------------------ | ------- | -------------------------------------------------------------------------------- |
| 48  | Distance unit (miles / km)           | ✅ Done | stored in settings; `formatDistance()` used throughout Dashboard, Trips, Reports |
| 49  | GPS accuracy threshold setting       | ✅ Done | model ready                                                                      |
| 50  | Show/hide accuracy warnings toggle   | ✅ Done |                                                                                  |
| 51  | Built-in IRS rates table (2022–2025) | ✅ Done |                                                                                  |
| 52  | Custom IRS rate override             | ✅ Done | Stored in `AppSettings.customIrsRates`                                           |
| 53  | Clear all data                       | ✅ Done |                                                                                  |
| 54  | Data export (full backup)            | ✅ Done | `backup.ts` — JSON export                                                        |
| 55  | Data import / restore                | ✅ Done | `backup.ts` — JSON import                                                        |

---

## UX / Polish

| #   | Feature                                  | Status  | Notes                                                                                  |
| --- | ---------------------------------------- | ------- | -------------------------------------------------------------------------------------- |
| 56  | Mobile-first dark UI (MD3)               | ✅ Done | Material Design 3, hand-rolled CSS                                                     |
| 57  | Bottom tab navigation (MD3 nav bar)      | ✅ Done | Pill indicators, active state                                                          |
| 58  | Loading / empty states                   | ✅ Done | Inline spinners, empty messages                                                        |
| 59  | iOS safe area insets                     | ✅ Done | `env(safe-area-inset-bottom)` in nav bar                                               |
| 60  | Haptic feedback on trip events           | ✅ Done | Navigator.vibrate — start/end/discard pulses                                           |
| 61  | PWA install prompt (Android)             | ✅ Done | `usePwaInstall` + `BannerBar`                                                          |
| 62  | iOS install instructions banner          | ✅ Done | UA detection in `usePwaInstall`                                                        |
| 63  | Offline indicator                        | ✅ Done | `usePwaInstall` online/offline state + `BannerBar`                                     |
| 64  | Trip-in-progress persistent notification | ✅ Done | Notification API; `useTripNotification` hook; graceful no-op on iOS Safari             |
| 65  | Onboarding / first-run walkthrough       | ✅ Done | 4-step bottom-sheet modal; `mc-onboarded` localStorage flag; Skip + Back + Get Started |

---

## Future / Stretch Goals

| #   | Feature                             | Status     | Notes                                                                                                                                                                                                                                       |
| --- | ----------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 66  | Map trip path visualization         | ✅ Done    | Leaflet.js polyline in TripCard + EditTripModal                                                                                                                                                                                             |
| 67  | Recurring trip templates            | ✅ Done    | TripTemplate DB table (v3); ManageTemplatesModal; Quick Start cards on Dashboard; Save as Template in EditTripModal                                                                                                                         |
| 68  | iCloud / Google Drive optional sync | 📋 Planned |                                                                                                                                                                                                                                             |
| 69  | Multiple vehicle profiles           | ✅ Done    | Vehicle interface + DB v4 (vehicles table); ManageVehiclesModal; SettingsPage vehicle section; Trip.vehicleId stored on start; TripCard vehicle badge; EditTripModal vehicle row; ReportsPage vehicle filter chips + CSV/PDF Vehicle column |
| 70  | Dark / light mode toggle            | ✅ Done    | CSS tokens + useTheme hook + localStorage, anti-flash inline script                                                                                                                                                                         |
| 71  | Accessibility audit (a11y)          | 📋 Planned |                                                                                                                                                                                                                                             |
| 72  | Unit test suite                     | 📋 Planned | Vitest                                                                                                                                                                                                                                      |
| 73  | E2E test suite                      | 📋 Planned | Playwright                                                                                                                                                                                                                                  |

---

## Addresses & Pit Stops

| #   | Feature                                              | Status  | Notes                                                                                                                                                                                                                                                                            |
| --- | ---------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 74  | Reverse-geocode trip origin & destination addresses  | ✅ Done | Nominatim; fire-and-forget after `endTrip()`; displayed on TripCard, EditTripModal                                                                                                                                                                                               |
| 75  | Pit stop detection (auto on geofence enter mid-trip) | ✅ Done | `useTripTracker`: new zone entry = PitStop; known/origin zone re-entry = end trip                                                                                                                                                                                                |
| 75a | Manual "Add Pit Stop" button during active trip      | ✅ Done | Dashboard active-trip card; icon button beside End Trip                                                                                                                                                                                                                          |
| 75b | Pit stop list on TripCard, EditTripModal             | ✅ Done | Sorted by milesFromOrigin; address resolved async                                                                                                                                                                                                                                |
| 76  | IRS mileage log export format (CSV + PDF)            | ✅ Done | Columns: Date, Origin, Destination, Pit Stops, Purpose, Miles, Deduction, Reimb, Notes; landscape PDF                                                                                                                                                                            |
| 77  | Location sample "Purge Now" button in Settings       | ✅ Done | Immediate manual purge with ✓ confirmation; startup auto-purge already existed                                                                                                                                                                                                   |
| 78  | Odometer readings + photos                           | ✅ Done | odometerStart/End + photo fields (base64 JPEG, compressed); DB v5 migration; OdometerCapture component; captured at trip start (inline sheet) and end (EndTripModal); editable in EditTripModal; odometer span shown on TripCard; Odometer Start/End columns in CSV + PDF export |
