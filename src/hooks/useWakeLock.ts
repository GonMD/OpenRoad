/**
 * useWakeLock — acquires a Screen Wake Lock while `active` is true.
 *
 * The OS automatically releases the lock when the page is hidden (e.g. user
 * switches apps). We re-acquire on `visibilitychange` so that tracking
 * survives brief app-switches.
 *
 * Silently no-ops on browsers that don't support the Wake Lock API.
 */
import { useEffect, useRef } from "react";

export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active) {
      sentinelRef.current?.release().catch((_: unknown) => undefined);
      sentinelRef.current = null;
      return;
    }

    if (!("wakeLock" in navigator)) return;

    let cancelled = false;

    const acquire = async () => {
      if (cancelled) return;
      try {
        sentinelRef.current = await navigator.wakeLock.request("screen");
      } catch {
        // Permission denied or feature not available — silently ignore.
      }
    };

    void acquire();

    // The lock is released whenever the document becomes hidden.
    // Re-acquire each time the user returns to the page.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      sentinelRef.current?.release().catch((_: unknown) => undefined);
      sentinelRef.current = null;
    };
  }, [active]);
}
