import { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, getSettings } from "../db/index.js";
import {
  getRatesForYear,
  computeDeduction,
  formatCurrency,
} from "../lib/irsRates.js";
import { formatDistance } from "../lib/distance.js";
import { TRIP_PURPOSE_LABELS } from "../types/index.js";
import type {
  TripPurpose,
  AppSettings,
  DistanceUnit,
  Vehicle,
} from "../types/index.js";
import { vehicleLabel } from "../lib/vehicleLabel.js";
import Papa from "papaparse";
import { jsPDF } from "jspdf";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_PURPOSES: TripPurpose[] = [
  "business",
  "medical",
  "charity",
  "personal",
];

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const EMPTY_VEHICLES: Vehicle[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfYear(year: number): Date {
  return new Date(year, 0, 1);
}

function endOfYear(year: number): Date {
  return new Date(year, 11, 31, 23, 59, 59, 999);
}

// ─── Monthly bar chart ────────────────────────────────────────────────────────

function MonthlyChart({
  data,
  distanceUnit,
}: {
  data: number[];
  distanceUnit: DistanceUnit;
}) {
  const max = Math.max(...data, 0.01);
  return (
    <div>
      <p
        style={{
          fontSize: "0.75rem",
          color: "var(--md-on-surface-variant)",
          marginBottom: "12px",
        }}
      >
        Miles per month
      </p>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "3px",
          height: "80px",
        }}
      >
        {data.map((miles, i) => {
          const heightPct = (miles / max) * 100;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "2px",
                height: "100%",
              }}
              title={`${MONTH_LABELS[i]}: ${formatDistance(miles, distanceUnit)}`}
            >
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "flex-end",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    borderRadius: "3px 3px 0 0",
                    backgroundColor: "var(--md-primary)",
                    height: `${heightPct.toFixed(1)}%`,
                    minHeight: miles > 0 ? "3px" : "0",
                    transition: "height 0.3s ease",
                    opacity: miles > 0 ? 1 : 0.15,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: "3px", marginTop: "4px" }}>
        {MONTH_LABELS.map((label) => (
          <div
            key={label}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: "0.5625rem",
              color: "var(--md-outline)",
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedPurposes, setSelectedPurposes] = useState<Set<TripPurpose>>(
    new Set(ALL_PURPOSES),
  );
  const [startDate, setStartDate] = useState(
    toDateInputValue(startOfYear(currentYear)),
  );
  const [endDate, setEndDate] = useState(
    toDateInputValue(endOfYear(currentYear)),
  );
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<
    number | null | "all"
  >("all");
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const vehicles =
    useLiveQuery<Vehicle[]>(() => db.vehicles.toArray(), []) ?? EMPTY_VEHICLES;

  const vehicleMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const v of vehicles) {
      if (v.id !== undefined) m.set(v.id, vehicleLabel(v));
    }
    return m;
  }, [vehicles]);

  useEffect(() => {
    void getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (!useCustomRange) {
      queueMicrotask(() => {
        setStartDate(toDateInputValue(startOfYear(year)));
        setEndDate(toDateInputValue(endOfYear(year)));
      });
    }
  }, [year, useCustomRange]);

  const rates = settings?.customIrsRates ?? getRatesForYear(year);
  const employerCents = settings?.employerReimbursementCents ?? 0;

  const filterStart = new Date(startDate + "T00:00:00");
  const filterEnd = new Date(endDate + "T23:59:59");

  const trips =
    useLiveQuery(
      () =>
        db.trips
          .where("status")
          .equals("completed")
          .filter((t) => {
            const ts = t.startedAt.getTime();
            const vehicleMatch =
              selectedVehicleId === "all" ||
              (selectedVehicleId === null
                ? t.vehicleId === null
                : t.vehicleId === selectedVehicleId);
            return (
              ts >= filterStart.getTime() &&
              ts <= filterEnd.getTime() &&
              selectedPurposes.has(t.purpose) &&
              vehicleMatch
            );
          })
          .reverse()
          .sortBy("startedAt"),
      [
        filterStart.getTime(),
        filterEnd.getTime(),
        selectedPurposes,
        selectedVehicleId,
      ],
    ) ?? [];

  const totals = ALL_PURPOSES.map((p) => {
    const miles = trips
      .filter((t) => t.purpose === p)
      .reduce((s, t) => s + t.distanceMiles, 0);
    const deduction = computeDeduction(miles, p, rates);
    const reimbursed = p !== "personal" ? (miles * employerCents) / 100 : 0;
    return { purpose: p, miles, deduction, reimbursed };
  });

  const grandTotal = totals.reduce((s, r) => s + r.miles, 0);
  const grandDeduction = totals.reduce((s, r) => s + r.deduction, 0);
  const grandReimbursed = totals.reduce((s, r) => s + r.reimbursed, 0);

  const monthlyMiles = Array.from<number>({ length: 12 }).fill(0);
  for (const t of trips) {
    const m = t.startedAt.getMonth();
    monthlyMiles[m] = (monthlyMiles[m] ?? 0) + t.distanceMiles;
  }

  const togglePurpose = (p: TripPurpose) => {
    setSelectedPurposes((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const exportCsv = () => {
    const unit = settings?.distanceUnit ?? "miles";
    const distLabel = unit === "kilometers" ? "Km" : "Miles";
    const rows = trips.map((t) => {
      const miles = t.distanceMiles;
      const dist = unit === "kilometers" ? miles * 1.60934 : miles;
      const deduction = computeDeduction(miles, t.purpose, rates);
      const reimbursed =
        t.purpose !== "personal" ? (miles * employerCents) / 100 : 0;
      const pitStopSummary =
        t.pitStops.length > 0
          ? t.pitStops.map((ps) => ps.address ?? ps.label).join("; ")
          : "";
      const vehicleName =
        t.vehicleId !== null ? (vehicleMap.get(t.vehicleId) ?? "") : "";
      return {
        Date: t.startedAt.toLocaleDateString(),
        "Origin Address": t.originAddress ?? "",
        "Destination Address": t.destinationAddress ?? "",
        "Pit Stops": pitStopSummary,
        Purpose: TRIP_PURPOSE_LABELS[t.purpose],
        ...(vehicles.length > 0 ? { Vehicle: vehicleName } : {}),
        "Odometer Start":
          t.odometerStart !== null ? String(t.odometerStart) : "",
        "Odometer End": t.odometerEnd !== null ? String(t.odometerEnd) : "",
        [distLabel]: dist.toFixed(2),
        "IRS Deduction ($)": deduction.toFixed(2),
        ...(employerCents > 0
          ? { "Employer Reimbursed ($)": reimbursed.toFixed(2) }
          : {}),
        Notes: t.notes,
      };
    });
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `openroad_mileage_log_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const unit = settings?.distanceUnit ?? "miles";
    const distLabel = unit === "kilometers" ? "Km" : "Miles";
    const showVehicle = vehicles.length > 0;
    const showOdometer = trips.some(
      (t) => t.odometerStart !== null || t.odometerEnd !== null,
    );
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`OpenRoad Mileage Log — ${startDate} to ${endDate}`, 14, 16);
    doc.setFontSize(8);
    let y = 26;

    // Dynamic column layout depending on which optional columns are active.
    // Landscape = 297mm wide, usable 14→283 (~269mm).
    // Base cols: date(14) origin(38) dest(83) stops(128) purpose(158) dist(180) deduct(194) reimb(210) notes(226)
    // +vehicle adds ~18mm, +odometer adds ~28mm — we compress other cols when both active.
    type ColKey =
      | "date"
      | "origin"
      | "dest"
      | "stops"
      | "purpose"
      | "vehicle"
      | "odomStart"
      | "odomEnd"
      | "dist"
      | "deduct"
      | "reimb"
      | "notes";
    let COL: Record<ColKey, number>;

    if (showVehicle && showOdometer) {
      COL = {
        date: 14,
        origin: 34,
        dest: 72,
        stops: 110,
        purpose: 140,
        vehicle: 158,
        odomStart: 176,
        odomEnd: 196,
        dist: 216,
        deduct: 229,
        reimb: 244,
        notes: 259,
      };
    } else if (showVehicle) {
      COL = {
        date: 14,
        origin: 38,
        dest: 83,
        stops: 130,
        purpose: 160,
        vehicle: 178,
        odomStart: -1,
        odomEnd: -1,
        dist: 208,
        deduct: 222,
        reimb: 238,
        notes: 254,
      };
    } else if (showOdometer) {
      COL = {
        date: 14,
        origin: 38,
        dest: 83,
        stops: 128,
        purpose: 158,
        vehicle: -1,
        odomStart: 176,
        odomEnd: 198,
        dist: 220,
        deduct: 234,
        reimb: 250,
        notes: 266,
      };
    } else {
      COL = {
        date: 14,
        origin: 40,
        dest: 95,
        stops: 150,
        purpose: 185,
        vehicle: -1,
        odomStart: -1,
        odomEnd: -1,
        dist: 210,
        deduct: 225,
        reimb: 242,
        notes: 259,
      };
    }

    doc.setFont("helvetica", "bold");
    doc.text("Date", COL.date, y);
    doc.text("Origin", COL.origin, y);
    doc.text("Destination", COL.dest, y);
    doc.text("Stops", COL.stops, y);
    doc.text("Purpose", COL.purpose, y);
    if (showVehicle) doc.text("Vehicle", COL.vehicle, y);
    if (showOdometer) {
      doc.text("Odo Start", COL.odomStart, y);
      doc.text("Odo End", COL.odomEnd, y);
    }
    doc.text(distLabel, COL.dist, y);
    doc.text("Deduct $", COL.deduct, y);
    if (employerCents > 0) doc.text("Reimb $", COL.reimb, y);
    doc.text("Notes", COL.notes, y);
    doc.setFont("helvetica", "normal");

    y += 3;
    doc.line(14, y, 283, y);
    y += 5;

    for (const t of trips) {
      if (y > 188) {
        doc.addPage();
        y = 16;
      }
      const dist =
        unit === "kilometers" ? t.distanceMiles * 1.60934 : t.distanceMiles;
      const deduction = computeDeduction(t.distanceMiles, t.purpose, rates);
      const reimbursed =
        t.purpose !== "personal" ? (t.distanceMiles * employerCents) / 100 : 0;
      const pitStopSummary =
        t.pitStops.length > 0
          ? t.pitStops
              .map((ps) => ps.address ?? ps.label)
              .join("; ")
              .slice(0, 20)
          : "";
      const vehicleName = showVehicle
        ? t.vehicleId !== null
          ? (vehicleMap.get(t.vehicleId) ?? "").slice(0, 14)
          : ""
        : "";

      doc.text(t.startedAt.toLocaleDateString(), COL.date, y);
      doc.text((t.originAddress ?? "").slice(0, 18), COL.origin, y);
      doc.text((t.destinationAddress ?? "").slice(0, 18), COL.dest, y);
      doc.text(pitStopSummary, COL.stops, y);
      doc.text(TRIP_PURPOSE_LABELS[t.purpose], COL.purpose, y);
      if (showVehicle) doc.text(vehicleName, COL.vehicle, y);
      if (showOdometer) {
        doc.text(
          t.odometerStart !== null ? t.odometerStart.toLocaleString() : "",
          COL.odomStart,
          y,
        );
        doc.text(
          t.odometerEnd !== null ? t.odometerEnd.toLocaleString() : "",
          COL.odomEnd,
          y,
        );
      }
      doc.text(dist.toFixed(2), COL.dist, y);
      doc.text(deduction.toFixed(2), COL.deduct, y);
      if (employerCents > 0) doc.text(reimbursed.toFixed(2), COL.reimb, y);
      doc.text(t.notes.slice(0, 14), COL.notes, y);
      y += 6;
    }

    y += 3;
    doc.line(14, y, 283, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const totalDist = unit === "kilometers" ? grandTotal * 1.60934 : grandTotal;
    doc.text(
      `Total: ${totalDist.toFixed(2)} ${distLabel.toLowerCase()} — Est. Deduction: $${grandDeduction.toFixed(2)}${grandReimbursed > 0 ? ` — Employer Reimb: $${grandReimbursed.toFixed(2)}` : ""}`,
      14,
      y,
    );
    doc.save(`openroad_mileage_log_${startDate}_${endDate}.pdf`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <header style={{ paddingTop: "8px" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--md-on-surface)",
            margin: 0,
          }}
        >
          Reports
        </h1>
      </header>

      {/* Year / date range */}
      <div
        className="md-card"
        style={{ display: "flex", flexDirection: "column", gap: "14px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="md-field" style={{ flex: 1 }}>
            <label className="md-field-label" htmlFor="report-year">
              Year
            </label>
            <select
              id="report-year"
              value={year}
              disabled={useCustomRange}
              onChange={(e) => {
                setYear(parseInt(e.target.value, 10));
              }}
              className="md-select"
            >
              {[
                currentYear,
                currentYear - 1,
                currentYear - 2,
                currentYear - 3,
              ].map((y) => (
                <option key={y} value={y}>
                  {String(y)}
                </option>
              ))}
            </select>
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              fontSize: "0.8125rem",
              color: "var(--md-on-surface-variant)",
              flexShrink: 0,
              paddingTop: "20px",
            }}
          >
            <input
              type="checkbox"
              checked={useCustomRange}
              onChange={(e) => {
                setUseCustomRange(e.target.checked);
              }}
              className="md-switch"
            />
            Custom range
          </label>
        </div>

        {useCustomRange && (
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div className="md-field" style={{ flex: 1 }}>
              <label className="md-field-label">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                }}
                className="md-input"
              />
            </div>
            <span style={{ color: "var(--md-outline)", paddingTop: "20px" }}>
              →
            </span>
            <div className="md-field" style={{ flex: 1 }}>
              <label className="md-field-label">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                }}
                className="md-input"
              />
            </div>
          </div>
        )}
      </div>

      {/* Purpose filter chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {ALL_PURPOSES.map((p) => (
          <button
            key={p}
            onClick={() => {
              togglePurpose(p);
            }}
            className={`md-chip${selectedPurposes.has(p) ? " md-chip-selected" : ""}`}
          >
            {TRIP_PURPOSE_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Vehicle filter chips — only shown when vehicles exist */}
      {vehicles.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {(
            [
              { id: "all" as const, label: "All vehicles" },
              { id: null, label: "Unassigned" },
              ...vehicles
                .filter((v) => v.id !== undefined)
                .map((v) => ({ id: v.id!, label: vehicleLabel(v) })),
            ] as { id: number | null | "all"; label: string }[]
          ).map(({ id, label }) => (
            <button
              key={id === "all" ? "all" : id === null ? "none" : String(id)}
              onClick={() => {
                setSelectedVehicleId(id);
              }}
              className={`md-chip${selectedVehicleId === id ? " md-chip-selected" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Monthly chart */}
      {trips.length > 0 && (
        <div className="md-card">
          <MonthlyChart
            data={monthlyMiles}
            distanceUnit={settings?.distanceUnit ?? "miles"}
          />
        </div>
      )}

      {/* Summary */}
      <div
        className="md-card"
        style={{ display: "flex", flexDirection: "column", gap: "0" }}
      >
        {totals
          .filter((r) => r.miles > 0)
          .map((r, idx, arr) => (
            <div
              key={r.purpose}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderBottom:
                  idx < arr.length - 1
                    ? "1px solid var(--md-outline-variant)"
                    : "none",
                gap: "12px",
              }}
            >
              <span
                style={{
                  fontSize: "0.9375rem",
                  color: "var(--md-on-surface)",
                  flexShrink: 0,
                }}
              >
                {TRIP_PURPOSE_LABELS[r.purpose]}
              </span>
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    fontSize: "0.9375rem",
                    fontWeight: 600,
                    color: "var(--md-on-surface)",
                  }}
                >
                  {formatDistance(r.miles, settings?.distanceUnit ?? "miles")}
                </span>
                {r.deduction > 0 && (
                  <span
                    style={{
                      color: "var(--md-success)",
                      marginLeft: "10px",
                      fontSize: "0.9375rem",
                    }}
                  >
                    {formatCurrency(r.deduction)}
                  </span>
                )}
                {employerCents > 0 && r.reimbursed > 0 && (
                  <span
                    style={{
                      color: "#ffb870",
                      marginLeft: "8px",
                      fontSize: "0.8125rem",
                    }}
                  >
                    +{formatCurrency(r.reimbursed)} reimb.
                  </span>
                )}
              </div>
            </div>
          ))}

        {/* Grand total */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 0 0",
            borderTop: "2px solid var(--md-outline-variant)",
            marginTop: "4px",
            gap: "12px",
          }}
        >
          <span
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--md-on-surface)",
            }}
          >
            Total
          </span>
          <div style={{ textAlign: "right" }}>
            <span
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--md-on-surface)",
              }}
            >
              {formatDistance(grandTotal, settings?.distanceUnit ?? "miles")}
            </span>
            <span
              style={{
                color: "var(--md-success)",
                marginLeft: "10px",
                fontSize: "1rem",
                fontWeight: 700,
              }}
            >
              {formatCurrency(grandDeduction)}
            </span>
            {employerCents > 0 && grandReimbursed > 0 && (
              <span
                style={{
                  color: "#ffb870",
                  marginLeft: "8px",
                  fontSize: "0.8125rem",
                }}
              >
                +{formatCurrency(grandReimbursed)} reimb.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Export buttons */}
      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={exportCsv}
          disabled={trips.length === 0}
          className="md-btn-tonal"
          style={{ flex: 1 }}
        >
          Export CSV
        </button>
        <button
          onClick={exportPdf}
          disabled={trips.length === 0}
          className="md-btn-filled"
          style={{ flex: 1 }}
        >
          Export PDF
        </button>
      </div>

      {trips.length === 0 && (
        <p
          style={{
            textAlign: "center",
            color: "var(--md-on-surface-variant)",
            fontSize: "0.875rem",
            padding: "16px 0",
          }}
        >
          No trips found for the selected filters.
        </p>
      )}
    </div>
  );
}
