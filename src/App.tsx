import { useState, Component } from "react";
import type { ReactNode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { TripsPage } from "./pages/TripsPage.js";
import { ZonesPage } from "./pages/ZonesPage.js";
import { ReportsPage } from "./pages/ReportsPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";
import { RoutePlannerPage } from "./pages/RoutePlannerPage.js";
import { useTheme } from "./hooks/useTheme.js";
import { ThemeContext } from "./contexts/ThemeContext.js";
import { GeolocationProvider } from "./contexts/GeolocationContext.jsx";
import { OnboardingModal } from "./components/OnboardingModal.js";
import { hasCompletedOnboarding } from "./lib/onboarding.js";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100svh",
            padding: "24px",
            gap: "16px",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <p style={{ fontSize: "2rem" }}>⚠️</p>
          <p style={{ fontWeight: 700, fontSize: "1.125rem" }}>
            Something went wrong
          </p>
          <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => {
              window.location.reload();
            }}
            style={{
              marginTop: "8px",
              padding: "10px 24px",
              borderRadius: "100px",
              border: "none",
              background: "#0077cc",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState(
    () => !hasCompletedOnboarding(),
  );

  return (
    <ErrorBoundary>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <GeolocationProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="trips" element={<TripsPage />} />
                <Route path="zones" element={<ZonesPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="plan" element={<RoutePlannerPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </GeolocationProvider>
        {showOnboarding && (
          <OnboardingModal
            onDone={() => {
              setShowOnboarding(false);
            }}
          />
        )}
      </ThemeContext.Provider>
    </ErrorBoundary>
  );
}
