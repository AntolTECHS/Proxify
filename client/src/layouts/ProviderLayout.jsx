// src/layouts/ProviderLayout.jsx
import { useState } from "react";
import {
  Navigate,
  NavLink,
  useLocation,
  Outlet, // ✅ added
} from "react-router-dom";
import {
  FaTachometerAlt,
  FaUsers,
  FaClipboardList,
  FaCogs,
  FaSignOutAlt,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProviderLayout() {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-gray-600">
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "provider" && user.role !== "pending") {
    return <Navigate to="/become-provider" replace />;
  }

  const navItems = [
    { label: "Dashboard", path: "/provider/dashboard", icon: <FaTachometerAlt /> },
    { label: "Community", path: "/provider/community", icon: <FaUsers /> },
    { label: "Jobs", path: "/provider/jobs", icon: <FaClipboardList /> },
    { label: "Settings", path: "/provider/settings", icon: <FaCogs /> },
  ];

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-6 py-6">
        <h1 className="text-2xl font-bold text-slate-900">Provider Portal</h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
          {user.name}
          {user.providerStatus === "pending" && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              Pending
            </span>
          )}
        </p>
      </div>

      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-slate-900 text-white shadow"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
        >
          <FaSignOutAlt />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-gradient-to-br from-slate-100 via-slate-50 to-amber-50">
      {/* Sidebar for large screens */}
      <aside className="hidden w-72 flex-col border-r border-slate-200 bg-white/90 shadow-lg backdrop-blur lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60"
            onClick={() => setMobileOpen(false)}
          ></div>
          <aside className="relative z-50 flex w-72 flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-end border-b border-slate-200 p-4">
              <button
                onClick={() => setMobileOpen(false)}
                className="text-slate-600 hover:text-slate-900"
              >
                <FaTimes />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col w-full">
        {/* Mobile Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur lg:hidden">
          <h2 className="text-lg font-semibold text-slate-900">
            {navItems.find((n) => location.pathname.startsWith(n.path))?.label || "Provider Portal"}
          </h2>
          <button
            onClick={() => setMobileOpen(true)}
            className="text-slate-600 hover:text-slate-900"
          >
            <FaBars />
          </button>
        </header>

        {/* ✅ THIS IS THE FIX */}
        <main className="w-full flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}