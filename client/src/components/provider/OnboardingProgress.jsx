import React from "react";

export default function OnboardingProgress({ steps, current }) {
  return (
    <div className="mb-8">
      {/* Step labels */}
      <div className="flex justify-between mb-2">
        {steps.map((stepLabel, index) => (
          <div
            key={index}
            className={`text-sm font-medium text-center ${
              index === current
                ? "text-teal-600"
                : index < current
                ? "text-teal-800"
                : "text-gray-400"
            }`}
          >
            {stepLabel}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 h-2 rounded-full">
        <div
          className="bg-teal-600 h-2 rounded-full transition-all duration-300"
          style={{
            width: `${((current + 1) / steps.length) * 100}%`,
          }}
        ></div>
      </div>
    </div>
  );
}
