import { usePwaInstall } from "../../hooks/usePwaInstall.js";

/**
 * Renders contextual banners at the top of the app:
 * - Offline indicator
 * - iOS "Add to Home Screen" install prompt
 * - Android native install prompt
 */
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
      {/* Offline indicator */}
      {isOffline && (
        <div className="bg-yellow-900 text-yellow-200 text-xs text-center py-1.5 px-4">
          You are offline — all data is saved locally.
        </div>
      )}

      {/* iOS install banner */}
      {showIosBanner && (
        <div className="bg-blue-900 text-blue-100 text-xs px-4 py-2.5 flex items-start gap-2">
          <span className="flex-1">
            Install MileageCalc: tap the <strong>Share</strong> button then{" "}
            <strong>Add to Home Screen</strong>.
          </span>
          <button
            onClick={dismissIosBanner}
            aria-label="Dismiss install banner"
            className="text-blue-300 hover:text-blue-100 leading-none text-base shrink-0 mt-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Android install prompt */}
      {showAndroidPrompt && (
        <div className="bg-blue-900 text-blue-100 text-xs px-4 py-2.5 flex items-center gap-2">
          <span className="flex-1">Install MileageCalc for offline use.</span>
          <button
            onClick={triggerAndroidInstall}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg font-medium text-xs transition-colors"
          >
            Install
          </button>
        </div>
      )}
    </>
  );
}
