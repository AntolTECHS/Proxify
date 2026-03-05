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
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-gray-600">
        Loading...
      </div>
    );
  }

  // ---------------- NOT LOGGED IN ----------------
  if (!user) return <Navigate to="/login" replace />;

  // ---------------- EXCLUDE ROLE ----------------
  if (excludeRole && user.role === excludeRole) {
    return <Navigate to="/" replace />;
  }

  // ---------------- PROVIDER ----------------
  if (role === "provider") {
    if (user.role === "provider") return children;

    // Redirect non-providers to onboarding
    return <Navigate to="/become-provider" replace />;
  }

  // ---------------- CUSTOMER ----------------
  if (role === "customer") {
    if (user.role === "customer") return children;

    // Redirect providers to dashboard
    if (user.role === "provider") {
      return <Navigate to="/provider/dashboard" replace />;
    }

    return <Navigate to="/" replace />;
  }

  // ---------------- ADMIN ----------------
  if (role === "admin") {
    if (user.role === "admin") return children;
    return <Navigate to="/" replace />;
  }

  // ---------------- DEFAULT ----------------
  return children;
}