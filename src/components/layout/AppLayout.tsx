import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav.js";
import { BannerBar } from "./BannerBar.js";
import { useSwipeNavigation } from "../../hooks/useSwipeNavigation.js";

export function AppLayout() {
  const swipeRef = useSwipeNavigation();

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
        ref={swipeRef}
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
          touchAction: "pan-y", // Allow vertical scroll, handle horizontal swipes
        }}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
