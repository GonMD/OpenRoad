import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/index.js";
import type { TripTemplate, TripPurpose } from "../types/index.js";
import { TRIP_PURPOSE_LABELS } from "../types/index.js";

interface ManageTemplatesModalProps {
  onClose: () => void;
}

const PURPOSE_ICONS: Record<TripPurpose, string> = {
  business: "work",
  medical: "local_hospital",
  charity: "volunteer_activism",
  personal: "home",
};

// ─── Blank form state ─────────────────────────────────────────────────────────

interface FormState {
  name: string;
  purpose: TripPurpose;
  notes: string;
}

const BLANK_FORM: FormState = { name: "", purpose: "business", notes: "" };

// ─── Template Row ─────────────────────────────────────────────────────────────

function TemplateRow({
  template,
  onEdit,
  onDelete,
}: {
  template: TripTemplate;
  onEdit: (t: TripTemplate) => void;
  onDelete: (t: TripTemplate) => void;
}) {
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
        {PURPOSE_ICONS[template.purpose]}
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
          {template.name}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "0.75rem",
            color: "var(--md-on-surface-variant)",
          }}
        >
          {TRIP_PURPOSE_LABELS[template.purpose]}
          {template.notes ? ` · ${template.notes}` : ""}
        </p>
      </div>
      <button
        onClick={() => {
          onEdit(template);
        }}
        aria-label={`Edit template ${template.name}`}
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
          onDelete(template);
        }}
        aria-label={`Delete template ${template.name}`}
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

export function ManageTemplatesModal({ onClose }: ManageTemplatesModalProps) {
  const templates =
    useLiveQuery<TripTemplate[]>(
      () => db.templates.orderBy("createdAt").toArray(),
      [],
    ) ?? [];

  // null = closed, undefined = new, TripTemplate = editing existing
  const [editing, setEditing] = useState<TripTemplate | undefined | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const openNew = () => {
    setForm(BLANK_FORM);
    setNameError(null);
    setEditing(undefined);
  };

  const openEdit = (t: TripTemplate) => {
    setForm({ name: t.name, purpose: t.purpose, notes: t.notes });
    setNameError(null);
    setEditing(t);
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
    setSaving(true);
    const now = new Date();
    if (editing === undefined) {
      // New template
      await db.templates.add({
        name: trimmedName,
        purpose: form.purpose,
        notes: form.notes.trim(),
        createdAt: now,
        updatedAt: now,
      } as TripTemplate);
    } else if (editing?.id !== undefined) {
      // Edit existing
      await db.templates.update(editing.id, {
        name: trimmedName,
        purpose: form.purpose,
        notes: form.notes.trim(),
        updatedAt: now,
      });
    }
    setSaving(false);
    closeForm();
  };

  const handleDelete = async (t: TripTemplate) => {
    if (t.id === undefined) return;
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    await db.templates.delete(t.id);
  };

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
            {editing !== null
              ? editing === undefined
                ? "New Template"
                : "Edit Template"
              : "Trip Templates"}
          </h2>
          <button
            onClick={editing !== null ? closeForm : onClose}
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
              {editing !== null ? "arrow_back" : "close"}
            </span>
          </button>
        </div>

        {/* ── Form view (new / edit) ── */}
        {editing !== null ? (
          <>
            {/* Name */}
            <div className="md-field" style={{ marginBottom: "16px" }}>
              <label className="md-field-label" htmlFor="tmpl-name">
                Name
              </label>
              <input
                id="tmpl-name"
                type="text"
                maxLength={60}
                placeholder="e.g. Office commute"
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

            {/* Purpose */}
            <div style={{ marginBottom: "16px" }}>
              <p className="md-field-label" style={{ marginBottom: "10px" }}>
                Purpose
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                }}
              >
                {(["business", "medical", "charity", "personal"] as const).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setForm((f) => ({ ...f, purpose: p }));
                      }}
                      className={
                        form.purpose === p ? "md-btn-filled" : "md-btn-outlined"
                      }
                      style={{
                        flexDirection: "column",
                        height: "64px",
                        gap: "4px",
                        fontSize: "0.8125rem",
                      }}
                    >
                      <span className="ms icon-20" aria-hidden="true">
                        {PURPOSE_ICONS[p]}
                      </span>
                      {TRIP_PURPOSE_LABELS[p]}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="md-field" style={{ marginBottom: "20px" }}>
              <label className="md-field-label" htmlFor="tmpl-notes">
                Default Notes (optional)
              </label>
              <textarea
                id="tmpl-notes"
                rows={2}
                maxLength={200}
                placeholder="Pre-filled in the trip notes field"
                value={form.notes}
                onChange={(e) => {
                  setForm((f) => ({ ...f, notes: e.target.value }));
                }}
                className="md-textarea"
              />
              <p
                style={{
                  textAlign: "right",
                  fontSize: "0.75rem",
                  color: "var(--md-outline)",
                  margin: "4px 0 0",
                }}
              >
                {form.notes.length}/200
              </p>
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
                  : editing === undefined
                    ? "Create Template"
                    : "Save Changes"}
              </button>
            </div>
          </>
        ) : (
          /* ── List view ── */
          <>
            {templates.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 16px",
                  color: "var(--md-on-surface-variant)",
                }}
              >
                <p style={{ marginBottom: "8px" }}>
                  <span className="ms icon-32" aria-hidden="true">
                    bookmark_add
                  </span>
                </p>
                <p
                  style={{
                    fontWeight: 600,
                    color: "var(--md-on-surface)",
                    marginBottom: "4px",
                  }}
                >
                  No templates yet
                </p>
                <p style={{ fontSize: "0.875rem" }}>
                  Create a template to quickly start recurring trips.
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
                {templates.map((t) => (
                  <TemplateRow
                    key={t.id}
                    template={t}
                    onEdit={openEdit}
                    onDelete={(tmpl) => void handleDelete(tmpl)}
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
              New Template
            </button>
          </>
        )}
      </div>
    </div>
  );
}
