import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.js";
import { ensureDefaultSettings, purgeOldLocationSamples } from "./db/index.js";

// Ensure DB has default settings then purge stale location samples before rendering
void ensureDefaultSettings()
  .then(() => purgeOldLocationSamples())
  .then(() => {
    const root = document.getElementById("root");
    if (!root) throw new Error("Root element not found");

    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
