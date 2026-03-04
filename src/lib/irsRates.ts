import type { IrsRates, TripPurpose } from "../types/index.js";

// ─── IRS Standard Mileage Rates ───────────────────────────────────────────────
// Source: IRS Rev. Proc. / Notice for each year
// Rates are in cents per mile

export const IRS_RATES: [IrsRates, ...IrsRates[]] = [
  { year: 2025, business: 70, medical: 21, charity: 14 },
  { year: 2024, business: 67, medical: 21, charity: 14 },
  { year: 2023, business: 65.5, medical: 22, charity: 14 },
  { year: 2022, business: 58.5, medical: 18, charity: 14 },
];

/**
 * Returns the IRS rates for a given year.
 * Falls back to the most recent known rates if the year is not found.
 */
export function getRatesForYear(year: number): IrsRates {
  const found = IRS_RATES.find((r) => r.year === year);
  if (found) return found;
  // IRS_RATES is typed as non-empty tuple; first element is always defined
  return IRS_RATES[0];
}

/**
 * Computes the tax deduction value for a given mileage and purpose.
 * Returns a dollar amount (cents / 100).
 */
export function computeDeduction(
  miles: number,
  purpose: TripPurpose,
  rates: IrsRates,
): number {
  if (purpose === "personal") return 0;
  const centsPerMile = rates[purpose];
  return (miles * centsPerMile) / 100;
}

/**
 * Formats a dollar amount to a USD string.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
