import { usePwaInstall } from "../../hooks/usePwaInstall.js";

export function BannerBar() {
  const {
    isOffline,
    showIosBanner,
    dismissIosBanner,
    showAndroidPrompt,
    triggerAndroidInstall,
  } = usePwaInstall();

  return (
    <>
      {isOffline && (
        <div
          style={{
            backgroundColor: "var(--md-surface-container-high)",
            color: "var(--md-on-surface-variant)",
            fontSize: "0.75rem",
            textAlign: "center",
            padding: "8px 16px",
          }}
        >
          You are offline — all data is saved locally.
        </div>
      )}

      {showIosBanner && (
        <div
          style={{
            backgroundColor: "var(--md-primary-container)",
            color: "var(--md-on-primary-container)",
            fontSize: "0.8125rem",
            padding: "12px 16px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <span style={{ flex: 1 }}>
            Install OpenRoad: tap <strong>Share</strong> then{" "}
            <strong>Add to Home Screen</strong>.
          </span>
          <button
            onClick={dismissIosBanner}
            aria-label="Dismiss"
            style={{
              background: "none",
              border: "none",
              color: "var(--md-on-primary-container)",
              cursor: "pointer",
              padding: "0 4px",
              fontSize: "1.125rem",
              lineHeight: 1,
              opacity: 0.7,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {showAndroidPrompt && (
        <div
          style={{
            backgroundColor: "var(--md-primary-container)",
            color: "var(--md-on-primary-container)",
            fontSize: "0.8125rem",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ flex: 1 }}>Install OpenRoad for offline use.</span>
          <button
            onClick={triggerAndroidInstall}
            className="md-btn-filled"
            style={{ padding: "6px 16px", fontSize: "0.8125rem" }}
          >
            Install
          </button>
        </div>
      )}
    </>
  );
}
