// src/pages/provider/onboarding/steps/StepReview.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function StepReview({ data, back, submit, isLoading, error }) {
  const navigate = useNavigate();
  const [localError, setLocalError] = useState(null);

  const { basicInfo = {}, services = [], servicesDescription = "", availability = {}, documents = [], documentsText = "" } = data;

  const renderAvailability = () => {
    if (!availability || Object.keys(availability).length === 0)
      return <p className="text-gray-600">No availability set.</p>;

    return (
      <ul className="space-y-1 text-gray-700">
        {Object.entries(availability).map(([day, slots], idx) => (
          <li key={idx}>
            <strong>{day}:</strong> {Array.isArray(slots) && slots.length > 0 ? slots.join(", ") : "Not available"}
          </li>
        ))}
      </ul>
    );
  };

  const renderDocuments = () => {
    const hasFiles = documents && documents.length > 0;
    const hasText = documentsText && documentsText.trim() !== "";
    if (!hasFiles && !hasText) return <p className="text-gray-600">No documents uploaded.</p>;

    return (
      <ul className="list-disc list-inside space-y-1 text-gray-700">
        {hasFiles && documents.map((doc, idx) => <li key={idx}>{doc.file?.name || doc.name || "Unnamed Document"}</li>)}
        {hasText && <li><strong>Notes:</strong> {documentsText}</li>}
      </ul>
    );
  };

  const handleSubmit = async () => {
    setLocalError(null);

    try {
      const result = await submit(); // submit is the prop passed from ProviderOnboarding

      if (result?.success) {
        // Onboarding successful, navigate to provider dashboard
        navigate("/provider/dashboard", { replace: true });
      } else if (result?.error?.message.includes("Token invalid")) {
        alert("Session expired. Please log in again.");
        navigate("/login", { replace: true });
      } else {
        setLocalError(result?.error?.message || "Failed to submit onboarding.");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setLocalError(err?.message || "Unexpected error occurred.");
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Review Your Details</h2>

      {/* Basic Info */}
      <section className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold mb-3">Basic Info</h3>
        {Object.keys(basicInfo).length === 0 ? (
          <p className="text-gray-600">No basic info provided.</p>
        ) : (
          <>
            <p><strong>Provider Name:</strong> {basicInfo.providerName || "-"}</p>
            <p><strong>Email:</strong> {basicInfo.email || "-"}</p>
            <p><strong>Phone:</strong> {basicInfo.phone || "-"}</p>
            <p><strong>Location:</strong> {basicInfo.location || "-"}</p>
            <p><strong>Business Name:</strong> {basicInfo.businessName || "-"}</p>
            <p><strong>About / Bio:</strong> {basicInfo.bio || "-"}</p>
          </>
        )}
      </section>

      {/* Services */}
      <section className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold mb-3">Services Offered</h3>
        {services.length > 0 ? (
          <ul className="list-disc list-inside text-gray-700">
            {services.map((s, idx) => <li key={idx}>{typeof s === "object" ? s.name || "-" : s} {s.price ? `- $${s.price}` : ""}</li>)}
          </ul>
        ) : <p className="text-gray-600">No services added.</p>}
        {servicesDescription && <p className="mt-2 text-gray-600"><strong>Service Details:</strong> {servicesDescription}</p>}
      </section>

      {/* Availability */}
      <section className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold mb-3">Availability</h3>
        {renderAvailability()}
      </section>

      {/* Documents */}
      <section className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold mb-3">Documents</h3>
        {renderDocuments()}
      </section>

      {/* Errors */}
      {(localError || error) && (
        <div className="mb-4 text-red-600 font-medium text-center">
          {localError || (error?.message || error)}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button onClick={back} disabled={isLoading} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition">
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md transition flex items-center justify-center"
        >
          {isLoading && (
            <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          )}
          {isLoading ? "Submitting..." : "Submit & Finish"}
        </button>
      </div>
    </div>
  );
}