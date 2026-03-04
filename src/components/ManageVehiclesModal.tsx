import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/index.js";
import type { Vehicle } from "../types/index.js";

interface ManageVehiclesModalProps {
  onClose: () => void;
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  year: string;
  make: string;
  model: string;
}

const BLANK_FORM: FormState = { name: "", year: "", make: "", model: "" };

// ─── Vehicle Row ──────────────────────────────────────────────────────────────

function VehicleRow({
  vehicle,
  onEdit,
  onDelete,
}: {
  vehicle: Vehicle;
  onEdit: (v: Vehicle) => void;
  onDelete: (v: Vehicle) => void;
}) {
  const parts = [
    vehicle.year ? String(vehicle.year) : null,
    vehicle.make,
    vehicle.model,
  ].filter(Boolean);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 12px",
        borderRadius: "12px",
        backgroundColor: "var(--md-surface-container-high)",
      }}
    >
      <span
        className="ms icon-20"
        aria-hidden="true"
        style={{ color: "var(--md-primary)", flexShrink: 0 }}
      >
        directions_car
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontWeight: 600,
            fontSize: "0.9375rem",
            color: "var(--md-on-surface)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {vehicle.name}
        </p>
        {parts.length > 0 && (
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              color: "var(--md-on-surface-variant)",
            }}
          >
            {parts.join(" ")}
          </p>
        )}
      </div>
      <button
        onClick={() => {
          onEdit(vehicle);
        }}
        aria-label={`Edit vehicle ${vehicle.name}`}
        style={{
          background: "none",
          border: "none",
          color: "var(--md-on-surface-variant)",
          cursor: "pointer",
          padding: "4px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="ms icon-20" aria-hidden="true">
          edit
        </span>
      </button>
      <button
        onClick={() => {
          onDelete(vehicle);
        }}
        aria-label={`Delete vehicle ${vehicle.name}`}
        style={{
          background: "none",
          border: "none",
          color: "var(--md-on-surface-variant)",
          cursor: "pointer",
          padding: "4px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color =
            "var(--md-error)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color =
            "var(--md-on-surface-variant)";
        }}
      >
        <span className="ms icon-20" aria-hidden="true">
          delete
        </span>
      </button>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function ManageVehiclesModal({ onClose }: ManageVehiclesModalProps) {
  const vehicles =
    useLiveQuery<Vehicle[]>(
      () => db.vehicles.orderBy("createdAt").toArray(),
      [],
    ) ?? [];

  // null = list view, undefined = new, Vehicle = editing existing
  const [editing, setEditing] = useState<Vehicle | undefined | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const openNew = () => {
    setForm(BLANK_FORM);
    setNameError(null);
    setEditing(undefined);
  };

  const openEdit = (v: Vehicle) => {
    setForm({
      name: v.name,
      year: v.year !== null ? String(v.year) : "",
      make: v.make,
      model: v.model,
    });
    setNameError(null);
    setEditing(v);
  };

  const closeForm = () => {
    setEditing(null);
  };

  const handleSave = async () => {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setNameError("Name is required.");
      return;
    }
    const yearVal = form.year.trim() ? parseInt(form.year.trim(), 10) : null;
    setSaving(true);
    const now = new Date();
    if (editing === undefined) {
      await db.vehicles.add({
        name: trimmedName,
        year: yearVal,
        make: form.make.trim(),
        model: form.model.trim(),
        createdAt: now,
        updatedAt: now,
      } as Vehicle);
    } else if (editing?.id !== undefined) {
      await db.vehicles.update(editing.id, {
        name: trimmedName,
        year: yearVal,
        make: form.make.trim(),
        model: form.model.trim(),
        updatedAt: now,
      });
    }
    setSaving(false);
    closeForm();
  };

  const handleDelete = async (v: Vehicle) => {
    if (v.id === undefined) return;
    if (
      !window.confirm(
        `Delete vehicle "${v.name}"? Trips logged with this vehicle will not be affected.`,
      )
    )
      return;
    await db.vehicles.delete(v.id);
  };

  const isFormView = editing !== null;
  const isNewForm = editing === undefined;

  return (
    <div className="md-bottom-sheet" onClick={onClose}>
      <div className="md-bottom-sheet-scrim" />
      <div
        className="md-bottom-sheet-surface"
        style={{ maxWidth: "600px", width: "100%", margin: "0 auto" }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="md-bottom-sheet-handle" />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              color: "var(--md-on-surface)",
              margin: 0,
            }}
          >
            {isFormView
              ? isNewForm
                ? "Add Vehicle"
                : "Edit Vehicle"
              : "Vehicles"}
          </h2>
          <button
            onClick={isFormView ? closeForm : onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              color: "var(--md-on-surface-variant)",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span className="ms icon-24" aria-hidden="true">
              {isFormView ? "arrow_back" : "close"}
            </span>
          </button>
        </div>

        {/* ── Form view ── */}
        {isFormView ? (
          <>
            {/* Name */}
            <div className="md-field" style={{ marginBottom: "14px" }}>
              <label className="md-field-label" htmlFor="veh-name">
                Nickname / Label
              </label>
              <input
                id="veh-name"
                type="text"
                maxLength={60}
                placeholder="e.g. My Car, Work Truck"
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  setNameError(null);
                }}
                className="md-input"
                autoFocus
              />
              {nameError && (
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--md-error)",
                    margin: "4px 0 0",
                  }}
                >
                  {nameError}
                </p>
              )}
            </div>

            {/* Year */}
            <div className="md-field" style={{ marginBottom: "14px" }}>
              <label className="md-field-label" htmlFor="veh-year">
                Year (optional)
              </label>
              <input
                id="veh-year"
                type="number"
                min="1900"
                max={new Date().getFullYear() + 2}
                placeholder={String(new Date().getFullYear())}
                value={form.year}
                onChange={(e) => {
                  setForm((f) => ({ ...f, year: e.target.value }));
                }}
                className="md-input"
              />
            </div>

            {/* Make */}
            <div className="md-field" style={{ marginBottom: "14px" }}>
              <label className="md-field-label" htmlFor="veh-make">
                Make (optional)
              </label>
              <input
                id="veh-make"
                type="text"
                maxLength={60}
                placeholder="e.g. Toyota, Ford"
                value={form.make}
                onChange={(e) => {
                  setForm((f) => ({ ...f, make: e.target.value }));
                }}
                className="md-input"
              />
            </div>

            {/* Model */}
            <div className="md-field" style={{ marginBottom: "20px" }}>
              <label className="md-field-label" htmlFor="veh-model">
                Model (optional)
              </label>
              <input
                id="veh-model"
                type="text"
                maxLength={60}
                placeholder="e.g. Camry, F-150"
                value={form.model}
                onChange={(e) => {
                  setForm((f) => ({ ...f, model: e.target.value }));
                }}
                className="md-input"
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={closeForm}
                className="md-btn-outlined"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="md-btn-filled"
                style={{ flex: 2, opacity: saving ? 0.6 : 1 }}
              >
                {saving
                  ? "Saving…"
                  : isNewForm
                    ? "Add Vehicle"
                    : "Save Changes"}
              </button>
            </div>
          </>
        ) : (
          /* ── List view ── */
          <>
            {vehicles.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 16px",
                  color: "var(--md-on-surface-variant)",
                }}
              >
                <p style={{ marginBottom: "8px" }}>
                  <span className="ms icon-32" aria-hidden="true">
                    directions_car
                  </span>
                </p>
                <p
                  style={{
                    fontWeight: 600,
                    color: "var(--md-on-surface)",
                    marginBottom: "4px",
                  }}
                >
                  No vehicles yet
                </p>
                <p style={{ fontSize: "0.875rem" }}>
                  Add a vehicle to tag trips and filter reports by vehicle.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginBottom: "20px",
                }}
              >
                {vehicles.map((v) => (
                  <VehicleRow
                    key={v.id}
                    vehicle={v}
                    onEdit={openEdit}
                    onDelete={(veh) => void handleDelete(veh)}
                  />
                ))}
              </div>
            )}

            <button
              onClick={openNew}
              className="md-btn-filled"
              style={{ width: "100%", gap: "8px" }}
            >
              <span className="ms icon-20" aria-hidden="true">
                add
              </span>
              Add Vehicle
            </button>
          </>
        )}
      </div>
    </div>
  );
}
