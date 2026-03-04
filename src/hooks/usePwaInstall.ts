import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface PwaInstallState {
  /** True when running on iOS Safari and not yet installed */
  showIosBanner: boolean;
  /** True when the Android/Chrome install prompt is available */
  showAndroidPrompt: boolean;
  /** Call to trigger the native Android install prompt */
  triggerAndroidInstall: () => void;
  /** Dismiss the iOS banner and remember the decision */
  dismissIosBanner: () => void;
  /** True when the device is offline */
  isOffline: boolean;
}

const IOS_BANNER_DISMISSED_KEY = "ios-install-banner-dismissed";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  // "standalone" means already installed as PWA
  const isStandalone =
    "standalone" in navigator &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  // Check it's Safari (not Chrome/Firefox on iOS which use WKWebView)
  const isSafari = /safari/i.test(ua) && !/crios|fxios|opios/i.test(ua);
  return isIos && isSafari && !isStandalone;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePwaInstall(): PwaInstallState {
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // iOS banner — show once per session if not dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem(IOS_BANNER_DISMISSED_KEY) === "true";
    if (!dismissed && isIosSafari()) {
      queueMicrotask(() => {
        setShowIosBanner(true);
      });
    }
  }, []);

  // Android beforeinstallprompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroidPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  // Offline / online detection
  useEffect(() => {
    const onOffline = () => {
      setIsOffline(true);
    };
    const onOnline = () => {
      setIsOffline(false);
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const triggerAndroidInstall = () => {
    if (!deferredPrompt) return;
    void deferredPrompt.prompt();
    void deferredPrompt.userChoice.then(() => {
      setDeferredPrompt(null);
      setShowAndroidPrompt(false);
    });
  };

  const dismissIosBanner = () => {
    localStorage.setItem(IOS_BANNER_DISMISSED_KEY, "true");
    setShowIosBanner(false);
  };

  return {
    showIosBanner,
    showAndroidPrompt,
    triggerAndroidInstall,
    dismissIosBanner,
    isOffline,
  };
}
