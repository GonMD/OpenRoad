import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "🏠" },
  { to: "/trips", label: "Trips", icon: "🚗" },
  { to: "/zones", label: "Zones", icon: "📍" },
  { to: "/reports", label: "Reports", icon: "📊" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-800 border-t border-slate-700 safe-area-inset-bottom">
      <ul className="flex justify-around items-center h-16">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors ${
                  isActive
                    ? "text-blue-400"
                    : "text-slate-400 hover:text-slate-200"
                }`
              }
            >
              <span className="text-lg leading-none" aria-hidden>
                {icon}
              </span>
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
