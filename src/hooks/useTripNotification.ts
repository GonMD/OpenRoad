import { useEffect, useRef } from "react";
import type { TripPurpose } from "../types/index.js";
import { TRIP_PURPOSE_LABELS } from "../types/index.js";
import { formatMiles } from "../lib/distance.js";

// iOS Safari PWA does not support the Notification API at all.
// We check for support before doing anything.
const notificationsSupported =
  typeof window !== "undefined" && "Notification" in window;

const NOTIFICATION_TAG = "mc-trip-in-progress";

/**
 * Requests notification permission the first time a trip starts (if not already
 * granted/denied).  Shows / updates / closes a persistent notification that
 * reflects the current trip state.  Gracefully no-ops on unsupported browsers
 * (iOS Safari) or when permission is denied.
 */
export function useTripNotification(
  isTracking: boolean,
  currentMiles: number,
  purpose: TripPurpose | null,
): void {
  // Keep a ref to the active Notification instance so we can close it
  const notifRef = useRef<Notification | null>(null);
  const permissionRequestedRef = useRef(false);

  // Request permission once when tracking starts, if not yet decided
  useEffect(() => {
    if (!notificationsSupported) return;
    if (!isTracking) return;
    if (permissionRequestedRef.current) return;
    if (Notification.permission !== "default") return;

    permissionRequestedRef.current = true;
    void Notification.requestPermission();
  }, [isTracking]);

  // Show / update / close notification based on tracking state + distance
  useEffect(() => {
    if (!notificationsSupported) return;
    if (Notification.permission !== "granted") return;

    if (!isTracking || purpose === null) {
      // Close any open notification when the trip ends / is discarded
      if (notifRef.current) {
        notifRef.current.close();
        notifRef.current = null;
      }
      return;
    }

    const purposeLabel = TRIP_PURPOSE_LABELS[purpose];
    const milesLabel = formatMiles(currentMiles);

    // Re-issue with the same tag — browsers replace the existing notification
    // instead of stacking a new one.
    const notif = new Notification("Trip in progress", {
      tag: NOTIFICATION_TAG,
      body: `${purposeLabel} · ${milesLabel} so far`,
      icon: "/pwa-192x192.png",
      silent: true,
    });

    notifRef.current = notif;

    return () => {
      // Do NOT close on cleanup of distance updates — only close on trip end.
      // The return here handles hot-module replacement in dev only.
    };
  }, [isTracking, currentMiles, purpose]);

  // Ensure notification is closed when the component unmounts
  useEffect(() => {
    return () => {
      if (notifRef.current) {
        notifRef.current.close();
        notifRef.current = null;
      }
    };
  }, []);
}
