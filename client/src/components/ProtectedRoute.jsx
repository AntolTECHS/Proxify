// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

/**
 * ProtectedRoute
 * @param {ReactNode} children - component to render
 * @param {string} role - optional, restrict by role
 */
export default function ProtectedRoute({ children, role }) {
  const { user } = useSelector((state) => state.auth);

  // 🚫 Not logged in → redirect to login
  if (!user) return <Navigate to="/auth/login" replace />;

  // ---------- PROVIDER CHECKS ----------
  if (role === "provider") {
    // Onboarding not finished → redirect to onboarding
    if (user.role !== "provider" && user.providerStatus !== "approved") {
      return <Navigate to="/provider/onboarding" replace />;
    }

    // Already provider but not verified → redirect to pending page
    if (user.role === "provider" && !user.isVerified) {
      return <Navigate to="/provider/pending" replace />;
    }
  }

  // ---------- ROLE RESTRICTION ----------
  if (role && user.role !== role) return <Navigate to="/" replace />;

  // ✅ Access granted
  return children;
}
