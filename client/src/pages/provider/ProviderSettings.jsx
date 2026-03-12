import { useState, useEffect } from "react";
import { FaUser, FaMapMarkerAlt, FaSearch, FaCamera, FaFileAlt } from "react-icons/fa";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

/* Leaflet marker fix */
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/* ================= RE-CENTER MAP ================= */
function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], 15);
  }, [lat, lng]);
  return null;
}

/* ================= MAIN COMPONENT ================= */
export default function ProviderSettings() {
  const [editing, setEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [profile, setProfile] = useState({
    basicInfo: {
      providerName: "",
      email: "",
      phone: "",
      businessName: "",
      bio: "",
      location: "",
      photoURL: "",
      photoFile: null,
    },
    lat: 0,
    lng: 0,
    services: [],
    documents: [],
  });

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found");

      const res = await fetch("http://localhost:5000/api/providers/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch profile");

      const data = await res.json();

      const docs = data.documents?.map((d) => ({ ...d, file: null })) || [];

      setProfile({
        ...data,
        documents: docs,
        basicInfo: { ...data.basicInfo, photoFile: null },
      });
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load profile");
    }
  };

  /* ================= SAVE PROFILE ================= */
  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      formData.append("basicInfo", JSON.stringify({
        ...profile.basicInfo,
        photoURL: profile.basicInfo.photoURL, // Cloudinary URL (if unchanged)
      }));

      formData.append("lat", profile.lat);
      formData.append("lng", profile.lng);
      formData.append("services", JSON.stringify(profile.services));

      // Add new photo if selected
      if (profile.basicInfo.photoFile) {
        formData.append("photo", profile.basicInfo.photoFile);
      }

      // Add new documents
      profile.documents.filter(d => d.file).forEach(doc => formData.append("files", doc.file));

      const res = await fetch("http://localhost:5000/api/providers/update", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update profile");
      }

      const updated = await res.json();

      const docs = updated.documents?.map(d => ({ ...d, file: null })) || [];

      setProfile({
        ...updated,
        documents: docs,
        basicInfo: { ...updated.basicInfo, photoFile: null },
      });

      setEditing(false);
      setSuccessMsg("Settings updated successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to update profile");
    }
  };

  /* ================= SEARCH LOCATION ================= */
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const res = await fetch(`http://localhost:5000/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.length > 0) {
        const place = data[0];
        setProfile(prev => ({
          ...prev,
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon),
          basicInfo: { ...prev.basicInfo, location: place.display_name },
        }));
      } else {
        setErrorMsg("Place not found");
        setTimeout(() => setErrorMsg(""), 3000);
      }
    } catch {
      setErrorMsg("Search failed");
    }
  };

  /* ================= HANDLE DOCUMENT UPLOAD ================= */
  const handleDocumentUpload = (e) => {
    const files = Array.from(e.target.files);
    const newDocs = files.map(file => ({
      file,
      name: file.name,
      path: URL.createObjectURL(file),
    }));
    setProfile(prev => ({ ...prev, documents: [...prev.documents, ...newDocs] }));
  };

  const removeDocument = (idx) => {
    setProfile(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* HEADER */}
        <header>
          <h1 className="text-3xl font-bold text-slate-800">Provider Settings</h1>
          <p className="text-slate-600 text-sm">
            Manage your public profile, services, location, photo, and documents
          </p>
        </header>

        {/* MESSAGES */}
        {successMsg && <div className="bg-green-100 text-green-700 p-4 rounded-lg">{successMsg}</div>}
        {errorMsg && <div className="bg-red-100 text-red-700 p-4 rounded-lg">{errorMsg}</div>}

        {/* ================= BASIC INFO ================= */}
        <Section title="Basic Information" icon={<FaUser />}>
          <div className="grid md:grid-cols-2 gap-6">
            {/* PHOTO */}
            <div className="col-span-full flex items-center gap-6">
              <div className="w-24 h-24 rounded-full overflow-hidden border bg-slate-100">
                {profile.basicInfo.photoURL ? (
                  <img src={profile.basicInfo.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400"><FaCamera size={28} /></div>
                )}
              </div>
              {editing && (
                <label className="cursor-pointer bg-sky-500 text-white px-4 py-2 rounded-lg text-sm">
                  Upload Photo
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const preview = URL.createObjectURL(file);
                      setProfile(prev => ({
                        ...prev,
                        basicInfo: { ...prev.basicInfo, photoFile: file, photoURL: preview },
                      }));
                    }}
                  />
                </label>
              )}
            </div>

            {/* TEXT FIELDS */}
            {["providerName","businessName","email","phone"].map(field => (
              <InputField
                key={field}
                label={field.replace(/([A-Z])/g, ' $1')}
                value={profile.basicInfo[field]}
                disabled={!editing}
                onChange={val => setProfile(prev => ({
                  ...prev,
                  basicInfo: { ...prev.basicInfo, [field]: val }
                }))}
              />
            ))}

            {/* BIO */}
            <div className="col-span-full">
              <label className="block text-sm font-medium mb-1">Bio</label>
              <textarea
                rows="4"
                disabled={!editing}
                value={profile.basicInfo.bio}
                onChange={e => setProfile(prev => ({
                  ...prev,
                  basicInfo: { ...prev.basicInfo, bio: e.target.value }
                }))}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            {/* DOCUMENTS */}
            <div className="col-span-full">
              <label className="block text-sm font-medium mb-1">Documents</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {profile.documents.map((doc, idx) => (
                  <div key={idx} className="bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                    <FaFileAlt /> <span>{doc.name}</span>
                    {editing && <button onClick={() => removeDocument(idx)} className="text-red-500 ml-1">x</button>}
                  </div>
                ))}
              </div>
              {editing && <input type="file" multiple onChange={handleDocumentUpload} />}
            </div>
          </div>
        </Section>

        {/* SERVICES */}
        <Section title="Services Offered" icon={<FaFileAlt />}>
          {profile.services.map((service, idx) => (
            <div key={idx} className="grid md:grid-cols-3 gap-4 items-end mb-2">
              {["name","price","description"].map(field => (
                <InputField
                  key={field}
                  label={field.charAt(0).toUpperCase() + field.slice(1)}
                  value={service[field] || ""}
                  disabled={!editing}
                  onChange={val => {
                    const updated = [...profile.services];
                    updated[idx][field] = field === "price" ? Number(val) : val;
                    setProfile(prev => ({ ...prev, services: updated }));
                  }}
                />
              ))}
              {editing && (
                <button onClick={() => {
                  const updated = profile.services.filter((_, i) => i !== idx);
                  setProfile(prev => ({ ...prev, services: updated }));
                }} className="px-3 py-1 mt-2 bg-red-500 text-white rounded-lg text-sm">Remove</button>
              )}
            </div>
          ))}
          {editing && (
            <button onClick={() => setProfile(prev => ({
              ...prev,
              services: [...prev.services, { name: "", price: 0, description: "" }]
            }))} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm">Add New Service</button>
          )}
        </Section>

        {/* LOCATION */}
        <Section title="Service Location" icon={<FaMapMarkerAlt />}>
          {editing && (
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Search location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg"
              />
              <button type="submit" className="px-4 py-2 bg-sky-500 text-white rounded-lg flex items-center gap-2">
                <FaSearch /> Search
              </button>
            </form>
          )}
          <LeafletMap profile={profile} setProfile={setProfile} editing={editing} />
          <p className="text-xs text-slate-500 mt-2">
            Lat: {profile.lat?.toFixed(5) || "0.00000"} | Lng: {profile.lng?.toFixed(5) || "0.00000"}
          </p>
        </Section>

        {/* PUBLIC PROFILE PREVIEW */}
        <Section title="Public Profile Preview" icon={<FaUser />}>
          <PublicProfileCard profile={profile} />
        </Section>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end gap-3">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="px-5 py-2 bg-gray-200 rounded-lg">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 bg-sky-500 text-white rounded-lg">Save</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="px-6 py-2 bg-sky-500 text-white rounded-lg">Edit Settings</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= INPUT FIELD ================= */
function InputField({ label, value, onChange, disabled }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type="text"
        disabled={disabled}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg"
      />
    </div>
  );
}

/* ================= MAP COMPONENT ================= */
function LeafletMap({ profile, setProfile, editing }) {
  function ClickHandler() {
    useMapEvents({
      click(e) {
        if (!editing) return;
        setProfile(prev => ({ ...prev, lat: e.latlng.lat, lng: e.latlng.lng }));
      }
    });
    return null;
  }

  return (
    <div className="w-full h-[320px] rounded-xl overflow-hidden border">
      <MapContainer center={[profile.lat || 0, profile.lng || 0]} zoom={15} className="w-full h-full">
        <TileLayer url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png" />
        <RecenterMap lat={profile.lat} lng={profile.lng} />
        {profile.lat && profile.lng && <Marker draggable={editing} position={[profile.lat, profile.lng]}
          eventHandlers={{
            dragend: (e) => {
              const { lat, lng } = e.target.getLatLng();
              setProfile(prev => ({ ...prev, lat, lng }));
            }
          }}
        />}
        <ClickHandler />
      </MapContainer>
    </div>
  );
}

/* ================= PUBLIC PROFILE CARD ================= */
function PublicProfileCard({ profile }) {
  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-6">
      <div className="flex items-center gap-6">
        <div className="w-24 h-24 rounded-full overflow-hidden border bg-slate-100">
          {profile.basicInfo.photoURL ? (
            <img src={profile.basicInfo.photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400"><FaCamera size={28} /></div>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-bold">{profile.basicInfo.providerName || "Provider Name"}</h2>
          <p className="text-slate-600">{profile.basicInfo.businessName}</p>
          <p className="text-sm text-slate-500">{profile.basicInfo.email}</p>
          <p className="text-sm text-slate-500">{profile.basicInfo.phone}</p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">About</h3>
        <p className="text-sm text-slate-600">{profile.basicInfo.bio || "No bio provided."}</p>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Service Location</h3>
        <p className="text-sm text-slate-600 mb-2">{profile.basicInfo.location || "Location not specified"}</p>
        {profile.lat && profile.lng && (
          <div className="h-56 rounded-lg overflow-hidden border">
            <MapContainer center={[profile.lat, profile.lng]} zoom={15} className="w-full h-full" scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png" />
              <RecenterMap lat={profile.lat} lng={profile.lng} />
              <Marker position={[profile.lat, profile.lng]} />
            </MapContainer>
          </div>
        )}
      </div>

      {profile.documents.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Documents</h3>
          <div className="flex flex-wrap gap-2">
            {profile.documents.map((doc, idx) => (
              <div key={idx} className="bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                <FaFileAlt /> <span>{doc.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= SECTION COMPONENT ================= */
function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2 text-sky-600 font-semibold">{icon}{title}</div>
      {children}
    </div>
  );
}