// src/pages/provider/onboarding/steps/StepBasicInfo.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../../../context/AuthContext.jsx";

export default function StepBasicInfo({ data = {}, update }) {
  const { user, upgradeToProvider } = useAuth();

  const [providerName, setProviderName] = useState(
    data.basicInfo?.providerName || user?.name || ""
  );
  const [email, setEmail] = useState(
    data.basicInfo?.email || user?.email || ""
  );
  const [phone, setPhone] = useState(
    data.basicInfo?.phone || user?.phone || ""
  );
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    setProviderName(data.basicInfo?.providerName || user?.name || "");
    setEmail(data.basicInfo?.email || user?.email || "");
    setPhone(data.basicInfo?.phone || user?.phone || "");
  }, [data.basicInfo, user]);

  const validate = () => {
    const newErrors = {};
    if (!providerName.trim()) newErrors.providerName = "Provider Name is required.";
    if (!email.trim()) newErrors.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Email is invalid.";
    if (!phone.trim()) newErrors.phone = "Phone is required.";
    else if (!/^\d+$/.test(phone.trim())) newErrors.phone = "Phone must contain only numbers.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCompleteOnboarding = async () => {
    if (!validate()) return;

    setLoading(true);
    setApiError("");

    const payload = { basicInfo: { providerName, email, phone } };

    try {
      const result = await upgradeToProvider(payload);

      if (!result.success) {
        setApiError(result.error?.message || "Failed to complete onboarding.");
      } else {
        // update parent form data if needed
        update("basicInfo", { providerName, email, phone });
        // redirect handled inside upgradeToProvider
      }
    } catch (err) {
      setApiError(err?.message || "Unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-8 bg-white shadow-lg rounded-xl border border-gray-300">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Basic Information
      </h2>

      {apiError && <p className="text-red-500 text-center mb-4">{apiError}</p>}

      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 font-medium mb-1">Provider Name</label>
          <input
            type="text"
            value={providerName}
            onChange={(e) => {
              setProviderName(e.target.value);
              if (errors.providerName) setErrors({ ...errors, providerName: "" });
            }}
            className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              errors.providerName ? "border-red-500" : "border-gray-400"
            }`}
          />
          {errors.providerName && <p className="text-red-500 text-sm mt-1">{errors.providerName}</p>}
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({ ...errors, email: "" });
            }}
            className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              errors.email ? "border-red-500" : "border-gray-400"
            }`}
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (errors.phone) setErrors({ ...errors, phone: "" });
            }}
            className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              errors.phone ? "border-red-500" : "border-gray-400"
            }`}
          />
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleCompleteOnboarding}
          disabled={loading}
          className={`bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-md transition ${
            loading ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Processing..." : "Complete Onboarding"}
        </button>
      </div>
    </div>
  );
}