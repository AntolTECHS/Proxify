// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * ProtectedRoute
 * @param {ReactNode} children - Component(s) to render if allowed
 * @param {string} role - Optional: "provider", "customer", "admin"
 * @param {string} excludeRole - Optional: redirect if user has this role
 */
export default function ProtectedRoute({ children, role, excludeRole }) {
  const { user, isLoading, hasHydrated } = useAuth();

  // Wait until auth is fully ready
  if (!hasHydrated || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-gray-600">
        Loading...
      </div>
    );
  }

  // Not logged in → go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user has an excluded role → send them to THEIR dashboard
  if (excludeRole && user.role === excludeRole) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  // If route requires a role and user doesn't match → redirect
  if (role && user.role !== role) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  // ✅ Authorized
  return children;
}

// Centralized dashboard paths (FIXED)
const DASHBOARD_PATHS = {
  provider: "/provider/dashboard",
  customer: "/customer/dashboard",
  admin: "/admin/dashboard", // ✅ FIXED (was /admin/panel ❌)
};

// Helper
function getDashboardPath(role) {
  return DASHBOARD_PATHS[role] || "/";
}