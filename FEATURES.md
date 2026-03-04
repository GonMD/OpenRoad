# MileageCalc — Feature List

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

| #   | Feature                                   | Status     | Notes                       |
| --- | ----------------------------------------- | ---------- | --------------------------- |
| 11  | GPS watchPosition hook (`useGeolocation`) | ✅ Done    |                             |
| 12  | Manual GPS enable/disable from Dashboard  | ✅ Done    |                             |
| 13  | Software geofencing hook (`useGeofence`)  | ✅ Done    | Haversine + radius          |
| 14  | Zone enter/exit event emission            | ✅ Done    |                             |
| 15  | Auto-start trip on zone exit              | ✅ Done    | via `useTripTracker`        |
| 16  | Auto-end trip on zone entry               | ✅ Done    | via `useTripTracker`        |
| 17  | GPS accuracy filtering                    | 📋 Planned | threshold from settings     |
| 18  | iOS background location warning           | 📋 Planned | UA detection + banner       |
| 19  | Periodic Background Sync (Android)        | 📋 Planned | requires HTTPS + permission |

---

## Trip Management

| #   | Feature                                            | Status     | Notes                        |
| --- | -------------------------------------------------- | ---------- | ---------------------------- |
| 20  | Trip data model (purpose, status, distance, zones) | ✅ Done    |                              |
| 21  | Breadcrumb collection to IndexedDB                 | ✅ Done    |                              |
| 22  | Haversine path distance calculation                | ✅ Done    |                              |
| 23  | Manual trip start (purpose selection)              | ✅ Done    | Dashboard                    |
| 24  | Manual trip end                                    | ✅ Done    | Dashboard                    |
| 25  | Trip discard                                       | ✅ Done    | Dashboard                    |
| 26  | Trip history list (completed trips)                | ✅ Done    | Trips page                   |
| 27  | Trip delete                                        | ✅ Done    | Trips page                   |
| 28  | Trip edit (purpose, notes, distance)               | 📋 Planned |                              |
| 29  | Trip notes field                                   | ✅ Done    | model ready, edit UI planned |
| 30  | Straight-line fallback (< 3 breadcrumbs)           | 📋 Planned |                              |

---

## Zone Management

| #   | Feature                                  | Status     | Notes                           |
| --- | ---------------------------------------- | ---------- | ------------------------------- |
| 31  | Zone data model (name, lat, lng, radius) | ✅ Done    |                                 |
| 32  | Add zone (manual coordinates)            | ✅ Done    | Zones page                      |
| 33  | Add zone (use current GPS location)      | ✅ Done    | Zones page                      |
| 34  | Delete zone                              | ✅ Done    | Zones page                      |
| 35  | Edit zone                                | 📋 Planned |                                 |
| 36  | Zone map preview                         | 📋 Planned | Leaflet.js                      |
| 37a | Address geocoding for zone creation      | ✅ Done    | Nominatim (OpenStreetMap, free) |

---

## Reports & Export

| #   | Feature                                         | Status     | Notes     |
| --- | ----------------------------------------------- | ---------- | --------- |
| 37  | YTD mileage summary on Dashboard                | ✅ Done    |           |
| 38  | Estimated tax deduction (business) on Dashboard | ✅ Done    |           |
| 39  | Reports page with year + purpose filter         | ✅ Done    |           |
| 40  | Per-purpose mileage + deduction breakdown       | ✅ Done    |           |
| 41  | CSV export                                      | ✅ Done    | PapaParse |
| 42  | PDF export                                      | ✅ Done    | jsPDF     |
| 43  | Medical deduction calculation                   | ✅ Done    |           |
| 44  | Charity deduction calculation                   | ✅ Done    |           |
| 45  | Custom date range filter                        | 📋 Planned |           |
| 46  | Employer reimbursement rate tracking            | 📋 Planned |           |
| 47  | Monthly/weekly breakdown chart                  | 📋 Planned | Recharts  |

---

## Settings

| #   | Feature                              | Status     | Notes                           |
| --- | ------------------------------------ | ---------- | ------------------------------- |
| 48  | Distance unit (miles / km)           | ✅ Done    | setting stored, display pending |
| 49  | GPS accuracy threshold setting       | ✅ Done    | model ready                     |
| 50  | Show/hide accuracy warnings toggle   | ✅ Done    |                                 |
| 51  | Built-in IRS rates table (2022–2025) | ✅ Done    |                                 |
| 52  | Custom IRS rate override             | 📋 Planned |                                 |
| 53  | Clear all data                       | ✅ Done    |                                 |
| 54  | Data export (full backup)            | 📋 Planned | JSON backup/restore             |
| 55  | Data import / restore                | 📋 Planned |                                 |

---

## UX / Polish

| #   | Feature                                  | Status         | Notes                     |
| --- | ---------------------------------------- | -------------- | ------------------------- |
| 56  | Mobile-first dark UI                     | ✅ Done        | Tailwind slate palette    |
| 57  | Bottom tab navigation                    | ✅ Done        |                           |
| 58  | Loading / empty states                   | 🔧 In Progress | basic done, improve later |
| 59  | iOS safe area insets                     | 📋 Planned     | CSS env() variables       |
| 60  | Haptic feedback on trip events           | 📋 Planned     | Navigator.vibrate         |
| 61  | PWA install prompt (Android)             | 📋 Planned     | beforeinstallprompt       |
| 62  | iOS install instructions banner          | 📋 Planned     | UA + localStorage flag    |
| 63  | Offline indicator                        | 📋 Planned     |                           |
| 64  | Trip-in-progress persistent notification | 📋 Planned     | Notification API          |
| 65  | Onboarding / first-run walkthrough       | 📋 Planned     |                           |

---

## Future / Stretch Goals

| #   | Feature                             | Status     | Notes      |
| --- | ----------------------------------- | ---------- | ---------- |
| 66  | Map trip path visualization         | 📋 Planned | Leaflet.js |
| 67  | Recurring trip templates            | 📋 Planned |            |
| 68  | iCloud / Google Drive optional sync | 📋 Planned |            |
| 69  | Multiple vehicle profiles           | 📋 Planned |            |
| 70  | Dark / light mode toggle            | 📋 Planned |            |
| 71  | Accessibility audit (a11y)          | 📋 Planned |            |
| 72  | Unit test suite                     | 📋 Planned | Vitest     |
| 73  | E2E test suite                      | 📋 Planned | Playwright |
