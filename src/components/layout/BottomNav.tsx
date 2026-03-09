import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "home" },
  { to: "/trips", label: "Trips", icon: "directions_car" },
  { to: "/plan", label: "Plan", icon: "route" },
  { to: "/zones", label: "Zones", icon: "location_on" },
  { to: "/reports", label: "Reports", icon: "bar_chart" },
  { to: "/settings", label: "Settings", icon: "settings" },
] as const;

export function BottomNav() {
  return (
    <nav className="md-nav-bar">
      {NAV_ITEMS.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            `md-nav-item${isActive ? " md-nav-item-active" : ""}`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={
                  isActive ? "md-nav-indicator" : "md-nav-indicator-inactive"
                }
              >
                <span className="ms icon-20" aria-hidden="true">
                  {icon}
                </span>
              </div>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
