import { useRef, useCallback } from "react";

// ─── Image compression helper ─────────────────────────────────────────────────

/**
 * Reads a File/Blob and returns a compressed base64 JPEG string (max 800px wide,
 * quality 0.75).  Returns null if the Canvas API is unavailable.
 */
async function compressImageToBase64(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxW = 800;
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
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    img.src = objectUrl;
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface OdometerCaptureProps {
  /** Label shown above the numeric input */
  label: string;
  /** Current numeric reading value (controlled) */
  reading: string;
  /** Current photo base64 value (controlled, null = none) */
  photo: string | null;
  onReadingChange: (value: string) => void;
  onPhotoChange: (base64: string | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OdometerCapture({
  label,
  reading,
  photo,
  onReadingChange,
  onPhotoChange,
}: OdometerCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const compressed = await compressImageToBase64(file);
      onPhotoChange(compressed);
      // Reset input so the same file can be re-selected after clearing
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [onPhotoChange],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Numeric reading input */}
      <div className="md-field">
        <label className="md-field-label" htmlFor={`odometer-${label}`}>
          {label}
        </label>
        <input
          id={`odometer-${label}`}
          type="number"
          min="0"
          step="1"
          placeholder="e.g. 42187"
          value={reading}
          onChange={(e) => {
            onReadingChange(e.target.value);
          }}
          className="md-input"
          inputMode="numeric"
          style={{ fontVariantNumeric: "tabular-nums" }}
        />
      </div>

      {/* Photo area */}
      {photo ? (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img
            src={photo}
            alt="Odometer photo"
            style={{
              width: "100%",
              maxHeight: "160px",
              objectFit: "cover",
              borderRadius: "10px",
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
            {/* Retake */}
            <button
              type="button"
              onClick={() => {
                fileInputRef.current?.click();
              }}
              aria-label="Retake photo"
              style={{
                background: "rgba(0,0,0,0.55)",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
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
            {/* Remove */}
            <button
              type="button"
              onClick={() => {
                onPhotoChange(null);
              }}
              aria-label="Remove photo"
              style={{
                background: "rgba(0,0,0,0.55)",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
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
            fileInputRef.current?.click();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "none",
            border: "1.5px dashed var(--md-outline-variant)",
            borderRadius: "10px",
            padding: "12px 16px",
            cursor: "pointer",
            color: "var(--md-on-surface-variant)",
            fontSize: "0.8125rem",
            fontWeight: 500,
            width: "100%",
          }}
        >
          <span className="ms icon-20" aria-hidden="true">
            photo_camera
          </span>
          Take / choose odometer photo (optional)
        </button>
      )}

      {/* Hidden file input — accept camera or gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => {
          void handleFileChange(e);
        }}
        aria-hidden="true"
      />
    </div>
  );
}
