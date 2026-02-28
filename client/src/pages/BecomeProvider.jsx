// src/pages/BecomeProvider.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function BecomeProvider() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [canAccess, setCanAccess] = useState(false);

  useEffect(() => {
    if (isLoading) return; // wait for auth to load

    if (!user) {
      // Not logged in → redirect to login
      navigate("/login", { replace: true });
      return;
    }

    if (user.role === "provider" || user.role === "pending") {
      // Already a provider → go to dashboard
      navigate("/provider/dashboard", { replace: true });
    } else if (user.role === "customer") {
      // Customer → allow access to onboarding form
      setCanAccess(true);
    } else {
      // Default fallback for unknown roles
      navigate("/", { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (!canAccess) {
    return (
      <div className="max-w-3xl mx-auto mt-24 p-6 text-center text-gray-600">
        Redirecting...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-24 p-6">
      <h1 className="text-3xl font-bold mb-4">Become a Provider</h1>
      <p className="text-gray-600 mb-6">
        Create your provider profile and submit documents for verification.
      </p>
      {/* Here you can add the onboarding form for customers */}
    </div>
  );
}