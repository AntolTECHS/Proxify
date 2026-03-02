import { useState, useEffect, useRef } from "react";
import {
  FaCheck,
  FaTimes,
  FaCamera,
  FaTrash,
  FaUniversity,
  FaFileAlt,
  FaUser,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { GoogleMap, useLoadScript } from "@react-google-maps/api";

/* ========================================================= */
export default function ProviderSettings() {
  const [editing, setEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [profile, setProfile] = useState({
    name: "John Provider",
    phone: "123-456-7890",
    company: "John Home Services",
    category: "Plumbing",
    experience: "5",
    location: "City, State",
    bio: "Experienced professional in home services.",
    photoPreview: null,
    lat: 37.7749,
    lng: -122.4194,
  });

  const [bank, setBank] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    country: "",
  });

  const [certifications, setCertifications] = useState([]);

  const handleSave = () => {
    setEditing(false);
    setSuccessMsg("Settings updated successfully!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 px-4 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* HEADER */}
        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
            Provider Settings
          </h1>
          <p className="text-slate-600 text-sm">
            Manage your public profile, service area, and payout details
          </p>
        </header>

        {successMsg && (
          <div className="rounded-lg border-l-4 border-green-500 bg-green-100 p-4 text-green-700">
            {successMsg}
          </div>
        )}

        {/* PROFILE */}
        <Section title="Profile Information" icon={<FaUser />}>
          <div className="col-span-full flex flex-col sm:flex-row gap-6">
            <div className="relative mx-auto sm:mx-0 shrink-0">
              <img
                src={
                  profile.photoPreview ||
                  "https://ui-avatars.com/api/?name=Provider&background=0ea5e9&color=fff"
                }
                className="w-28 h-28 rounded-full border shadow object-cover"
              />
              {editing && (
                <label className="absolute bottom-0 right-0 bg-sky-500 p-2 rounded-full text-white cursor-pointer shadow">
                  <FaCamera size={14} />
                  <input
                    type="file"
                    hidden
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        photoPreview: URL.createObjectURL(e.target.files[0]),
                      })
                    }
                  />
                </label>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
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

        {/* MAP WITH SEARCH */}
        <Section title="Service Location" icon={<FaMapMarkerAlt />}>
          <div className="col-span-full space-y-3">
            <LocationPicker profile={profile} setProfile={setProfile} editing={editing} />
            <p className="text-xs text-slate-500 text-center sm:text-left">
              Lat: {profile.lat.toFixed(4)} | Lng: {profile.lng.toFixed(4)}
            </p>
          </div>
        </Section>

        {/* BANK */}
        <Section title="Payout Details" icon={<FaUniversity />}>
          <Input
            label="Bank Name"
            value={bank.bankName}
            disabled={!editing}
            onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
          />
          <Input
            label="Account Holder"
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

        {/* CERTIFICATIONS */}
        <Section title="Certifications" icon={<FaFileAlt />}>
          <div className="col-span-full space-y-4">
            {editing && (
              <label className="inline-block w-full sm:w-auto text-center bg-sky-500 text-white px-5 py-2 rounded-lg cursor-pointer shadow">
                Upload Certificates
                <input
                  type="file"
                  multiple
                  hidden
                  onChange={(e) =>
                    setCertifications([...certifications, ...e.target.files])
                  }
                />
              </label>
            )}

            <ul className="space-y-2">
              {certifications.map((file, i) => (
                <li
                  key={i}
                  className="flex justify-between items-center bg-slate-100 p-3 rounded-lg"
                >
                  <span className="text-sm truncate">{file.name}</span>
                  {editing && (
                    <button
                      onClick={() =>
                        setCertifications(certifications.filter((_, x) => x !== i))
                      }
                    >
                      <FaTrash className="text-red-500" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* PUBLIC PROFILE */}
        <Section title="Public Profile Preview" icon={<FaUser />}>
          <div className="col-span-full">
            <PublicProfileCard profile={profile} />
          </div>
        </Section>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="w-full sm:w-auto px-5 py-2 bg-slate-200 rounded-lg flex items-center justify-center gap-2"
              >
                <FaTimes /> Cancel
              </button>
              <button
                onClick={handleSave}
                className="w-full sm:w-auto px-6 py-2 bg-sky-500 text-white rounded-lg flex items-center justify-center gap-2 shadow"
              >
                <FaCheck /> Save Changes
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="w-full sm:w-auto px-6 py-2 bg-sky-500 text-white rounded-lg shadow"
            >
              Edit Settings
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================================================= */
/* LOCATION PICKER WITH SEARCH */
function LocationPicker({ profile, setProfile, editing }) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (!isLoaded || !editing) return;

    // Autocomplete initialization
    if (inputRef.current && !autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ["geometry", "formatted_address"],
      });
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace();
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          setProfile({ ...profile, lat, lng, location: place.formatted_address });
          mapRef.current?.panTo({ lat, lng });
          if (markerRef.current) markerRef.current.setPosition({ lat, lng });
        }
      });
    }

    // Marker initialization
    if (mapRef.current && !markerRef.current) {
      markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
        position: { lat: profile.lat, lng: profile.lng },
        map: mapRef.current,
        draggable: editing,
      });
      markerRef.current.addListener("dragend", (e) => {
        setProfile({ ...profile, lat: e.latLng.lat(), lng: e.latLng.lng() });
      });
    }

    // Update marker when editing toggles
    if (markerRef.current) {
      markerRef.current.setPosition({ lat: profile.lat, lng: profile.lng });
      markerRef.current.setDraggable(editing);
    }
  }, [isLoaded, editing]);

  if (!isLoaded) return <p>Loading map…</p>;
  if (loadError) return <p>Error loading map</p>;

  return (
    <div className="flex flex-col gap-2">
      {editing && (
        <input
          ref={inputRef}
          placeholder="Search address..."
          className="w-full sm:w-80 px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky-400"
        />
      )}
      <div className="rounded-xl overflow-hidden border shadow">
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "280px" }}
          zoom={12}
          center={{ lat: profile.lat, lng: profile.lng }}
          onLoad={(map) => (mapRef.current = map)}
        />
      </div>
    </div>
  );
}

