import { useState } from "react";
import { useNavigate } from "react-router-dom";

import StepIndicator from "./onboarding/StepIndicator";
import AccountStep from "./onboarding/AccountStep";
import ServicesStep from "./onboarding/ServicesStep";
import ProfileStep from "./onboarding/ProfileStep";
import ReviewStep from "./onboarding/ReviewStep";

export default function ProviderOnboarding({ user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    services: [],
    experience: "",
    bio: "",
    location: "",
    availability: "",
  });

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const submit = async () => {
    // replace with real API call
    await fetch("/api/providers/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    navigate("/provider/dashboard");
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-bold text-teal-600 mb-6">
        Become a Service Provider
      </h1>

      <StepIndicator step={step} />

      {step === 1 && !user && (
        <AccountStep form={form} setForm={setForm} next={next} />
      )}

      {step === 2 && (
        <ServicesStep form={form} setForm={setForm} next={next} back={back} />
      )}

      {step === 3 && (
        <ProfileStep form={form} setForm={setForm} next={next} back={back} />
      )}

      {step === 4 && (
        <ReviewStep form={form} back={back} submit={submit} />
      )}
    </div>
  );
}
