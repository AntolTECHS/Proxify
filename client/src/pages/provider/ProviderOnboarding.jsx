// src/pages/provider/ProviderOnboarding.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Steps
import StepBasicInfo from "./onboarding/steps/StepBasicInfo";
import StepServices from "./onboarding/steps/StepServices";
import StepAvailability from "./onboarding/steps/StepAvailability";
import StepDocuments from "./onboarding/steps/StepDocuments";
import StepReview from "./onboarding/steps/StepReview";

// Progress
import OnboardingProgress from "../../components/provider/OnboardingProgress";

const steps = ["Basic Info", "Services", "Availability", "Documents", "Review"];

export default function ProviderOnboarding() {
  const { user, upgradeToProvider, loading: authLoading, error: authError, logout } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    basicInfo: {},
    services: [],
    servicesDescription: "",
    availability: {},
    documents: [],
    documentsText: "",
  });
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect users who are already providers
  useEffect(() => {
    if (!user) return;
    if (user.role === "provider") {
      navigate("/provider/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // Step navigation
  const next = () => setStep((prev) => Math.min(prev + 1, steps.length - 1));
  const back = () => setStep((prev) => Math.max(prev - 0, 0));

  // Update form data
  const update = (section, data) => {
    setFormData((prev) => {
      const updated = { ...prev, [section]: data };

      if (section === "documents") {
        updated.documents = Array.isArray(data)
          ? data.map((f) =>
              f instanceof File
                ? { file: f, name: f.name, size: f.size, type: f.type }
                : { name: f.name || f, size: f.size || 0, type: f.type || "text" }
            )
          : [];
      }

      if (section === "documentsText") updated.documentsText = data;
      if (section === "services") {
        updated.services = data.services || data || [];
        updated.servicesDescription = data.servicesDescription || "";
      }
      if (section === "basicInfo") updated.basicInfo = data;

      return updated;
    });
  };

  // Submit onboarding
  const finishOnboarding = async () => {
    if (submitting) return;
    setSubmitError(null);
    setSubmitting(true);

    try {
      const payload = new FormData();
      payload.append("basicInfo", JSON.stringify(formData.basicInfo || {}));
      payload.append("services", JSON.stringify(formData.services || []));
      payload.append("servicesDescription", formData.servicesDescription || "");
      payload.append("availability", JSON.stringify(formData.availability || {}));
      if (formData.documentsText) payload.append("documentsText", formData.documentsText);

      (formData.documents || []).forEach((doc) => {
        if (doc?.file instanceof File) payload.append("documents", doc.file);
      });

      const result = await upgradeToProvider(payload);

      if (result.success) {
        // Redirect handled inside upgradeToProvider
        return;
      } else if (result.error?.message.includes("Token invalid")) {
        alert("Session expired. Please log in again.");
        logout();
        navigate("/login", { replace: true });
      } else {
        throw result.error;
      }
    } catch (err) {
      console.error("Provider onboarding failed:", err);
      setSubmitError(err?.message || "Failed to submit onboarding. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Render current step
  const stepProps = { next, back, update, data: formData };
  const renderStep = () => {
    switch (step) {
      case 0:
        return <StepBasicInfo {...stepProps} />;
      case 1:
        return <StepServices {...stepProps} />;
      case 2:
        return <StepAvailability {...stepProps} />;
      case 3:
        return <StepDocuments {...stepProps} />;
      case 4:
        return (
          <StepReview
            data={formData}
            back={back}
            submit={finishOnboarding}
            isLoading={submitting || authLoading}
            error={submitError || authError}
          />
        );
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-gray-600">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-24 p-6">
      <OnboardingProgress steps={steps} current={step} />
      <div className="mt-6 bg-white border border-gray-300 rounded-xl shadow p-6">
        {renderStep()}
      </div>
    </div>
  );
}