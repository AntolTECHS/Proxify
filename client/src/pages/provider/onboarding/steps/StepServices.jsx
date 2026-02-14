import { useState } from "react";

export default function StepServices({ next, back, update, data = {} }) {
  // Predefined home services
  const availableServices = [
    "Relocation",
    "Cleaning",
    "Plumbing",
    "Electrical",
    "Painting",
    "Carpentry",
    "Gardening",
    "Other",
  ];

  const [selectedServices, setSelectedServices] = useState(data.services || []);
  const [description, setDescription] = useState(data.servicesDescription || "");

  const handleCheckboxChange = (service) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter((s) => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleNext = () => {
    if (selectedServices.length === 0) {
      alert("Please select at least one service.");
      return;
    }
    if (!description.trim()) {
      alert("Please provide a description for your services.");
      return;
    }

    update({ services: selectedServices, servicesDescription: description });
    next();
  };

  return (
    <div className="max-w-xl mx-auto p-8 bg-white shadow-lg rounded-xl border border-gray-300">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Home Services
      </h2>

      {/* Service checkboxes */}
      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-2">
          Select Your Services
        </label>
        <div className="grid grid-cols-2 gap-3">
          {availableServices.map((service) => (
            <label
              key={service}
              className="flex items-center space-x-2 border border-gray-300 rounded-md px-3 py-2 cursor-pointer hover:bg-gray-50 transition"
            >
              <input
                type="checkbox"
                checked={selectedServices.includes(service)}
                onChange={() => handleCheckboxChange(service)}
                className="form-checkbox h-5 w-5 text-teal-600"
              />
              <span className="text-gray-800">{service}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Service description */}
      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-2">
          Describe Your Services
        </label>
        <textarea
          placeholder="Provide details about your services, specialties, pricing, etc."
          className="w-full border border-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none h-32"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
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
