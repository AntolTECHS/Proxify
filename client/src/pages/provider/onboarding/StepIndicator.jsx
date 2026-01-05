export default function StepIndicator({ step }) {
  return (
    <div className="flex gap-2 mb-8">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={`h-2 flex-1 rounded ${
            step >= n ? "bg-teal-600" : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}
