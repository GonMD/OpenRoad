import { useState, useRef, useCallback } from "react";
import type { TripPurpose } from "../types/index.js";
import { TRIP_PURPOSE_LABELS } from "../types/index.js";
import { formatMiles } from "../lib/distance.js";

// ─── Web Speech API ambient types ────────────────────────────────────────────
// The standard lib doesn't include SpeechRecognition for all targets, so we
// declare only what we actually use rather than casting to `any`.

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

// Resolve the constructor from either the standard or webkit-prefixed name
function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionInstance)
  | null {
  const w = window as unknown as Record<string, unknown>;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (typeof Ctor === "function") {
    return Ctor as new () => SpeechRecognitionInstance;
  }
  return null;
}

// ─── Common trip notes presets ────────────────────────────────────────────────

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
  onConfirm: (notes: string) => void;
  onDiscard: () => void;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Bottom-sheet modal shown when the user taps "End Trip".
 * Features:
 *  - Free-text notes textarea
 *  - Common notes dropdown (pre-fills textarea for editing)
 *  - Speech-to-text mic button (appends dictation to existing text)
 */
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
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const speechSupported = getSpeechRecognitionCtor() !== null;

  // ── Speech-to-text ──────────────────────────────────────────────────────────

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
      for (const result of Array.from(e.results)) {
        parts.push(result[0].transcript);
      }
      const transcript = parts.join(" ").trim();
      if (transcript) {
        setNotes((prev) => (prev ? prev + " " + transcript : transcript));
      }
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== "no-speech") {
        setSpeechError(e.error);
      }
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

  // ── Preset dropdown ─────────────────────────────────────────────────────────

  const handlePreset = (value: string) => {
    if (!value) return;
    setNotes(value);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onCancel}
    >
      {/* Sheet — stop propagation so clicks inside don't close */}
      <div
        className="w-full max-w-2xl bg-slate-800 rounded-t-2xl p-5 space-y-4"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">End Trip</h2>
          <button
            onClick={onCancel}
            aria-label="Cancel"
            className="text-slate-400 hover:text-slate-200 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Trip summary */}
        <div className="flex gap-4 text-sm text-slate-300">
          <span>
            <span className="text-slate-500">Distance: </span>
            <span className="font-medium text-slate-100">
              {formatMiles(miles)}
            </span>
          </span>
          <span>
            <span className="text-slate-500">Purpose: </span>
            <span className="font-medium text-slate-100">
              {TRIP_PURPOSE_LABELS[purpose]}
            </span>
          </span>
        </div>

        {/* Common notes preset dropdown */}
        <div className="space-y-1">
          <label className="text-xs text-slate-400" htmlFor="notes-preset">
            Quick note
          </label>
          <select
            id="notes-preset"
            defaultValue=""
            onChange={(e) => {
              handlePreset(e.target.value);
            }}
            className="w-full bg-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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

        {/* Notes textarea + mic button */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-400" htmlFor="trip-notes">
              Notes (optional)
            </label>
            {speechSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                aria-label={isListening ? "Stop dictation" : "Dictate notes"}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                  isListening
                    ? "bg-red-700 hover:bg-red-600 text-white animate-pulse"
                    : "bg-slate-600 hover:bg-slate-500 text-slate-200"
                }`}
              >
                {/* Mic icon (inline SVG — no extra dependency) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-3.5 h-3.5"
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
            className="w-full bg-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          {speechError && (
            <p className="text-xs text-red-400">
              Microphone error: {speechError}
            </p>
          )}
          <p className="text-right text-xs text-slate-600">
            {notes.length}/500
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1 pb-safe">
          <button
            onClick={onDiscard}
            className="flex-1 bg-red-900 hover:bg-red-800 text-red-200 text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Discard
          </button>
          <button
            onClick={() => {
              onConfirm(notes.trim());
            }}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Save Trip
          </button>
        </div>
      </div>
    </div>
  );
}
