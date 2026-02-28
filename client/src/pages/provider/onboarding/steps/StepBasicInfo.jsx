import { useState, useEffect } from "react";

export default function StepBasicInfo({ next, update, data = {} }) {
  const [providerName, setProviderName] = useState(data.basicInfo?.providerName || "");
  const [email, setEmail] = useState(data.basicInfo?.email || "");
  const [phone, setPhone] = useState(data.basicInfo?.phone || "");
  const [location, setLocation] = useState(data.basicInfo?.location || "");
  const [businessName, setBusinessName] = useState(data.basicInfo?.businessName || "");
  const [bio, setBio] = useState(data.basicInfo?.bio || "");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setProviderName(data.basicInfo?.providerName || "");
    setEmail(data.basicInfo?.email || "");
    setPhone(data.basicInfo?.phone || "");
    setLocation(data.basicInfo?.location || "");
    setBusinessName(data.basicInfo?.businessName || "");
    setBio(data.basicInfo?.bio || "");
  }, [data.basicInfo]);

  const validate = () => {
    const newErrors = {};
    if (!providerName.trim()) newErrors.providerName = "Provider Name is required.";
    if (!email.trim()) newErrors.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Email is invalid.";
    if (!phone.trim()) newErrors.phone = "Phone is required.";
    else if (!/^\d+$/.test(phone.trim())) newErrors.phone = "Phone must contain only numbers.";
    if (!location.trim()) newErrors.location = "Location is required.";
    if (!businessName.trim()) newErrors.businessName = "Business Name is required.";
    if (!bio.trim()) newErrors.bio = "Bio is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    update("basicInfo", { providerName, email, phone, location, businessName, bio });
    next();
  };

  return (
    <div className="max-w-xl mx-auto p-8 bg-white shadow-lg rounded-xl border border-gray-300">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Basic Information
      </h2>

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

        <div>
          <label className="block text-gray-700 font-medium mb-1">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              if (errors.location) setErrors({ ...errors, location: "" });
            }}
            className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              errors.location ? "border-red-500" : "border-gray-400"
            }`}
          />
          {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Business Name</label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => {
              setBusinessName(e.target.value);
              if (errors.businessName) setErrors({ ...errors, businessName: "" });
            }}
            className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              errors.businessName ? "border-red-500" : "border-gray-400"
            }`}
          />
          {errors.businessName && <p className="text-red-500 text-sm mt-1">{errors.businessName}</p>}
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">About / Bio</label>
          <textarea
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              if (errors.bio) setErrors({ ...errors, bio: "" });
            }}
            className={`w-full border rounded-md px-4 py-2 h-28 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
              errors.bio ? "border-red-500" : "border-gray-400"
            }`}
          />
          {errors.bio && <p className="text-red-500 text-sm mt-1">{errors.bio}</p>}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
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