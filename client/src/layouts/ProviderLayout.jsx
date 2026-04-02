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
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">Provider Portal</h1>
        <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
          {user.name}
          {user.providerStatus === "pending" && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded">
              Pending
            </span>
          )}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded-md transition ${
                isActive
                  ? "bg-sky-400 text-white"
                  : "text-gray-700 hover:bg-sky-100"
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 w-full rounded-md text-gray-700 hover:bg-sky-100 transition"
        >
          <FaSignOutAlt />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-100 w-full">
      {/* Sidebar for large screens */}
      <aside className="hidden lg:flex flex-col w-64 bg-white shadow-lg border-r border-gray-200">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setMobileOpen(false)}
          ></div>
          <aside className="relative w-64 bg-white shadow-lg flex flex-col z-50">
            <div className="p-4 flex justify-end items-center border-b border-gray-200">
              <button
                onClick={() => setMobileOpen(false)}
                className="text-gray-700 hover:text-gray-900"
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
        <header className="bg-white shadow-sm p-4 border-b lg:hidden flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            {navItems.find((n) => location.pathname.startsWith(n.path))?.label || "Provider Portal"}
          </h2>
          <button
            onClick={() => setMobileOpen(true)}
            className="text-gray-700 hover:text-gray-900"
          >
            <FaBars />
          </button>
        </header>

        {/* ✅ THIS IS THE FIX */}
        <main className="flex-1 p-4 md:p-8 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}