import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav.js";
import { BannerBar } from "./BannerBar.js";

export function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-slate-100">
      <BannerBar />
      <main className="flex-1 overflow-y-auto pb-20 px-4 pt-4 max-w-2xl mx-auto w-full">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
