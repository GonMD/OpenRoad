import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/index.js";
import {
  getRatesForYear,
  computeDeduction,
  formatCurrency,
} from "../lib/irsRates.js";
import { formatMiles } from "../lib/distance.js";
import { TRIP_PURPOSE_LABELS } from "../types/index.js";
import type { TripPurpose } from "../types/index.js";
import Papa from "papaparse";
import { jsPDF } from "jspdf";

const ALL_PURPOSES: TripPurpose[] = [
  "business",
  "medical",
  "charity",
  "personal",
];

export function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedPurposes, setSelectedPurposes] = useState<Set<TripPurpose>>(
    new Set(ALL_PURPOSES),
  );

  const rates = getRatesForYear(year);

  const trips =
    useLiveQuery(
      () =>
        db.trips
          .where("status")
          .equals("completed")
          .filter((t) => {
            const tripYear = t.startedAt.getFullYear();
            return tripYear === year && selectedPurposes.has(t.purpose);
          })
          .reverse()
          .sortBy("startedAt"),
      [year, selectedPurposes],
    ) ?? [];

  const totals = ALL_PURPOSES.map((p) => {
    const miles = trips
      .filter((t) => t.purpose === p)
      .reduce((s, t) => s + t.distanceMiles, 0);
    return { purpose: p, miles, deduction: computeDeduction(miles, p, rates) };
  });

  const grandTotal = totals.reduce((s, r) => s + r.miles, 0);
  const grandDeduction = totals.reduce((s, r) => s + r.deduction, 0);

  const togglePurpose = (p: TripPurpose) => {
    setSelectedPurposes((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const exportCsv = () => {
    const rows = trips.map((t) => ({
      Date: t.startedAt.toLocaleDateString(),
      Purpose: TRIP_PURPOSE_LABELS[t.purpose],
      Miles: t.distanceMiles.toFixed(2),
      Deduction: computeDeduction(t.distanceMiles, t.purpose, rates).toFixed(2),
      Notes: t.notes,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mileage_${String(year)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Mileage Report — ${String(year)}`, 14, 20);
    doc.setFontSize(10);

    let y = 32;
    doc.text("Date", 14, y);
    doc.text("Purpose", 50, y);
    doc.text("Miles", 90, y);
    doc.text("Deduction", 120, y);
    doc.text("Notes", 155, y);
    y += 4;
    doc.line(14, y, 196, y);
    y += 6;

    for (const t of trips) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(t.startedAt.toLocaleDateString(), 14, y);
      doc.text(TRIP_PURPOSE_LABELS[t.purpose], 50, y);
      doc.text(t.distanceMiles.toFixed(2), 90, y);
      doc.text(
        computeDeduction(t.distanceMiles, t.purpose, rates).toFixed(2),
        120,
        y,
      );
      doc.text(t.notes.slice(0, 30), 155, y);
      y += 7;
    }

    y += 4;
    doc.line(14, y, 196, y);
    y += 6;
    doc.setFontSize(11);
    doc.text(
      `Total: ${grandTotal.toFixed(2)} mi — Est. Deduction: $${grandDeduction.toFixed(2)}`,
      14,
      y,
    );

    doc.save(`mileage_${String(year)}.pdf`);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-100">Reports</h1>

      {/* Year selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-400" htmlFor="report-year">
          Year
        </label>
        <select
          id="report-year"
          value={year}
          onChange={(e) => {
            setYear(parseInt(e.target.value, 10));
          }}
          className="bg-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map(
            (y) => (
              <option key={y} value={y}>
                {String(y)}
              </option>
            ),
          )}
        </select>
      </div>

      {/* Purpose filter */}
      <div className="flex flex-wrap gap-2">
        {ALL_PURPOSES.map((p) => (
          <button
            key={p}
            onClick={() => {
              togglePurpose(p);
            }}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              selectedPurposes.has(p)
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-transparent border-slate-600 text-slate-400"
            }`}
          >
            {TRIP_PURPOSE_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-slate-800 rounded-xl p-4 space-y-2">
        {totals
          .filter((r) => r.miles > 0)
          .map((r) => (
            <div key={r.purpose} className="flex justify-between text-sm">
              <span className="text-slate-300">
                {TRIP_PURPOSE_LABELS[r.purpose]}
              </span>
              <span className="text-slate-100 font-medium">
                {formatMiles(r.miles)}{" "}
                {r.deduction > 0 && (
                  <span className="text-green-400 ml-2">
                    {formatCurrency(r.deduction)}
                  </span>
                )}
              </span>
            </div>
          ))}
        <div className="border-t border-slate-700 pt-2 flex justify-between text-sm font-semibold">
          <span className="text-slate-100">Total</span>
          <span className="text-slate-100">
            {formatMiles(grandTotal)}{" "}
            <span className="text-green-400 ml-2">
              {formatCurrency(grandDeduction)}
            </span>
          </span>
        </div>
      </div>

      {/* Export */}
      <div className="flex gap-3">
        <button
          onClick={exportCsv}
          disabled={trips.length === 0}
          className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          Export CSV
        </button>
        <button
          onClick={exportPdf}
          disabled={trips.length === 0}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          Export PDF
        </button>
      </div>

      {trips.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-4">
          No trips found for the selected filters.
        </p>
      )}
    </div>
  );
}