/* ========================================================= */
/* PUBLIC PROFILE CARD */
function PublicProfileCard({ profile }) {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl border bg-white shadow-lg overflow-hidden">
      <div className="h-24 sm:h-32 bg-gradient-to-r from-sky-500 to-sky-600" />

      <div className="px-5 sm:px-6 -mt-12 sm:-mt-14">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <img
            src={
              profile.photoPreview ||
              "https://ui-avatars.com/api/?name=Provider&background=0ea5e9&color=fff"
            }
            className="w-24 h-24 rounded-full border-4 border-white shadow mx-auto sm:mx-0 object-cover"
          />

          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-semibold text-slate-800">{profile.name}</h3>
            <p className="text-slate-600">{profile.category}</p>
            <p className="text-xs text-slate-500">
              {profile.experience}+ years • {profile.location}
            </p>
          </div>

          <button
            disabled
            className="w-full sm:w-auto px-6 py-2 bg-sky-500 text-white rounded-xl opacity-70 cursor-not-allowed"
          >
            Contact
          </button>
        </div>
      </div>

      <div className="px-5 sm:px-6 pb-6 pt-4 text-sm text-slate-600 space-y-3">
        <p className="text-center sm:text-left">{profile.bio}</p>
        <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-500">
          <FaMapMarkerAlt className="text-sky-500 shrink-0" />
          {profile.lat.toFixed(4)}, {profile.lng.toFixed(4)}
        </div>
      </div>
    </div>
  );
}

/* ========================================================= */
/* UI HELPERS */
function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm">
      <div className="px-6 py-4 border-b bg-slate-50 flex items-center gap-3">
        <span className="text-sky-500">{icon}</span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">{children}</div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        {...props}
        className="w-full mt-1 rounded-lg border px-4 py-2.5 disabled:bg-slate-100 focus:ring-2 focus:ring-sky-400"
      />
    </div>
  );
}

function Textarea({ label, ...props }) {
  return (
    <div className="sm:col-span-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <textarea
        {...props}
        rows={4}
        className="w-full mt-1 rounded-lg border px-4 py-2.5 resize-none disabled:bg-slate-100 focus:ring-2 focus:ring-sky-400"
      />
    </div>
  );
}