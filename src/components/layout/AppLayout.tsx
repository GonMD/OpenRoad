import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav.js";
import { BannerBar } from "./BannerBar.js";

export function AppLayout() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100svh",
        backgroundColor: "var(--md-surface)",
        color: "var(--md-on-surface)",
      }}
    >
      <BannerBar />
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          paddingBottom: "96px",
          paddingLeft: "16px",
          paddingRight: "16px",
          paddingTop: "16px",
          maxWidth: "600px",
          marginLeft: "auto",
          marginRight: "auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
