# OpenRoad

**Free, private mileage tracking for tax deductions and employer reimbursement.**

OpenRoad is a Progressive Web App (PWA) that automatically tracks your vehicle mileage using GPS. It calculates IRS standard mileage deductions for business, medical, and charity trips—all without app stores, subscriptions, or sending your data to the cloud.

Your data stays on your device. Always.

## Quick Install

### Android (Chrome)

1. Visit the app URL in Chrome
2. Tap **menu (...)** > **Add to Home Screen** > **Install**

### iPhone/iPad (Safari)

1. Visit the app URL in Safari (not Chrome)
2. Tap **Share** > **Add to Home Screen** > **Add**

> **Note for iOS users:** Safari doesn't support background GPS in PWAs. Keep the screen on during trips. OpenRoad includes a screen-dimming feature to save battery while tracking.

---

## How It Works

### Automatic Trip Detection

1. **Create zones** for places you visit regularly (home, office, clients)
2. **Enable GPS** on the Dashboard
3. **Drive** — OpenRoad detects when you leave a zone (trip starts) and enter another zone (trip ends)
4. **Review** your trip, add notes, and confirm

### Manual Tracking

Don't want to set up zones? Start and end trips manually:

1. Tap a purpose button (Business, Medical, Charity, Personal) to start
2. Tap **End Trip** when you arrive
3. Add notes and save

---

## Features

### Trip Tracking

- **GPS breadcrumb recording** with distance calculated from actual path
- **Automatic start/stop** via geofencing when you enter or leave zones
- **Pit stop detection** — automatically marks intermediate zone visits
- **Odometer photos** — capture start and end readings for documentation
- **Trip notes** with voice dictation support

### Multiple Vehicles

- Add vehicles with photos, type, year/make/model, and VIN
- Assign trips to specific vehicles
- Filter reports by vehicle

### Quick Start Templates

- Save common trips as templates
- One-tap to start recurring trips with pre-filled purpose and notes

### Route Planner

- Plan multi-stop routes before driving
- **Right-turn optimization** — reorders stops to minimize left turns (safer, faster)
- Turn-by-turn directions with distance and time estimates
- Save routes for future use

### Reports & Export

- Filter by year, date range, purpose, or vehicle
- Monthly mileage chart
- **CSV export** for spreadsheets
- **PDF export** for tax records
- Automatic IRS deduction calculations

### IRS Mileage Rates (Built-in)

| Year | Business | Medical | Charity |
| ---- | -------- | ------- | ------- |
| 2025 | 70.0¢    | 21¢     | 14¢     |
| 2024 | 67.0¢    | 21¢     | 14¢     |
| 2023 | 65.5¢    | 22¢     | 14¢     |
| 2022 | 58.5¢    | 18¢     | 14¢     |

Custom rates can be configured in Settings.

### Privacy & Backup

- **100% local storage** — no accounts, no cloud sync, no tracking
- **Full backup/restore** — export all data as JSON
- **Configurable data retention** — auto-delete old GPS samples

---

## Settings Guide

| Setting                       | What it does                                                      |
| ----------------------------- | ----------------------------------------------------------------- |
| **Distance Unit**             | Display miles or kilometers                                       |
| **Keep Screen On**            | Prevents sleep during active trips                                |
| **Auto-Dim**                  | Darkens screen while tracking to save battery                     |
| **GPS Accuracy Threshold**    | Ignores readings worse than X meters (reduces drift)              |
| **Min Trip Distance**         | Auto-discards trips shorter than this (filters accidental starts) |
| **Employer Reimbursement**    | Enter your employer's rate to see the gap vs. IRS rate            |
| **Location Sample Retention** | How many days to keep GPS breadcrumbs (0 = forever)               |

---

## FAQ

### General

**Q: Is this really free?**
Yes. No subscription, no ads, no in-app purchases. The app runs entirely on your device.

**Q: Where is my data stored?**
All data is stored locally in your browser's IndexedDB. Nothing is sent to any server. If you clear browser data or uninstall the app, your data will be lost unless you've made a backup.

**Q: Can I use this on multiple devices?**
Yes, but data doesn't sync between devices. Use the backup/restore feature to transfer data manually.

### iOS Specific

**Q: Why does the app stop tracking when I switch apps on iPhone?**
Safari doesn't allow PWAs to access GPS in the background. Keep OpenRoad visible on screen during trips. Use the auto-dim feature to save battery.

**Q: The app lost my trip when I accidentally closed it. Can this be prevented?**
OpenRoad now saves trip progress every 30 seconds and when you switch apps. If the app is force-closed, it will recover your in-progress trip when reopened—you won't lose your data.

