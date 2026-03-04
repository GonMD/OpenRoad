/**
 * useBackgroundSync
 *
 * Registers the Periodic Background Sync tag "mc-location-sync" when GPS
 * tracking is active.  Chrome Android (85+) wakes the service worker
 * periodically (minimum ~12 h) so it can show a nudge notification.
 *
 * Silently no-ops on:
 *   - iOS Safari (no PBS support)
 *   - Firefox / Samsung Internet (no PBS)
 *   - Any browser where SW registration is unavailable
 *   - When the user denies notification / periodic-background-sync permission
 */

import { useEffect } from "react";

// PeriodicSyncManager is not yet in TypeScript's DOM lib — declare it locally.
interface PeriodicSyncManager {
  register: (tag: string, options?: { minInterval: number }) => Promise<void>;
  unregister: (tag: string) => Promise<void>;
  getTags: () => Promise<string[]>;
}

declare global {
  interface ServiceWorkerRegistration {
    periodicSync?: PeriodicSyncManager;
  }
}

const PBS_TAG = "mc-location-sync";
const MIN_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

export function useBackgroundSync(isWatching: boolean): void {
  useEffect(() => {
    if (!isWatching) return;

    void (async () => {
      try {
        if (!("serviceWorker" in navigator)) return;
        const reg = await navigator.serviceWorker.ready;
        if (!reg.periodicSync) return; // browser doesn't support PBS

        // Check permission
        const status = await navigator.permissions.query(
          // @ts-expect-error — "periodic-background-sync" not in TS PermissionName union yet
          { name: "periodic-background-sync" },
        );
        if (status.state !== "granted") return;

        await reg.periodicSync.register(PBS_TAG, {
          minInterval: MIN_INTERVAL_MS,
        });
      } catch {
        // Any failure (permissions denied, SW not yet active, etc.) is silently ignored.
      }
    })();
  }, [isWatching]);
}
