// src/pages/provider/ProviderStatus.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProviderStatus() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  // Redirect if user is no longer pending
  React.useEffect(() => {
    if (!user) {
      navigate("/auth/login");
      return;
    }

    if (user.role === "provider" && user.isVerified) {
      navigate("/provider/dashboard");
    }
  }, [user, navigate]);

  return (
    <div className="max-w-3xl mx-auto mt-24 p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">Provider Account Pending</h1>
      <p className="text-gray-600 mb-6">
        Your provider account is currently under review. You will be notified
        once it has been approved.
      </p>
      <p className="text-gray-500">
        Thank you for your patience. In the meantime, you can continue browsing our platform.
      </p>
    </div>
  );
}