**Q: Why do I have to use Safari?**
Only Safari can install PWAs on iOS. Chrome, Firefox, and other browsers on iPhone use Safari's engine but can't access PWA features like home screen installation.

### Android Specific

**Q: Does it track in the background on Android?**
Yes, better than iOS. Android Chrome allows background GPS access for PWAs. A notification will appear while a trip is in progress.

**Q: The GPS seems inaccurate. What can I do?**

- Enable **High Accuracy** mode in your phone's location settings
- Increase the GPS accuracy threshold in Settings if you're getting drift
- Make sure you're not in a building or underground when starting

### Trips

**Q: Why was my trip auto-discarded?**
Trips shorter than the minimum distance (default: 0.1 miles) are automatically discarded. This prevents accidental trip starts. Adjust this in Settings.

**Q: Can I edit a trip after it's saved?**
Yes. Go to the Trips tab, tap a trip, and edit the purpose, distance, notes, or odometer readings.

**Q: What's a pit stop?**
When you enter a zone during an active trip (but not the zone where you started), OpenRoad marks it as a pit stop. This is useful for documenting client visits or multiple stops on a single trip.

**Q: How is distance calculated?**
Distance is the sum of GPS coordinates collected during your trip (path distance), not straight-line distance. This accurately reflects the actual route driven.

### Zones & Geofencing

**Q: How big should my zones be?**
Start with the default (200 meters). If trips start/end too early or late, adjust the radius. Larger zones trigger earlier; smaller zones require you to be closer.

**Q: Can zones overlap?**
Yes. The app handles overlapping zones gracefully. Entering any zone can end a trip.

**Q: The app started a trip when I was just walking around my property.**
Make your home zone larger, or increase the minimum trip distance to filter out short movements.

### Reports & Taxes

**Q: Is this IRS-compliant?**
OpenRoad generates reports with the data the IRS requires: date, origin, destination, purpose, and miles. However, consult a tax professional for specific advice about your situation.

**Q: Can I customize the IRS rates?**
Yes. Go to Settings and enter custom rates for business, medical, or charity. This is useful if rates change mid-year or your accountant uses different figures.

**Q: What's the employer reimbursement field for?**
If your employer reimburses mileage at a lower rate than the IRS standard, enter their rate. Reports will show the difference—the amount you can still deduct on your taxes.

### Technical

**Q: How do I update the app?**
PWAs update automatically. When a new version is available, you'll see a banner prompting you to refresh.

**Q: How do I completely remove my data?**
Go to Settings > Danger Zone > Clear All Data. This cannot be undone.

**Q: Can I export my data to another app?**
Yes. Use Settings > Export Backup to download a JSON file, or use Reports > Export CSV for a spreadsheet-compatible format.

---

## Troubleshooting

| Problem                         | Solution                                                                 |
| ------------------------------- | ------------------------------------------------------------------------ |
| GPS not working                 | Check browser location permissions. Try toggling GPS off and on.         |
| Trips not auto-starting         | Ensure you've created zones and GPS is enabled on the Dashboard.         |
| High battery usage              | Enable auto-dim. Consider reducing GPS polling frequency if available.   |
| App crashed during a trip       | Reopen the app—it will recover any in-progress trip automatically.       |
| Data missing after phone update | PWA data persists through OS updates. If missing, restore from a backup. |
| Map not loading                 | Check your internet connection. Maps require network access.             |

---

## Development

### Prerequisites

- Node.js 18+

### Setup

```bash
git clone <repo-url>
cd milageCalc
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Build for Production

```bash
npm run build
npm run preview
```

### Code Quality

- TypeScript strict mode
- ESLint with strict rules
- Prettier formatting
- Husky pre-commit hooks (lint + typecheck)

---

## Tech Stack

| Layer      | Technology                 |
| ---------- | -------------------------- |
| Framework  | React 19                   |
| Build      | Vite 7                     |
| Language   | TypeScript (strict)        |
| Storage    | Dexie.js (IndexedDB)       |
| PWA        | vite-plugin-pwa + Workbox  |
| Maps       | Leaflet.js + OpenStreetMap |
| Geocoding  | Nominatim (OpenStreetMap)  |
| Routing    | OSRM                       |
| PDF Export | jsPDF                      |
| CSV Export | PapaParse                  |

---

## Support the Project

If OpenRoad saves you time or money, consider supporting development:

- PayPal
- Cash App
- Venmo

Links available in the app under Settings.

---

## License

MIT
