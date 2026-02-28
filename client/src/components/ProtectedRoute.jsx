// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * ProtectedRoute
 * @param {ReactNode} children
 * @param {string} role - optional ("provider", "customer", "admin")
 * @param {string} excludeRole - optional, prevent this role from accessing the route
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

  // Not logged in → redirect to login
  if (!user) return <Navigate to="/login" replace />;

  // Exclude certain role (used for BecomeProvider)
  if (excludeRole && user.role === excludeRole) {
    return <Navigate to="/" replace />;
  }

  // ---------- PROVIDER ----------
  if (role === "provider") {
    if (user.role === "provider" || user.role === "pending") return children;
    return <Navigate to="/become-provider" replace />;
  }

  // ---------- CUSTOMER ----------
  if (role === "customer") {
    if (user.role !== "customer") return <Navigate to="/" replace />;
    return children;
  }

  // ---------- ADMIN ----------
  if (role === "admin") {
    if (user.role !== "admin") return <Navigate to="/" replace />;
    return children;
  }

  // ---------- NO ROLE SPECIFIED ----------
  return children;
}