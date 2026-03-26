// src/pages/provider/ProviderOnboarding.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Only Basic Info step for now
import StepBasicInfo from "./onboarding/steps/StepBasicInfo";

export default function ProviderOnboarding() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ basicInfo: {} });

  // Redirect if user is already a provider
  useEffect(() => {
    if (!user) return;
    if (user.role === "provider") navigate("/provider/dashboard", { replace: true });
  }, [user, navigate]);

  // Update form data from child steps
  const update = (section, data) => {
    setFormData((prev) => ({ ...prev, [section]: data }));
  };

  // Show loading while auth context is initializing
  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-gray-600">
        Loading...
      </div>
    );
  }

  // User not logged in, redirect to login
  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  return (
    <div className="max-w-xl mx-auto mt-24 p-6">
      <StepBasicInfo data={formData} update={update} />
    </div>
  );
}