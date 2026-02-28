import { useState, useEffect } from "react";

export default function StepServices({ next, back, update, data = {} }) {
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

  const [selectedServices, setSelectedServices] = useState([]);
  const [otherService, setOtherService] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Initialize selected services
    if (Array.isArray(data.services)) {
      // Extract names for checkbox display
      const names = data.services.map((s) => s.name || "");
      setSelectedServices(names.filter((n) => n !== ""));
    } else {
      setSelectedServices([]);
    }

    setDescription(data.servicesDescription || "");
  }, [data.services, data.servicesDescription]);

  const handleCheckboxChange = (service) => {
    let updated = selectedServices.includes(service)
      ? selectedServices.filter((s) => s !== service)
      : [...selectedServices, service];

    setSelectedServices(updated);

    if (errors.services) setErrors({ ...errors, services: "" });

    // Clear otherService if "Other" is unchecked
    if (service === "Other" && !updated.includes("Other")) setOtherService("");
  };

  const validate = () => {
    const newErrors = {};

    const hasOtherValue = selectedServices.includes("Other") && !otherService.trim();
    if (!selectedServices.length || hasOtherValue) newErrors.services = "Select at least one service and fill 'Other' if selected.";

    if (!description.trim()) newErrors.description = "Provide a description for your services.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;

    // Convert selectedServices to array of objects
    const servicesObjects = selectedServices.map((s) =>
      s === "Other" ? { name: otherService.trim() } : { name: s }
    );

    update("services", {
      services: servicesObjects,
      servicesDescription: description.trim(),
    });

    next();
  };

  return (
    <div className="max-w-xl mx-auto p-8 bg-white shadow-lg rounded-xl border border-gray-300">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Home Services</h2>

      {/* Services Selection */}
      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-2">Select Your Services</label>
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

        {/* Show input if "Other" is selected */}
        {selectedServices.includes("Other") && (
          <div className="mt-2">
            <input
              type="text"
              placeholder="Specify other service"
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={otherService}
              onChange={(e) => setOtherService(e.target.value)}
            />
          </div>
        )}

        {errors.services && <p className="text-red-500 text-sm mt-1">{errors.services}</p>}
      </div>

      {/* Services Description */}
      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-2">Describe Your Services</label>
        <textarea
          placeholder="Provide details about your services, specialties, pricing, etc."
          className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none h-32 ${
            errors.description ? "border-red-500" : "border-gray-400"
          }`}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (errors.description) setErrors({ ...errors, description: "" });
          }}
        />
        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
      </div>

      {/* Navigation */}
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