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
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold" style={{ color: "#0ea5e9" }}>
          Proxify
        </h1>
        <p className="text-gray-500 text-sm mt-1">{user?.name}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? "shadow"
                  : "text-gray-700 hover:bg-blue-50"
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { backgroundColor: "#0ea5e9", color: "#ffffff" }
                : { color: "#374151" } // gray-700
            }
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition"
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
    <div className="flex min-h-screen bg-gray-100 w-full">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-64 bg-white shadow-xl flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
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
        <header className="lg:hidden bg-white border-b shadow-sm p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">{currentTitle}</h2>
          <button
            onClick={() => setMobileOpen(true)}
            style={{ color: "#0ea5e9" }}
            className="hover:opacity-80 transition"
          >
            <FaBars size={20} />
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}