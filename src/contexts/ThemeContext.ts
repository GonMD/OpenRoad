import { createContext, useContext } from "react";
import type { ThemeMode } from "../hooks/useTheme.js";

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {
    /* no-op */
  },
});

export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}
