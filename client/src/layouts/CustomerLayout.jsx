// src/layouts/CustomerLayout.jsx
import { useState } from "react";
import { NavLink, useLocation, Outlet } from "react-router-dom";
import {
  FaHome,
  FaClipboardList,
  FaUsers,
  FaUser,
  FaSignOutAlt,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/customerLayout.css";

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", path: "/customer/dashboard", icon: <FaHome /> },
    { label: "Bookings", path: "/customer/bookings", icon: <FaClipboardList /> },
    { label: "Providers", path: "/customer/providers", icon: <FaUsers /> },
    { label: "Profile", path: "/customer/profile", icon: <FaUser /> },
  ];

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="border-b border-emerald-100/80 p-6">
        <div className="flex items-center gap-3">
          <div className="layout-brand-mark">P</div>
          <div>
            <h1 className="layout-brand-title text-2xl">Proxify</h1>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700/70">
              Customer
            </p>
          </div>
        </div>
        <div className="layout-user-chip mt-4">
          <span className="layout-user-dot" />
          <span className="truncate">{user?.name || "Guest"}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `layout-nav-item ${isActive ? "layout-nav-item-active" : ""}`
            }
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-emerald-100/80 p-4">
        <button
          onClick={logout}
          className="layout-logout-button"
        >
          <FaSignOutAlt />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );

  const currentTitle =
    navItems.find((n) => location.pathname.startsWith(n.path))?.label ||
    "Dashboard";

  return (
    <div className="customer-layout flex min-h-screen w-full">
      {/* Desktop Sidebar */}
      <aside className="layout-sidebar hidden w-72 border-r border-emerald-100/80 lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="layout-sidebar relative w-72 shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 text-emerald-800/70 hover:text-emerald-900"
            >
              <FaTimes size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="layout-mobile-header md:hidden">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-700/70">
              Your space
            </p>
            <h2 className="text-lg font-semibold text-emerald-900">{currentTitle}</h2>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="layout-menu-button md:hidden"
          >
            <FaBars size={20} />
          </button>
        </header>

        {/* Page Content */}
        <main className="layout-main flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}