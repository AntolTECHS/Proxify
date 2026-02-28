// src/pages/provider/ProviderSettings.jsx
import { useState } from "react";
import { FaCheck, FaTimes } from "react-icons/fa";

export default function ProviderSettings() {
  const [profile, setProfile] = useState({
    name: "John Provider",
    email: "provider@example.com",
    phone: "123-456-7890",
    location: "City, State",
    bio: "Experienced professional in home services.",
  });

  const [editing, setEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    // Placeholder: in real app, submit to API
    setEditing(false);
    setSuccessMsg("Profile updated successfully!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  return (
    <div className="w-full min-h-screen bg-gray-100 p-4 md:p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Settings</h1>

      <div className="max-w-2xl bg-white p-6 rounded-lg shadow-md border border-gray-200">
        {successMsg && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 border-l-4 border-green-500 rounded">
            {successMsg}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={profile.name}
              disabled={!editing}
              onChange={handleChange}
              className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                editing ? "border-gray-400" : "border-gray-200 bg-gray-100"
              }`}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={profile.email}
              disabled
              className="w-full border border-gray-200 bg-gray-100 rounded-md px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Phone</label>
            <input
              type="text"
              name="phone"
              value={profile.phone}
              disabled={!editing}
              onChange={handleChange}
              className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                editing ? "border-gray-400" : "border-gray-200 bg-gray-100"
              }`}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Location</label>
            <input
              type="text"
              name="location"
              value={profile.location}
              disabled={!editing}
              onChange={handleChange}
              className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                editing ? "border-gray-400" : "border-gray-200 bg-gray-100"
              }`}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">Bio</label>
            <textarea
              name="bio"
              value={profile.bio}
              disabled={!editing}
              onChange={handleChange}
              className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none h-24 ${
                editing ? "border-gray-400" : "border-gray-200 bg-gray-100"
              }`}
            />
          </div>
        </div>

        <div className="flex justify-end mt-6 space-x-3">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition flex items-center gap-2"
              >
                <FaTimes /> Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md transition flex items-center gap-2"
              >
                <FaCheck /> Save
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md transition flex items-center gap-2"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}