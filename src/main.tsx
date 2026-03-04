import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.js";
import { ensureDefaultSettings } from "./db/index.js";

// Ensure DB has default settings before rendering
void ensureDefaultSettings().then(() => {
  const root = document.getElementById("root");
  if (!root) throw new Error("Root element not found");

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
