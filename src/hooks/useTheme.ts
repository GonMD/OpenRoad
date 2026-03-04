import { useState, useEffect, useCallback } from "react";

export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "mc-theme";

function applyTheme(mode: ThemeMode): void {
  if (mode === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function readStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable
  }
  // Default: respect OS preference, fall back to dark
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

/**
 * Manages the app-wide light/dark theme.
 * - Reads initial value from localStorage (falls back to OS preference).
 * - Writes `data-theme="light"` on <html> for light mode; removes it for dark.
 * - Persists preference to localStorage on change.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => readStoredTheme());

  // Apply on mount and whenever theme changes
  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, setTheme, toggleTheme };
}
