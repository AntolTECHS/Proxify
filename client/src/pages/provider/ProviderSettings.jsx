// src/pages/provider/ProviderSettings.jsx
import { useState } from "react";
import {
  FaCheck,
  FaTimes,
  FaCamera,
  FaTrash,
  FaUniversity,
  FaFileAlt,
  FaUser,
} from "react-icons/fa";
import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api";

export default function ProviderSettings() {
  const [editing, setEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [profile, setProfile] = useState({
    name: "John Provider",
    email: "provider@example.com",
    phone: "123-456-7890",
    company: "John Home Services",
    category: "Plumbing",
    experience: "5",
    location: "City, State",
    bio: "Experienced professional in home services.",
    photoPreview: null,
    lat: 37.7749, // default latitude
    lng: -122.4194, // default longitude
  });

  const [bank, setBank] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    country: "",
  });

  const [certifications, setCertifications] = useState([]);

  /* ---------- HANDLERS ---------- */
  const handleSave = () => {
    setEditing(false);
    setSuccessMsg("Settings updated successfully!");
    setTimeout(() => setSuccessMsg(""), 3000);

    console.log({ profile, bank, certifications });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProfile({ ...profile, photoPreview: URL.createObjectURL(file) });
  };

  const handleCertUpload = (e) => {
    const files = Array.from(e.target.files);
    setCertifications([...certifications, ...files]);
  };

  const removeCert = (index) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  /* ---------- UI ---------- */
  return (
    <div className="w-full min-h-screen bg-gray-100 p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-6">Provider Settings</h1>

      {successMsg && (
        <div className="mb-6 p-3 bg-green-100 text-green-700 border-l-4 border-green-500 rounded">
          {successMsg}
        </div>
      )}

      {/* ================= PROFILE ================= */}
      <Section title="Profile" icon={<FaUser />}>
        <div className="flex items-center gap-6 mb-4 md:col-span-2">
          <div className="relative">
            <img
              src={
                profile.photoPreview ||
                "https://ui-avatars.com/api/?name=Provider&background=0ea5e9&color=fff"
              }
              className="w-24 h-24 rounded-full object-cover border"
            />
            {editing && (
              <label className="absolute bottom-0 right-0 bg-sky-500 p-2 rounded-full text-white cursor-pointer">
                <FaCamera size={14} />
                <input type="file" hidden onChange={handlePhotoChange} />
              </label>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <Input
              label="Full Name"
              value={profile.name}
              disabled={!editing}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
            <Input
              label="Phone"
              value={profile.phone}
              disabled={!editing}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
            <Input
              label="Company"
              value={profile.company}
              disabled={!editing}
              onChange={(e) => setProfile({ ...profile, company: e.target.value })}
            />
            <Input
              label="Category"
              value={profile.category}
              disabled={!editing}
              onChange={(e) => setProfile({ ...profile, category: e.target.value })}
            />
            <Input
              label="Experience (years)"
              value={profile.experience}
              disabled={!editing}
              onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
            />
            <Input
              label="Location Description"
              value={profile.location}
              disabled={!editing}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
            />
            <Textarea
              label="Bio"
              value={profile.bio}
              disabled={!editing}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            />
          </div>
        </div>
      </Section>

      {/* ================= GOOGLE MAP LOCATION ================= */}
      <Section title="Service Location (Google Maps)" icon={<FaUser />}>
        <div className="md:col-span-2">
          <p className="text-sm text-gray-600 mb-2">
            Click on the map to set your service location. Customers will see this location.
          </p>
          <LocationPicker profile={profile} setProfile={setProfile} editing={editing} />
          <p className="mt-2 text-xs text-gray-500">
            Lat: {profile.lat.toFixed(4)}, Lng: {profile.lng.toFixed(4)}
          </p>
        </div>
      </Section>

      {/* ================= PAYOUT / BANK DETAILS ================= */}
      <Section title="Payout / Bank Details" icon={<FaUniversity />}>
        <Input
          label="Bank Name"
          value={bank.bankName}
          disabled={!editing}
          onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
        />
        <Input
          label="Account Holder Name"
          value={bank.accountName}
          disabled={!editing}
          onChange={(e) => setBank({ ...bank, accountName: e.target.value })}
        />
        <Input
          label="Account Number"
          value={bank.accountNumber}
          disabled={!editing}
          onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })}
        />
        <Input
          label="Country"
          value={bank.country}
          disabled={!editing}
          onChange={(e) => setBank({ ...bank, country: e.target.value })}
        />
      </Section>

      {/* ================= CERTIFICATIONS ================= */}
      <Section title="Certifications" icon={<FaFileAlt />}>
        {editing && (
          <label className="inline-block mb-3 bg-sky-500 text-white px-4 py-2 rounded cursor-pointer">
            Upload Certificates
            <input type="file" multiple hidden onChange={handleCertUpload} />
          </label>
        )}
        <ul className="space-y-2 md:col-span-2">
          {certifications.map((file, index) => (
            <li
              key={index}
              className="flex justify-between items-center bg-gray-100 p-3 rounded"
            >
              <span>{file.name}</span>
              {editing && (
                <button onClick={() => removeCert(index)}>
                  <FaTrash className="text-red-500" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {/* ================= PUBLIC PROFILE PREVIEW ================= */}
      <Section title="Public Profile Preview" icon={<FaUser />}>
        <div className="border rounded-lg p-4 bg-gray-50 md:col-span-2">
          <div className="flex items-center gap-4">
            <img
              src={
                profile.photoPreview ||
                "https://ui-avatars.com/api/?name=Provider&background=0ea5e9&color=fff"
              }
              className="w-16 h-16 rounded-full"
            />
            <div>
              <h3 className="font-semibold">{profile.name}</h3>
              <p className="text-sm text-gray-600">{profile.category}</p>
              <p className="text-xs text-gray-500">
                {profile.experience}+ years • {profile.location}
              </p>
            </div>
          </div>
          <p className="mt-3 text-gray-700 text-sm">{profile.bio}</p>
        </div>
      </Section>

      {/* ================= ACTIONS ================= */}
      <div className="flex justify-end gap-3 mt-8">
        {editing ? (
          <>
            <button
              onClick={() => setEditing(false)}
              className="px-5 py-2 bg-gray-200 rounded flex items-center gap-2"
            >
              <FaTimes /> Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-sky-500 text-white rounded flex items-center gap-2"
            >
              <FaCheck /> Save Changes
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="px-5 py-2 bg-sky-500 text-white rounded"
          >
            Edit Settings
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- GOOGLE MAPS LOCATION PICKER ---------- */
function LocationPicker({ profile, setProfile, editing }) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY", // Replace with your key
  });

  if (!isLoaded) return <p>Loading Map...</p>;

  const handleMapClick = (e) => {
    if (!editing) return;
    setProfile({ ...profile, lat: e.latLng.lat(), lng: e.latLng.lng() });
  };

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "300px" }}
      zoom={12}
      center={{ lat: profile.lat, lng: profile.lng }}
      onClick={handleMapClick}
    >
      <Marker position={{ lat: profile.lat, lng: profile.lng }} />
    </GoogleMap>
  );
}

/* ---------- REUSABLE UI ---------- */
function Section({ title, icon, children }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        {icon} {title}
      </h2>
      <div className="grid md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        {...props}
        className="w-full border rounded px-4 py-2 disabled:bg-gray-100"
      />
    </div>
  );
}

function Textarea({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <textarea
        {...props}
        className="w-full border rounded px-4 py-2 resize-none disabled:bg-gray-100"
      />
    </div>
  );
}