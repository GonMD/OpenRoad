import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.js";
import { ensureDefaultSettings, purgeOldLocationSamples } from "./db/index.js";

// Ensure DB has default settings then purge stale location samples before rendering
const mount = () => {
  const root = document.getElementById("root");
  if (!root) return;
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void ensureDefaultSettings()
  .then(() => purgeOldLocationSamples())
  .catch(() => {
    // DB init failed (quota exceeded, private browsing, corruption, etc.)
    // Mount anyway — the app will degrade gracefully rather than show a blank screen.
  })
  .then(mount);
