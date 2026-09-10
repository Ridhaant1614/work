import React, { useState } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "./auth";
import { useToast } from "./toast";

const NAV = [
  { label: "Overview", group: "MAIN" },
  { to: "/", icon: "⬡", label: "Dashboard", end: true },

  { label: "BUSINESS", group: "BUSINESS" },
  { to: "/billing", icon: "⚡", label: "Billing & POS" },
  { to: "/sales", icon: "🧾", label: "Sales" },
  { to: "/purchases", icon: "📦", label: "Purchases" },
  { to: "/expenses", icon: "💳", label: "Expenses" },

  { label: "CATALOG", group: "CATALOG" },
  { to: "/inventory", icon: "📊", label: "Inventory" },
  { to: "/products", icon: "🏷️", label: "Products & Costs" },
  { to: "/dealers", icon: "🏪", label: "Dealers" },

  { label: "INSIGHTS", group: "INSIGHTS" },
  { to: "/reports", icon: "📈", label: "Reports" },
  { to: "/staff", icon: "👥", label: "Staff", ownerOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { show } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function doLogout() {
    logout();
    show("Signed out", "info");
    navigate("/login");
  }

  const initials = user?.name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  const items = NAV.filter(n => !("ownerOnly" in n) || !n.ownerOnly || user?.role === "owner");

  const SidebarContent = () => (
    <>
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">SE</div>
        <div>
          <div className="sidebar-logo-text">Soneja Electronics</div>
          <div className="sidebar-logo-sub">Distribution CRM</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {items.map((item, i) => {
          if ("group" in item && "label" in item && !("to" in item)) {
            return <div key={i} className="nav-group-label">{item.label}</div>;
          }
          if ("to" in item) {
            return (
              <NavLink
                key={item.to}
                to={item.to as string}
                end={"end" in item ? item.end : false}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            );
          }
          return null;
        })}
      </nav>
      <div className="sidebar-footer">
        <div className="user-chip" onClick={doLogout} title="Click to sign out">
          <div className="avatar" style={{ fontSize: 12 }}>{initials}</div>
          <div className="user-chip-info">
            <div className="user-chip-name">{user?.name}</div>
            <div className="user-chip-role">{user?.role}</div>
          </div>
          <span className="logout-btn" title="Sign out">⏻</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <SidebarContent />
      </aside>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="main-area">
        {/* Mobile topbar */}
        <div className="mobile-topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>☰</button>
          <div className="sidebar-logo-text" style={{ flex: 1 }}>Soneja Electronics</div>
          <div className="avatar-initials" style={{ width: 32, height: 32, fontSize: 12 }}>{initials}</div>
        </div>

        {/* Main outlet */}
        <Outlet />

        {/* Mobile bottom nav */}
        <div className="mobile-nav">
          <div className="mobile-nav-items">
            {[
              { to: "/", icon: "⬡", label: "Home" },
              { to: "/billing", icon: "⚡", label: "Billing" },
              { to: "/sales", icon: "🧾", label: "Sales" },
              { to: "/inventory", icon: "📊", label: "Stock" },
              { to: "/reports", icon: "📈", label: "Reports" },
            ].map(it => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === "/"}
                className={({ isActive }) => `mobile-nav-item${isActive ? " active" : ""}`}
              >
                <span className="nav-icon">{it.icon}</span>
                <span>{it.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
