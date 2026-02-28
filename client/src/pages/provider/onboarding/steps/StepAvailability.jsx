// src/pages/provider/onboarding/steps/StepAvailability.jsx
import { useState, useEffect } from "react";

const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function StepAvailability({ next, back, update, data = {} }) {
  const [availability, setAvailability] = useState(() => {
    const initial = {};
    daysOfWeek.forEach((day) => {
      initial[day] = Array.isArray(data.availability?.[day])
        ? data.availability[day]
        : [];
    });
    return initial;
  });

  const [errors, setErrors] = useState({});

  // Sync state if context data changes (e.g., navigating back)
  useEffect(() => {
    if (data.availability) {
      const updated = {};
      daysOfWeek.forEach((day) => {
        updated[day] = Array.isArray(data.availability[day])
          ? data.availability[day]
          : [];
      });
      setAvailability(updated);
    }
  }, [data.availability]);

  const handleChange = (day, value) => {
    const slots = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setAvailability({ ...availability, [day]: slots });
    if (errors.availability) setErrors({});
  };

  const validate = () => {
    const allEmpty = Object.values(availability).every((slots) => slots.length === 0);
    if (allEmpty) {
      setErrors({ availability: "Please provide at least one available time slot." });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;

    // Update via AuthContext (no Redux)
    update("availability", availability);

    next();
  };

  return (
    <div className="max-w-xl mx-auto p-8 bg-white shadow-lg rounded-xl border border-gray-300">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Availability</h2>

      {daysOfWeek.map((day) => (
        <div key={day} className="mb-4">
          <label className="block text-gray-700 font-medium mb-1">{day}</label>
          <input
            type="text"
            placeholder="e.g., 9am-12pm, 1pm-5pm"
            value={availability[day].join(", ")}
            onChange={(e) => handleChange(day, e.target.value)}
            className="w-full border border-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      ))}

      {errors.availability && (
        <p className="text-red-500 text-sm mb-2">{errors.availability}</p>
      )}

      <div className="mt-6 flex justify-between">
        <button
          onClick={back}
          className="px-5 py-2 border border-gray-400 rounded-md hover:bg-gray-100 transition"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-md transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
