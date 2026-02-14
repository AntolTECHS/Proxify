import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import {
  setProviderStep,
  setProviderData,
  upgradeToProvider,
} from "../../redux/slices/authSlice";

// Steps
import StepBasicInfo from "./onboarding/steps/StepBasicInfo";
import StepServices from "./onboarding/steps/StepServices";
import StepAvailability from "./onboarding/steps/StepAvailability";
import StepDocuments from "./onboarding/steps/StepDocuments";
import StepReview from "./onboarding/steps/StepReview";

// Progress
import OnboardingProgress from "../../components/provider/OnboardingProgress";

const steps = [
  "Basic Info",
  "Services",
  "Availability",
  "Documents",
  "Review",
];

export default function ProviderOnboarding() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const onboarding = useSelector((state) => state.auth.providerOnboarding);

  // Current step (Redux + local state)
  const [step, setStepLocal] = useState(onboarding.step ?? 0);

  // Local form data (safe for File objects)
  const [formData, setFormDataLocal] = useState(onboarding.data ?? {
    basicInfo: {},
    services: [],
    availability: {},
    documents: [], // files live here only
  });

  /* =========================
     Guards & Initialization
  ========================= */
  useEffect(() => {
    if (!user) {
      navigate("/auth/login");
      return;
    }

    // Already approved provider
    if (user.role === "provider" && onboarding.status === "approved") {
      navigate("/provider/dashboard");
      return;
    }

    // First-time onboarding
    if (onboarding.status === "not_started") {
      dispatch(setProviderStep(0));
      dispatch(setProviderData({})); // clears metadata
      setStepLocal(0);
      setFormDataLocal({
        basicInfo: {},
        services: [],
        availability: {},
        documents: [],
      });
    }
  }, [user, onboarding.status, dispatch, navigate]);

  /* =========================
     Navigation Handlers
  ========================= */
  const next = () => {
    const nextStep = Math.min(step + 1, steps.length - 1);
    setStepLocal(nextStep);
    dispatch(setProviderStep(nextStep));
  };

  const back = () => {
    const prevStep = Math.max(step - 1, 0);
    setStepLocal(prevStep);
    dispatch(setProviderStep(prevStep));
  };

  /* =========================
     Update Local Data
  ========================= */
  const update = (section, data) => {
    const updated = { ...formData, [section]: data };
    setFormDataLocal(updated);

    // Only store metadata in Redux (safe for serialization)
    const metadata = { ...updated, documents: updated.documents.map(f => ({ name: f.name, size: f.size, type: f.type })) };
    dispatch(setProviderData(metadata));
  };

  /* =========================
     Finish Onboarding
  ========================= */
  const finishOnboarding = async () => {
    // send actual FormData to backend later
    await dispatch(upgradeToProvider());
    navigate("/provider/dashboard");
  };

  /* =========================
     Render Current Step
  ========================= */
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
        return <StepReview data={formData} back={back} submit={finishOnboarding} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-24 p-6">
      <OnboardingProgress steps={steps} current={step} />
      <div className="mt-6 bg-white border border-gray-300 rounded-xl shadow p-6">
        {renderStep()}
      </div>
    </div>
  );
}
