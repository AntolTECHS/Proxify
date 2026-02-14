import { useState } from "react";

export default function StepBasicInfo({ next, update, data = {} }) {
  const [providerName, setProviderName] = useState(data.providerName || "");
  const [email, setEmail] = useState(data.email || "");
  const [phone, setPhone] = useState(data.phone || "");
  const [location, setLocation] = useState(data.location || "");
  const [businessName, setBusinessName] = useState(data.businessName || "");
  const [bio, setBio] = useState(data.bio || "");

  const handleNext = () => {
    if (
      !providerName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !location.trim() ||
      !businessName.trim() ||
      !bio.trim()
    ) {
      alert("Please fill out all fields before continuing.");
      return;
    }

    // Save all data to Redux
    update({ providerName, email, phone, location, businessName, bio });
    next();
  };

  return (
    <div className="max-w-xl mx-auto p-8 bg-white shadow-lg rounded-xl border border-gray-300">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Basic Information
      </h2>

      <div className="space-y-4">
        <input
          type="text"
          placeholder="Provider Name"
          className="input w-full border border-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={providerName}
          onChange={(e) => setProviderName(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          className="input w-full border border-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="tel"
          placeholder="Phone Number"
          className="input w-full border border-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          type="text"
          placeholder="Location"
          className="input w-full border border-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <input
          type="text"
          placeholder="Business Name"
          className="input w-full border border-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
        />

        <textarea
          placeholder="About You / Business"
          className="input w-full h-28 border border-gray-400 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
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
