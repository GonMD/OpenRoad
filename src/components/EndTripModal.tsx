import { useState, useRef, useCallback } from "react";
import type { TripPurpose } from "../types/index.js";
import { TRIP_PURPOSE_LABELS } from "../types/index.js";
import { formatMiles } from "../lib/distance.js";
import { OdometerCapture } from "./OdometerCapture.js";

// ─── Web Speech API ambient types ────────────────────────────────────────────

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionInstance)
  | null {
  const w = window as unknown as Record<string, unknown>;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (typeof Ctor === "function")
    return Ctor as new () => SpeechRecognitionInstance;
  return null;
}

// ─── Common presets ───────────────────────────────────────────────────────────

const COMMON_NOTES = [
  "Client visit",
  "Office / headquarters",
  "Sales call",
  "Conference / training",
  "Bank / financial errand",
  "Supplier / vendor visit",
  "Job site inspection",
  "Medical appointment",
  "Charitable service",
] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface EndTripModalProps {
  miles: number;
  purpose: TripPurpose;
  onConfirm: (
    notes: string,
    odometerEnd: number | null,
    odometerEndPhoto: string | null,
  ) => void;
  onDiscard: () => void;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EndTripModal({
  miles,
  purpose,
  onConfirm,
  onDiscard,
  onCancel,
}: EndTripModalProps) {
  const [notes, setNotes] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [odometerReading, setOdometerReading] = useState("");
  const [odometerPhoto, setOdometerPhoto] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const speechSupported = getSpeechRecognitionCtor() !== null;

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    setSpeechError(null);
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = navigator.language || "en-US";
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const parts: string[] = [];
      for (const result of Array.from(e.results))
        parts.push(result[0].transcript);
      const transcript = parts.join(" ").trim();
      if (transcript)
        setNotes((prev) => (prev ? prev + " " + transcript : transcript));
    };
    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== "no-speech") setSpeechError(e.error);
      setIsListening(false);
    };
    rec.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const handlePreset = (value: string) => {
    if (!value) return;
    setNotes(value);
  };

  return (
    <div className="md-bottom-sheet" onClick={onCancel}>
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
            marginBottom: "16px",
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
            End Trip
          </h2>
          <button
            onClick={onCancel}
            aria-label="Cancel"
            style={{
              background: "none",
              border: "none",
              color: "var(--md-on-surface-variant)",
              cursor: "pointer",
              fontSize: "1.125rem",
              lineHeight: 1,
              padding: "4px",
              borderRadius: "50%",
            }}
          >
            ✕
          </button>
        </div>

        {/* Trip summary chips */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          <span
            className="md-chip md-chip-selected"
            style={{ pointerEvents: "none" }}
          >
            {formatMiles(miles)}
          </span>
          <span
            className="md-chip md-chip-selected"
            style={{ pointerEvents: "none" }}
          >
            {TRIP_PURPOSE_LABELS[purpose]}
          </span>
        </div>

        {/* Quick note preset */}
        <div className="md-field" style={{ marginBottom: "16px" }}>
          <label className="md-field-label" htmlFor="notes-preset">
            Quick note
          </label>
          <select
            id="notes-preset"
            defaultValue=""
            onChange={(e) => {
              handlePreset(e.target.value);
            }}
            className="md-select"
          >
            <option value="" disabled>
              Select a common note…
            </option>
            {COMMON_NOTES.map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
        </div>

        {/* Notes textarea + mic */}
        <div className="md-field" style={{ marginBottom: "8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <label className="md-field-label" htmlFor="trip-notes">
              Notes (optional)
            </label>
            {speechSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                aria-label={isListening ? "Stop dictation" : "Dictate notes"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: "100px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: isListening
                    ? "var(--md-error-container)"
                    : "var(--md-secondary-container)",
                  color: isListening
                    ? "var(--md-on-error-container)"
                    : "var(--md-on-secondary-container)",
                  animation: isListening
                    ? "md-pulse 1.5s ease-in-out infinite"
                    : "none",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  style={{ width: "14px", height: "14px" }}
                  aria-hidden="true"
                >
                  <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4Z" />
                  <path d="M6.25 10a.75.75 0 0 1 .75.75 5 5 0 0 0 10 0 .75.75 0 0 1 1.5 0 6.5 6.5 0 0 1-5.75 6.455V19h2a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1 0-1.5h2v-1.795A6.5 6.5 0 0 1 5.5 10.75.75.75 0 0 1 6.25 10Z" />
                </svg>
                {isListening ? "Listening…" : "Dictate"}
              </button>
            )}
          </div>
          <textarea
            id="trip-notes"
            rows={3}
            maxLength={500}
            placeholder={
              isListening ? "Listening…" : "Type or dictate your notes…"
            }
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
            }}
            className="md-textarea"
          />
          {speechError && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--md-error)",
                margin: "4px 0 0",
              }}
            >
              Microphone error: {speechError}
            </p>
          )}
          <p
            style={{
              textAlign: "right",
              fontSize: "0.75rem",
              color: "var(--md-outline)",
              margin: "4px 0 0",
            }}
          >
            {notes.length}/500
          </p>
        </div>

        {/* Odometer end reading */}
        <div style={{ marginBottom: "8px" }}>
          <OdometerCapture
            label="End Odometer Reading (optional)"
            reading={odometerReading}
            photo={odometerPhoto}
            onReadingChange={setOdometerReading}
            onPhotoChange={setOdometerPhoto}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
          <button
            onClick={onDiscard}
            className="md-btn-error-text"
            style={{
              flex: 1,
              border: "1.5px solid rgba(255,180,171,0.3)",
              borderRadius: "100px",
            }}
          >
            Discard
          </button>
          <button
            onClick={() => {
              const reading =
                odometerReading.trim() !== ""
                  ? parseFloat(odometerReading)
                  : null;
              const validReading =
                reading !== null && !isNaN(reading) ? reading : null;
              onConfirm(notes.trim(), validReading, odometerPhoto);
            }}
            className="md-btn-filled"
            style={{
              flex: 2,
              backgroundColor: "var(--md-success)",
              color: "#002110",
            }}
          >
            Save Trip
          </button>
        </div>
      </div>
    </div>
  );
}
