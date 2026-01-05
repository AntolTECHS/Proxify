const STEP_LABELS = ["Account", "Services", "Profile", "Review"];

export default function StepIndicator({ step }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, index) => {
          const stepNum = index + 1;
          const filled = step >= stepNum;

          return (
            <div key={label} className="flex-1 flex flex-col items-center">
              {/* Pill / Indicator */}
              <div
                className={`w-full h-2 rounded-full transition-colors duration-300 ${
                  filled ? "bg-teal-600" : "bg-gray-200"
                }`}
              />
              {/* Step Label */}
              <span className="text-xs text-gray-500 mt-1">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
