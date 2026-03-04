import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { TripsPage } from "./pages/TripsPage.js";
import { ZonesPage } from "./pages/ZonesPage.js";
import { ReportsPage } from "./pages/ReportsPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";
import { useTheme } from "./hooks/useTheme.js";
import { ThemeContext } from "./contexts/ThemeContext.js";
import { OnboardingModal } from "./components/OnboardingModal.js";
import { hasCompletedOnboarding } from "./lib/onboarding.js";

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState(
    () => !hasCompletedOnboarding(),
  );

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="trips" element={<TripsPage />} />
            <Route path="zones" element={<ZonesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      {showOnboarding && (
        <OnboardingModal
          onDone={() => {
            setShowOnboarding(false);
          }}
        />
      )}
    </ThemeContext.Provider>
  );
}
