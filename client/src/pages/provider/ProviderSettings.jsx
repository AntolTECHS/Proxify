// ProviderSettings.jsx
import { useState, useEffect, useRef } from "react";
import {
  FaUser,
  FaMapMarkerAlt,
  FaCamera,
  FaFileAlt,
  FaSearch,
} from "react-icons/fa";
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

const FALLBACK_LAT = -1.286389;
const FALLBACK_LNG = 36.817223;

// ---------------- RecenterMap ----------------
function RecenterMap({ lat, lng }) {
  const map = useMap();

  useEffect(() => {
    if (lat != null && lng != null) {
      map.setView([lat, lng], 15);
    }
  }, [lat, lng, map]);

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
    lat: FALLBACK_LAT,
    lng: FALLBACK_LNG,
    services: [],
    documents: [],
    locationGeoJSON: { type: "Point", coordinates: [FALLBACK_LNG, FALLBACK_LAT] },
  });

  // ---------------- Fetch Profile ----------------
  useEffect(() => {
    fetchProfile();
    return () => searchTimeout.current && clearTimeout(searchTimeout.current);
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please log in again.");

      const res = await fetch("http://localhost:5000/api/providers/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        throw new Error("Session expired. Please log in again.");
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to load profile");
      }

      const data = await res.json();

      const basicInfo = {
        providerName: data?.basicInfo?.providerName || "",
        email: data?.basicInfo?.email || "",
        phone: data?.basicInfo?.phone || "",
        businessName: data?.basicInfo?.businessName || "",
        bio: data?.basicInfo?.bio || "",
        location: data?.basicInfo?.location || "",
        photoURL: data?.basicInfo?.photoURL || "",
        photoFile: null,
      };

      const services = Array.isArray(data?.services) ? data.services : [];
      const documents = Array.isArray(data?.documents)
        ? data.documents.map((d) => ({ ...d, file: null }))
        : [];

      let lat = data?.location?.coordinates?.[1];
      let lng = data?.location?.coordinates?.[0];

      const validCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

      if (!validCoords && basicInfo.location) {
        try {
          const geoRes = await geocodingClient
            .forwardGeocode({ query: basicInfo.location, limit: 1 })
            .send();
          const feature = geoRes?.body?.features?.[0];
          if (feature?.center?.length === 2) {
            lng = feature.center[0];
            lat = feature.center[1];
          }
        } catch {
          lat = FALLBACK_LAT;
          lng = FALLBACK_LNG;
        }
      }

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        lat = FALLBACK_LAT;
        lng = FALLBACK_LNG;
      }

      setProfile({
        basicInfo,
        lat,
        lng,
        services,
        documents,
        locationGeoJSON: { type: "Point", coordinates: [lng, lat] },
      });

      setSearchQuery(basicInfo.location);
    } catch (err) {
      console.error("FETCH PROFILE ERROR:", err);
      setErrorMsg(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Save Profile ----------------
  const handleSave = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please log in again.");

      const formData = new FormData();
      const { photoFile, ...basicInfo } = profile.basicInfo;

      formData.append("basicInfo", JSON.stringify(basicInfo));
      formData.append("services", JSON.stringify(profile.services || []));
      formData.append("lat", String(profile.lat));
      formData.append("lng", String(profile.lng));

      if (photoFile) formData.append("photo", photoFile);
      (profile.documents || []).filter((d) => d.file).forEach((d) => formData.append("files", d.file));

      const res = await fetch("http://localhost:5000/api/providers/update", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        throw new Error("Session expired. Please log in again.");
      }

      const updated = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(updated.message || "Save failed");

      const updatedLat = updated?.location?.coordinates?.[1];
      const updatedLng = updated?.location?.coordinates?.[0];

      setProfile({
        basicInfo: {
          providerName: updated?.basicInfo?.providerName || "",
          email: updated?.basicInfo?.email || "",
          phone: updated?.basicInfo?.phone || "",
          businessName: updated?.basicInfo?.businessName || "",
          bio: updated?.basicInfo?.bio || "",
          location: updated?.basicInfo?.location || "",
          photoURL: updated?.basicInfo?.photoURL || "",
          photoFile: null,
        },
        lat: Number.isFinite(updatedLat) && !(updatedLat === 0 && updatedLng === 0)
          ? updatedLat
          : profile.lat,
        lng: Number.isFinite(updatedLng) && !(updatedLat === 0 && updatedLng === 0)
          ? updatedLng
          : profile.lng,
        services: Array.isArray(updated?.services) ? updated.services : [],
        documents: Array.isArray(updated?.documents)
          ? updated.documents.map((d) => ({ ...d, file: null }))
          : [],
        locationGeoJSON: updated?.location || profile.locationGeoJSON,
      });

      setEditing(false);
      setSuccessMsg("Saved successfully");
      setTimeout(() => setSuccessMsg(""), 2500);
    } catch (err) {
      console.error("SAVE ERROR:", err);
      setErrorMsg(err.message || "Save failed");
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
        const res = await geocodingClient
          .forwardGeocode({
            query: value,
            limit: 10,
            countries: ["ke"],
            types: ["region", "place", "locality", "neighborhood", "address"],
          })
          .send();
        setSuggestions(res?.body?.features || []);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  };

  const selectSuggestion = (place) => {
    const lng = place?.center?.[0];
    const lat = place?.center?.[1];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setProfile((prev) => ({
      ...prev,
      lat,
      lng,
      locationGeoJSON: { type: "Point", coordinates: [lng, lat] },
      basicInfo: { ...prev.basicInfo, location: place.place_name || "" },
    }));
    setSearchQuery(place.place_name || "");
    setSuggestions([]);
  };

  // ---------------- Services ----------------
  const addService = () =>
    setProfile((prev) => ({
      ...prev,
      services: [...(prev.services || []), { name: "", price: "", description: "" }],
    }));

  const updateService = (i, field, value) => {
    setProfile((prev) => {
      const updated = [...(prev.services || [])];
      updated[i] = {
        ...updated[i],
        [field]: field === "price" ? (value === "" ? "" : Number(value)) : value,
      };
      return { ...prev, services: updated };
    });
  };

  // ---------------- Documents ----------------
  const addDocuments = (files) => {
    const newDocs = Array.from(files || []).map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      file: f,
    }));
    setProfile((prev) => ({ ...prev, documents: [...(prev.documents || []), ...newDocs] }));
  };

  // ---------------- Reverse Geocode ----------------
  const handleMarkerDrag = async (lat, lng) => {
    setProfile((prev) => ({
      ...prev,
      lat,
      lng,
      locationGeoJSON: { type: "Point", coordinates: [lng, lat] },
    }));

    try {
      const res = await geocodingClient.reverseGeocode({ query: [lng, lat], limit: 1 }).send();
      const feature = res?.body?.features?.[0];
      if (feature?.place_name) {
        setProfile((prev) => ({
          ...prev,
          basicInfo: { ...prev.basicInfo, location: feature.place_name },
        }));
        setSearchQuery(feature.place_name);
      }
    } catch {
      console.log("Reverse geocoding failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Provider Settings</h1>
          <button
            onClick={() => setEditing((v) => !v)}
            className="bg-sky-600 text-white px-5 py-2 rounded-lg"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        {successMsg && <div className="bg-green-100 p-3 rounded">{successMsg}</div>}
        {errorMsg && <div className="bg-red-100 p-3 rounded">{errorMsg}</div>}

        {/* Profile Section */}
        <Section title="Profile" icon={<FaUser />}>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100">
              {profile.basicInfo.photoURL ? (
                <img src={profile.basicInfo.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <FaCamera />
                </div>
              )}
            </div>

            {editing && (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setProfile((prev) => ({
                    ...prev,
                    basicInfo: { ...prev.basicInfo, photoFile: file, photoURL: URL.createObjectURL(file) },
                  }));
                }}
              />
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {["providerName", "businessName", "email", "phone", "location"].map((field) => (
              <InputField
                key={field}
                label={field}
                value={profile.basicInfo[field]}
                disabled={!editing}
                onChange={(v) => setProfile((prev) => ({ ...prev, basicInfo: { ...prev.basicInfo, [field]: v } }))}
              />
            ))}
          </div>

          <textarea
            value={profile.basicInfo.bio}
            disabled={!editing}
            onChange={(e) => setProfile((prev) => ({ ...prev, basicInfo: { ...prev.basicInfo, bio: e.target.value } }))}
            className="w-full border p-2 rounded mt-3"
            placeholder="Bio"
          />
        </Section>

        {/* Services Section */}
        <Section title="Services" icon={<FaFileAlt />}>
          {(profile.services || []).map((s, i) => (
            <div key={i} className="grid md:grid-cols-3 gap-3 mb-3">
              <InputField label="Name" value={s.name} disabled={!editing} onChange={(v) => updateService(i, "name", v)} />
              <div>
                <label className="text-sm capitalize">Price (KSh)</label>
                <div className="flex items-center border p-2 rounded bg-white">
                  <span className="text-gray-500 pr-2">KSh</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={s.price === "" ? "" : s.price}
                    disabled={!editing}
                    onChange={(e) => updateService(i, "price", e.target.value)}
                    className="w-full outline-none bg-transparent"
                    placeholder="Enter amount"
                  />
                </div>
              </div>
              <InputField label="Description" value={s.description} disabled={!editing} onChange={(v) => updateService(i, "description", v)} />
            </div>
          ))}
          {editing && (
            <button onClick={addService} className="bg-green-500 text-white px-4 py-2 rounded">
              Add Service
            </button>
          )}
        </Section>

        {/* Documents Section */}
        <Section title="Documents" icon={<FaFileAlt />}>
          <div className="space-y-3">
            {(profile.documents || []).length === 0 ? (
              <p className="text-sm text-gray-500">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {profile.documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between border rounded p-3 bg-gray-50">
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-xs text-gray-500">
                        {doc.type || "File"} • {doc.size ? `${Math.round(doc.size / 1024)} KB` : "Unknown size"}
                      </p>
                    </div>
                    {doc.path && !doc.file && (
                      <a href={doc.path} target="_blank" rel="noreferrer" className="text-sky-600 text-sm underline">
                        Open
                      </a>
                    )}
                    {doc.file && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">New</span>}
                  </div>
                ))}
              </div>
            )}
            {editing && <input type="file" multiple onChange={(e) => addDocuments(e.target.files)} className="block w-full text-sm" />}
          </div>
        </Section>

        {/* Map Section */}
        <Section title="Location" icon={<FaMapMarkerAlt />}>
          {editing && (
            <div className="relative mb-3">
              <div className="flex gap-2">
                <input
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="border p-2 w-full rounded"
                  placeholder="Search location"
                />
                <button onClick={() => suggestions[0] && selectSuggestion(suggestions[0])} className="bg-sky-500 text-white px-4 py-2 rounded flex items-center gap-1" type="button">
                  <FaSearch /> Search
                </button>
              </div>
              {suggestions.length > 0 && (
                <ul className="absolute bg-white border w-full mt-1 max-h-60 overflow-auto z-50 rounded shadow-md">
                  {suggestions.map((place, idx) => (
                    <li key={idx} className="p-2 hover:bg-sky-100 cursor-pointer" onClick={() => selectSuggestion(place)}>
                      {place.place_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="h-80 rounded overflow-hidden">
            <MapContainer center={[profile.lat, profile.lng]} zoom={13} className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {profile.lat != null && profile.lng != null && (
                <>
                  <RecenterMap lat={profile.lat} lng={profile.lng} />
                  <Marker
                    position={[profile.lat, profile.lng]}
                    draggable={editing}
                    eventHandlers={{ dragend: (e) => handleMarkerDrag(e.target.getLatLng().lat, e.target.getLatLng().lng) }}
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
      <input value={value || ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="w-full border p-2 rounded" />
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow space-y-4">
      <div className="flex gap-2 font-semibold text-sky-600">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}