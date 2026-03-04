import type { Vehicle } from "../types/index.js";

export function vehicleLabel(v: Vehicle): string {
  const parts = [v.year ? String(v.year) : null, v.make, v.model].filter(
    Boolean,
  );
  return parts.length > 0 ? `${v.name} — ${parts.join(" ")}` : v.name;
}
