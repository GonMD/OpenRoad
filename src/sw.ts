/**
 * Custom Service Worker — MileageCalc
 *
 * Compiled by Vite via vite-plugin-pwa (injectManifest strategy).
 * Workbox injects the precache manifest at build time in place of
 * self.__WB_MANIFEST.
 *
 * Periodic Background Sync: the browser wakes this SW periodically
 * (minimum ~12h on Chrome Android when conditions are met).  We use it
 * to send a notification reminding the user to open the app if a trip
 * may be in progress, or simply to confirm the app is still tracking.
 *
 * iOS Safari: Periodic Background Sync is not supported — the PBS
 * registration in useBackgroundSync.ts silently fails.
 */

import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

// Augment the global `self` so TypeScript knows it is a ServiceWorkerGlobalScope
// and carries the workbox-injected __WB_MANIFEST token.
// tsconfig.sw.json uses lib: ["ES2022", "WebWorker"] so ServiceWorkerGlobalScope
// and related SW types (WindowClient, NotificationEvent, etc.) are available.
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: { url: string; revision: string | null }[];
};

// ─── Precache (injected by vite-plugin-pwa at build time) ─────────────────────
// vite-plugin-pwa replaces the literal `self.__WB_MANIFEST` token at build time.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ─── Runtime: OSM tile cache ──────────────────────────────────────────────────
registerRoute(
  ({ url }: { url: URL }) =>
    /^https:\/\/[abc]\.tile\.openstreetmap\.org\//.test(url.href),
  new CacheFirst({
    cacheName: "osm-tiles-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// ─── Runtime: Google Fonts ────────────────────────────────────────────────────
registerRoute(
  ({ url }: { url: URL }) =>
    url.href.startsWith("https://fonts.googleapis.com/"),
  new CacheFirst({
    cacheName: "google-fonts-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// ─── Periodic Background Sync ─────────────────────────────────────────────────
// Tag registered by useBackgroundSync.ts: "mc-location-sync"
// PeriodicSyncEvent is not yet in TypeScript's WebWorker lib — cast manually.
type PeriodicSyncEvent = Event & {
  tag: string;
  waitUntil: (p: Promise<unknown>) => void;
};

self.addEventListener("periodicsync", (event: Event) => {
  const pse = event as PeriodicSyncEvent;

  if (pse.tag === "mc-location-sync") {
    pse.waitUntil(
      (async () => {
        // We can't access GPS from a SW directly; the best we can do is
        // show a notification nudging the user to open the app if they
        // have tracking set up.  The app itself handles GPS when foregrounded.
        const clients = await self.clients.matchAll({ type: "window" });

        // If the app is already open (focused), skip — no need to notify.
        const hasVisibleClient = clients.some(
          (c) => (c as WindowClient).visibilityState === "visible",
        );
        if (hasVisibleClient) return;

        // Show a gentle reminder notification.
        await self.registration.showNotification("OpenRoad", {
          body: "Tap to resume trip tracking.",
          icon: "/pwa-192x192.png",
          tag: "mc-bg-sync-reminder",
          silent: true,
        });
      })(),
    );
  }
});

// ─── Notification click — open / focus app ────────────────────────────────────
self.addEventListener("notificationclick", (event: Event) => {
  const nce = event as NotificationEvent;
  nce.notification.close();
  nce.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window" });
      const appClient = clients.find((c) =>
        c.url.startsWith(self.location.origin),
      );
      if (appClient) {
        await (appClient as WindowClient).focus();
      } else {
        await self.clients.openWindow("/");
      }
    })(),
  );
});
