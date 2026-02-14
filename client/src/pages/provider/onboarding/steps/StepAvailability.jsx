import { useState } from "react";

export default function StepAvailability({ next, back, update, data = {} }) {
  const [availability, setAvailability] = useState(data.availability || "");

  const handleNext = () => {
    if (!availability.trim()) {
      alert("Please provide your availability.");
      return;
    }
    update({ availability }); // save to Redux
    next(); // go to next step
  };

  return (
    <div className="max-w-xl mx-auto p-8 bg-white shadow-lg rounded-xl border border-gray-300">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Availability
      </h2>

      <label className="block text-gray-700 font-medium mb-2">
        Your Available Hours / Days
      </label>
      <textarea
        placeholder="E.g., Mon-Fri: 9am - 6pm, Sat: 10am - 4pm"
        className="w-full border border-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none h-32"
        value={availability}
        onChange={(e) => setAvailability(e.target.value)}
      />

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
