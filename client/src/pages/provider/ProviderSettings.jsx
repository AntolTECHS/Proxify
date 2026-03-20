// ProviderSettings.jsx
import { useState, useEffect, useRef } from "react";
import { FaUser, FaMapMarkerAlt, FaCamera, FaFileAlt, FaSearch } from "react-icons/fa";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { geocodingClient } from "../../utils/mapboxClient";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ---------------- RecenterMap ----------------
function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], 15);
  }, [lat, lng]);
  return null;
}

// ---------------- ProviderSettings ----------------
export default function ProviderSettings() {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const searchTimeout = useRef(null);

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
    lat: -1.286389, // default Nairobi
    lng: 36.817223,
    services: [],
    documents: [],
    locationGeoJSON: { type: "Point", coordinates: [36.817223, -1.286389] }
  });

  // ---------------- Fetch Profile ----------------
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/providers/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      let lat = data.location?.coordinates?.[1];
      let lng = data.location?.coordinates?.[0];

      // If invalid coordinates, forward geocode the human-readable location
      if (!lat || !lng || (lat === 0 && lng === 0)) {
        if (data.basicInfo?.location) {
          try {
            const geoRes = await geocodingClient
              .forwardGeocode({ query: data.basicInfo.location, limit: 1 })
              .send();
            const feature = geoRes.body.features[0];
            if (feature) {
              lat = feature.center[1];
              lng = feature.center[0];
            }
          } catch {
            lat = -1.286389;
            lng = 36.817223;
          }
        }
      }

      setProfile({
        ...data,
        lat,
        lng,
        locationGeoJSON: { type: "Point", coordinates: [lng, lat] },
        documents: data.documents?.map(d => ({ ...d, file: null })) || [],
        basicInfo: { ...data.basicInfo, photoFile: null },
      });
      setSearchQuery(data.basicInfo.location || "");
    } catch {
      setErrorMsg("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Save Profile ----------------
  const handleSave = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const formData = new FormData();

      formData.append("basicInfo", JSON.stringify(profile.basicInfo));
      formData.append("services", JSON.stringify(profile.services));

      // Save lat/lng as GeoJSON
      formData.append("location", JSON.stringify({
        type: "Point",
        coordinates: [profile.lng, profile.lat]
      }));

      if (profile.basicInfo.photoFile) formData.append("photo", profile.basicInfo.photoFile);
      profile.documents.filter(d => d.file).forEach(doc => formData.append("files", doc.file));

      const res = await fetch("http://localhost:5000/api/providers/update", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const updated = await res.json();
      setProfile({
        ...updated,
        lat: updated.location?.coordinates?.[1] ?? profile.lat,
        lng: updated.location?.coordinates?.[0] ?? profile.lng,
        locationGeoJSON: updated.location ?? profile.locationGeoJSON,
        documents: updated.documents?.map(d => ({ ...d, file: null })) || [],
        basicInfo: { ...updated.basicInfo, photoFile: null },
      });

      setEditing(false);
      setSuccessMsg("Saved successfully");
      setTimeout(() => setSuccessMsg(""), 2500);
    } catch {
      setErrorMsg("Save failed");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Mapbox Autocomplete ----------------
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      if (!value) return setSuggestions([]);

      try {
        const response = await geocodingClient
          .forwardGeocode({
            query: value,
            limit: 10,
            countries: ["ke"],
            types: ["region","place","locality","neighborhood","address"]
          })
          .send();
        setSuggestions(response.body.features);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  };

  const selectSuggestion = (place) => {
    setProfile(prev => ({
      ...prev,
      lat: place.center[1],
      lng: place.center[0],
      locationGeoJSON: { type: "Point", coordinates: [place.center[0], place.center[1]] },
      basicInfo: { ...prev.basicInfo, location: place.place_name }
    }));
    setSearchQuery(place.place_name);
    setSuggestions([]);
  };

  // ---------------- Services ----------------
  const addService = () => setProfile(prev => ({
    ...prev,
    services: [...prev.services, { name: "", price: "", description: "" }]
  }));

  const updateService = (i, field, value) => {
    const updated = [...profile.services];
    updated[i][field] = field === "price" ? (value === "" ? "" : Number(value)) : value;
    setProfile(prev => ({ ...prev, services: updated }));
  };

  // ---------------- Reverse Geocode on Drag ----------------
  const handleMarkerDrag = async (lat, lng) => {
    setProfile(prev => ({
      ...prev,
      lat,
      lng,
      locationGeoJSON: { type: "Point", coordinates: [lng, lat] }
    }));

    try {
      const res = await geocodingClient.reverseGeocode({
        query: [lng, lat],
        limit: 1
      }).send();

      const feature = res.body.features[0];
      if (feature) {
        setProfile(prev => ({
          ...prev,
          basicInfo: { ...prev.basicInfo, location: feature.place_name }
        }));
        setSearchQuery(feature.place_name);
      }
    } catch {
      console.log("Reverse geocoding failed");
    }
  };

  // ---------------- Render ----------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Provider Settings</h1>
          <button
            onClick={() => setEditing(!editing)}
            className="bg-sky-600 text-white px-5 py-2 rounded-lg"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        {successMsg && <div className="bg-green-100 p-3 rounded">{successMsg}</div>}
        {errorMsg && <div className="bg-red-100 p-3 rounded">{errorMsg}</div>}

        {/* Profile */}
        <Section title="Profile" icon={<FaUser />}>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100">
              {profile.basicInfo.photoURL ? (
                <img src={profile.basicInfo.photoURL} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full"><FaCamera /></div>
              )}
            </div>
            {editing && (
              <input type="file" accept="image/*" onChange={e => {
                const file = e.target.files[0];
                if (!file) return;
                setProfile(prev => ({
                  ...prev,
                  basicInfo: {
                    ...prev.basicInfo,
                    photoFile: file,
                    photoURL: URL.createObjectURL(file)
                  }
                }));
              }} />
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {['providerName','businessName','email','phone','location'].map(field => (
              <InputField
                key={field}
                label={field}
                value={profile.basicInfo[field]}
                disabled={!editing}
                onChange={v => setProfile(prev => ({
                  ...prev,
                  basicInfo: { ...prev.basicInfo, [field]: v }
                }))}
              />
            ))}
          </div>

          <textarea
            value={profile.basicInfo.bio}
            disabled={!editing}
            onChange={e => setProfile(prev => ({
              ...prev,
              basicInfo: { ...prev.basicInfo, bio: e.target.value }
            }))}
            className="w-full border p-2 rounded mt-3"
            placeholder="Bio"
          />
        </Section>

        {/* Services */}
        <Section title="Services" icon={<FaFileAlt />}>
          {profile.services.map((s, i) => (
            <div key={i} className="grid md:grid-cols-3 gap-3 mb-3">
              <InputField label="Name" value={s.name} disabled={!editing} onChange={v => updateService(i, "name", v)} />
              <InputField label="Price" value={s.price} disabled={!editing} onChange={v => updateService(i, "price", v)} />
              <InputField label="Description" value={s.description} disabled={!editing} onChange={v => updateService(i, "description", v)} />
            </div>
          ))}
          {editing && <button onClick={addService} className="bg-green-500 text-white px-4 py-2 rounded">Add Service</button>}
        </Section>

        {/* Map */}
        <Section title="Location" icon={<FaMapMarkerAlt />}>
          {editing && (
            <div className="relative mb-3">
              <div className="flex gap-2">
                <input
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  className="border p-2 w-full rounded"
                  placeholder="Search location"
                />
                <button
                  onClick={() => suggestions[0] && selectSuggestion(suggestions[0])}
                  className="bg-sky-500 text-white px-4 py-2 rounded flex items-center gap-1"
                >
                  <FaSearch /> Search
                </button>
              </div>
              {suggestions.length > 0 && (
                <ul className="absolute bg-white border w-full mt-1 max-h-60 overflow-auto z-50 rounded shadow-md">
                  {suggestions.map((place, idx) => (
                    <li
                      key={idx}
                      className="p-2 hover:bg-sky-100 cursor-pointer"
                      onClick={() => selectSuggestion(place)}
                    >
                      {place.place_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="h-80 rounded overflow-hidden">
            <MapContainer center={[profile.lat, profile.lng]} zoom={13} className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png" />
              {profile.lat != null && profile.lng != null && (
                <>
                  <RecenterMap lat={profile.lat} lng={profile.lng} />
                  <Marker
                    position={[profile.lat, profile.lng]}
                    draggable={editing}
                    eventHandlers={{
                      dragend: (e) => {
                        const { lat, lng } = e.target.getLatLng();
                        handleMarkerDrag(lat, lng);
                      }
                    }}
                  />
                </>
              )}
            </MapContainer>
          </div>
        </Section>

        {editing && (
          <div className="text-right">
            <button onClick={handleSave} className="bg-sky-600 text-white px-6 py-2 rounded-lg" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Helper Components ----------------
function InputField({ label, value, onChange, disabled }) {
  return (
    <div>
      <label className="text-sm capitalize">{label}</label>
      <input
        value={value || ""}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        className="w-full border p-2 rounded"
      />
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow space-y-4">
      <div className="flex gap-2 font-semibold text-sky-600">{icon}{title}</div>
      {children}
    </div>
  );
}