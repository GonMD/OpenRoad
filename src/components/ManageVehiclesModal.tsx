import { useState, useRef, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/index.js";
import type { Vehicle, VehicleType } from "../types/index.js";
import { VEHICLE_TYPE_LABELS, VEHICLE_TYPE_ICONS } from "../types/index.js";

const VEHICLE_TYPES: VehicleType[] = [
  "car",
  "suv",
  "truck",
  "van",
  "box_van",
  "motorcycle",
  "electric",
  "other",
];

interface ManageVehiclesModalProps {
  onClose: () => void;
}

// ─── Image compression (same spec as OdometerCapture) ─────────────────────────

async function compressImageToBase64(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxW = 1200;
      const scale = img.width > maxW ? maxW / img.width : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    img.src = objectUrl;
  });
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  year: string;
  make: string;
  model: string;
  vin: string;
  vehicleType: VehicleType;
  photo: string | null;
}

const BLANK_FORM: FormState = {
  name: "",
  year: "",
  make: "",
  model: "",
  vin: "",
  vehicleType: "car",
  photo: null,
};

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
      {/* Photo or icon */}
      {vehicle.photo ? (
        <img
          src={vehicle.photo}
          alt={vehicle.name}
          style={{
            width: "44px",
            height: "44px",
            objectFit: "cover",
            borderRadius: "8px",
            flexShrink: 0,
          }}
        />
      ) : (
        <span
          className="ms icon-24"
          aria-hidden="true"
          style={{ color: "var(--md-primary)", flexShrink: 0 }}
        >
          {VEHICLE_TYPE_ICONS[vehicle.vehicleType]}
        </span>
      )}

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
            {vehicle.vin ? ` · ${vehicle.vin}` : ""}
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
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const compressed = await compressImageToBase64(file);
      setForm((f) => ({ ...f, photo: compressed }));
      if (photoInputRef.current) photoInputRef.current.value = "";
    },
    [],
  );

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
      vin: v.vin,
      vehicleType: v.vehicleType,
      photo: v.photo,
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
    const payload = {
      name: trimmedName,
      year: yearVal,
      make: form.make.trim(),
      model: form.model.trim(),
      vin: form.vin.trim(),
      vehicleType: form.vehicleType,
      photo: form.photo,
    };
    if (editing === undefined) {
      await db.vehicles.add({
        ...payload,
        createdAt: now,
        updatedAt: now,
      } as Vehicle);
    } else if (editing?.id !== undefined) {
      await db.vehicles.update(editing.id, { ...payload, updatedAt: now });
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
            {/* Vehicle photo */}
            <div style={{ marginBottom: "16px" }}>
              {form.photo ? (
                <div style={{ position: "relative" }}>
                  <img
                    src={form.photo}
                    alt="Vehicle"
                    style={{
                      width: "100%",
                      height: "180px",
                      objectFit: "cover",
                      borderRadius: "12px",
                      border: "1.5px solid var(--md-outline-variant)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      display: "flex",
                      gap: "6px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        photoInputRef.current?.click();
                      }}
                      aria-label="Retake photo"
                      style={{
                        background: "rgba(0,0,0,0.55)",
                        border: "none",
                        borderRadius: "50%",
                        width: "36px",
                        height: "36px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#fff",
                      }}
                    >
                      <span className="ms icon-20" aria-hidden="true">
                        photo_camera
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, photo: null }));
                      }}
                      aria-label="Remove photo"
                      style={{
                        background: "rgba(0,0,0,0.55)",
                        border: "none",
                        borderRadius: "50%",
                        width: "36px",
                        height: "36px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#fff",
                      }}
                    >
                      <span className="ms icon-20" aria-hidden="true">
                        close
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    photoInputRef.current?.click();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "none",
                    border: "1.5px dashed var(--md-outline-variant)",
                    borderRadius: "12px",
                    padding: "16px",
                    cursor: "pointer",
                    color: "var(--md-on-surface-variant)",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    width: "100%",
                    justifyContent: "center",
                  }}
                >
                  <span className="ms icon-20" aria-hidden="true">
                    photo_camera
                  </span>
                  Add vehicle photo (optional)
                </button>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => {
                  void handlePhotoChange(e);
                }}
                aria-hidden="true"
              />
            </div>

            {/* Vehicle type picker */}
            <div style={{ marginBottom: "16px" }}>
              <p className="md-field-label" style={{ marginBottom: "8px" }}>
                Type
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "8px",
                }}
              >
                {VEHICLE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, vehicleType: type }));
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                      padding: "10px 4px",
                      borderRadius: "10px",
                      border: `1.5px solid ${form.vehicleType === type ? "var(--md-primary)" : "var(--md-outline-variant)"}`,
                      backgroundColor:
                        form.vehicleType === type
                          ? "var(--md-primary-container)"
                          : "transparent",
                      color:
                        form.vehicleType === type
                          ? "var(--md-on-primary-container)"
                          : "var(--md-on-surface-variant)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      fontSize: "0.6875rem",
                      fontWeight: form.vehicleType === type ? 600 : 400,
                    }}
                  >
                    <span className="ms icon-22" aria-hidden="true">
                      {VEHICLE_TYPE_ICONS[type]}
                    </span>
                    {VEHICLE_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="md-field" style={{ marginBottom: "12px" }}>
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

            {/* Year / Make / Model row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr 1fr",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              <div className="md-field">
                <label className="md-field-label" htmlFor="veh-year">
                  Year
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
              <div className="md-field">
                <label className="md-field-label" htmlFor="veh-make">
                  Make
                </label>
                <input
                  id="veh-make"
                  type="text"
                  maxLength={60}
                  placeholder="Toyota"
                  value={form.make}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, make: e.target.value }));
                  }}
                  className="md-input"
                />
              </div>
              <div className="md-field">
                <label className="md-field-label" htmlFor="veh-model">
                  Model
                </label>
                <input
                  id="veh-model"
                  type="text"
                  maxLength={60}
                  placeholder="Camry"
                  value={form.model}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, model: e.target.value }));
                  }}
                  className="md-input"
                />
              </div>
            </div>

            {/* VIN */}
            <div className="md-field" style={{ marginBottom: "20px" }}>
              <label className="md-field-label" htmlFor="veh-vin">
                VIN (optional)
              </label>
              <input
                id="veh-vin"
                type="text"
                maxLength={17}
                placeholder="17-character VIN"
                value={form.vin}
                onChange={(e) => {
                  setForm((f) => ({ ...f, vin: e.target.value.toUpperCase() }));
                }}
                className="md-input"
                style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}
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
