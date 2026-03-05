# OpenRoad

A Progressive Web App (PWA) for automatically tracking vehicle mileage using GPS. Built for IRS standard mileage deductions and employer reimbursement programs. No app store required.

https://openroad.drgon47.workers.dev

## Install on Your Device

### Android

1. Open the app URL in **Chrome**
2. Tap the browser menu (three dots) → **Add to Home Screen**
3. Tap **Install**

### iOS

1. Open the app URL in **Safari**
2. Tap the **Share** button → **Add to Home Screen**
3. Tap **Add**

> **iOS note:** Safari does not support background location in PWAs. Keep the screen active while a trip is in progress.

---

## Run Locally (Development)

**Prerequisites:** Node.js 18+

```bash
git clone <repo-url>
cd milageCalc
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

To build for production:

```bash
npm run build
npm run preview
```

---

## How to Use

### 1. Set Up Zones

Zones are GPS locations you frequently visit (home, office, etc.). The app uses them to automatically detect when a trip starts or ends.

- Go to the **Zones** tab
- Tap the **+** button to add a zone
- Enter a name and allow the app to use your current location, or search for an address
- Adjust the radius if needed (default: 200m)

### 2. Track a Trip

Trips are tracked automatically when you leave a zone and end when you enter another.

- **Automatic:** Leave a zone → trip starts. Arrive at a zone → trip ends.
- **Manual:** Use the controls on the **Dashboard** tab to start or end a trip at any time.
- When a trip ends, confirm its purpose: **Business**, **Medical**, **Charity**, or **Personal**.

### 3. View Trip History

- Go to the **Trips** tab to see all recorded trips with distance and purpose badges.
- Tap a trip to edit its details or notes.

### 4. Export Reports

- Go to the **Reports** tab
- Filter by date range or purpose
- Export as **CSV** or **PDF** for tax filing or expense submission

### 5. Settings

- Go to the **Settings** tab to configure:
  - Distance unit (miles or kilometers)
  - GPS accuracy threshold
  - Minimum trip distance (shorter trips are discarded)
  - Employer reimbursement rate
  - Data backup and restore

---

## IRS Mileage Rates (built-in)

| Year | Business | Medical | Charity |
| ---- | -------- | ------- | ------- |
| 2025 | 70¢/mi   | 21¢/mi  | 14¢/mi  |
| 2024 | 67¢/mi   | 21¢/mi  | 14¢/mi  |
| 2023 | 65.5¢/mi | 22¢/mi  | 14¢/mi  |
| 2022 | 58.5¢/mi | 18¢/mi  | 14¢/mi  |

Deduction values are calculated automatically in the Reports tab.
