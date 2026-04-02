import { useState, useEffect, useRef } from "react";
import { FaUser, FaMapMarkerAlt, FaCamera, FaFileAlt, FaSearch } from "react-icons/fa";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { geocodingClient } from "../../utils/mapboxClient";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const API_BASE = "http://localhost:5000";
const FALLBACK_LAT = -1.286389;
const FALLBACK_LNG = 36.817223;

function RecenterMap({ lat, lng }) {
  const map = useMap();

  useEffect(() => {
    if (lat != null && lng != null) {
      map.setView([lat, lng], 15);
    }
  }, [lat, lng, map]);

  return null;
}

function resolveFileUrl(filePath) {
  if (!filePath) return "";
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
  return `${API_BASE}${filePath.startsWith("/") ? "" : "/"}${filePath}`;
}

function formatFileSize(size) {
  if (!size && size !== 0) return "Unknown size";
  const kb = size / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function InputField({ label, value, onChange, disabled }) {
  return (
    <div>
      <label className="text-sm capitalize">{label}</label>
      <input
        value={value || ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border p-2"
      />
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="space-y-4 rounded-xl bg-white p-5 shadow">
      <div className="flex gap-2 font-semibold text-sky-600">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

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
      location: "",
      photoURL: "",
      photoFile: null,
    },
    bio: "",
    lat: FALLBACK_LAT,
    lng: FALLBACK_LNG,
    services: [],
    documents: [],
    locationGeoJSON: { type: "Point", coordinates: [FALLBACK_LNG, FALLBACK_LAT] },
  });

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

      const res = await fetch(`${API_BASE}/api/providers/me`, {
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
        location: data?.basicInfo?.location || "",
        photoURL: resolveFileUrl(data?.basicInfo?.photoURL || ""),
        photoFile: null,
      };

      const bio = data?.bio || "";

      const services = Array.isArray(data?.services) ? data.services : [];
      const documents = Array.isArray(data?.documents)
        ? data.documents.map((d) => ({
            ...d,
            path: resolveFileUrl(d.path),
            file: null,
          }))
        : [];

      let lat = data?.location?.coordinates?.[1];
      let lng = data?.location?.coordinates?.[0];

      const validCoords =
        Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

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
        bio,
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

  const handleSave = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please log in again.");

      const formData = new FormData();
      const { photoFile, ...basicInfo } = profile.basicInfo;

      formData.append("basicInfo", JSON.stringify(basicInfo));
      formData.append("bio", profile.bio || "");
      formData.append("services", JSON.stringify(profile.services || []));
      formData.append("lat", String(profile.lat));
      formData.append("lng", String(profile.lng));

      if (photoFile) formData.append("photo", photoFile);

      (profile.documents || [])
        .filter((d) => d.file)
        .forEach((d) => formData.append("files", d.file));

      const res = await fetch(`${API_BASE}/api/providers/update`, {
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
          location: updated?.basicInfo?.location || "",
          photoURL: resolveFileUrl(updated?.basicInfo?.photoURL || ""),
          photoFile: null,
        },
        bio: updated?.bio || "",
        lat:
          Number.isFinite(updatedLat) && !(updatedLat === 0 && updatedLng === 0)
            ? updatedLat
            : profile.lat,
        lng:
          Number.isFinite(updatedLng) && !(updatedLat === 0 && updatedLng === 0)
            ? updatedLng
            : profile.lng,
        services: Array.isArray(updated?.services) ? updated.services : [],
        documents: Array.isArray(updated?.documents)
          ? updated.documents.map((d) => ({
              ...d,
              path: resolveFileUrl(d.path),
              file: null,
            }))
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

  const addDocuments = (files) => {
    const newDocs = Array.from(files || []).map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      file: f,
      path: "",
    }));

    setProfile((prev) => ({
      ...prev,
      documents: [...(prev.documents || []), ...newDocs],
    }));
  };

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
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Provider Settings</h1>
          <button
            onClick={() => setEditing((v) => !v)}
            className="rounded-lg bg-sky-600 px-5 py-2 text-white"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        {successMsg && <div className="rounded bg-green-100 p-3">{successMsg}</div>}
        {errorMsg && <div className="rounded bg-red-100 p-3">{errorMsg}</div>}

        <Section title="Profile" icon={<FaUser />}>
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 overflow-hidden rounded-full bg-gray-100">
              {profile.basicInfo.photoURL ? (
                <img
                  src={profile.basicInfo.photoURL}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
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
                    basicInfo: {
                      ...prev.basicInfo,
                      photoFile: file,
                      photoURL: URL.createObjectURL(file),
                    },
                  }));
                }}
              />
            )}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {["providerName", "businessName", "email", "phone", "location"].map((field) => (
              <InputField
                key={field}
                label={field}
                value={profile.basicInfo[field]}
                disabled={!editing}
                onChange={(v) =>
                  setProfile((prev) => ({
                    ...prev,
                    basicInfo: { ...prev.basicInfo, [field]: v },
                  }))
                }
              />
            ))}
          </div>

          <div className="mt-3">
            <label className="text-sm capitalize">Bio</label>
            <textarea
              value={profile.bio}
              disabled={!editing}
              onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
              className="mt-1 w-full rounded border p-2"
              placeholder="Bio"
              rows={4}
            />
          </div>
        </Section>

        <Section title="Services" icon={<FaFileAlt />}>
          {(profile.services || []).map((s, i) => (
            <div key={i} className="mb-3 grid gap-3 md:grid-cols-3">
              <InputField
                label="Name"
                value={s.name}
                disabled={!editing}
                onChange={(v) => updateService(i, "name", v)}
              />
              <div>
                <label className="text-sm capitalize">Price (KSh)</label>
                <div className="flex items-center rounded border bg-white p-2">
                  <span className="pr-2 text-gray-500">KSh</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={s.price === "" ? "" : s.price}
                    disabled={!editing}
                    onChange={(e) => updateService(i, "price", e.target.value)}
                    className="w-full bg-transparent outline-none"
                    placeholder="Enter amount"
                  />
                </div>
              </div>
              <InputField
                label="Description"
                value={s.description}
                disabled={!editing}
                onChange={(v) => updateService(i, "description", v)}
              />
            </div>
          ))}

          {editing && (
            <button onClick={addService} className="rounded bg-green-500 px-4 py-2 text-white">
              Add Service
            </button>
          )}
        </Section>

        <Section title="Documents" icon={<FaFileAlt />}>
          <div className="space-y-3">
            {(profile.documents || []).length === 0 ? (
              <p className="text-sm text-gray-500">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {profile.documents.map((doc, idx) => (
                  <div
                    key={`${doc.name || "doc"}-${idx}`}
                    className="flex items-center justify-between rounded border bg-gray-50 p-3"
                  >
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-xs text-gray-500">
                        {doc.type || "File"} • {formatFileSize(doc.size)}
                      </p>
                    </div>

                    {doc.path && (
                      <a
                        href={doc.path}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 text-sm underline"
                      >
                        Open
                      </a>
                    )}

                    {doc.file && (
                      <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                        New
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {editing && (
              <input
                type="file"
                multiple
                onChange={(e) => addDocuments(e.target.files)}
                className="block w-full text-sm"
              />
            )}
          </div>
        </Section>

        <Section title="Location" icon={<FaMapMarkerAlt />}>
          {editing && (
            <div className="relative mb-3">
              <div className="flex gap-2">
                <input
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full rounded border p-2"
                  placeholder="Search location"
                />
                <button
                  onClick={() => suggestions[0] && selectSuggestion(suggestions[0])}
                  className="flex items-center gap-1 rounded bg-sky-500 px-4 py-2 text-white"
                  type="button"
                >
                  <FaSearch /> Search
                </button>
              </div>

              {suggestions.length > 0 && (
                <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded border bg-white shadow-md">
                  {suggestions.map((place, idx) => (
                    <li
                      key={idx}
                      className="cursor-pointer p-2 hover:bg-sky-100"
                      onClick={() => selectSuggestion(place)}
                    >
                      {place.place_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="h-80 overflow-hidden rounded">
            <MapContainer center={[profile.lat, profile.lng]} zoom={13} className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {profile.lat != null && profile.lng != null && (
                <>
                  <RecenterMap lat={profile.lat} lng={profile.lng} />
                  <Marker
                    position={[profile.lat, profile.lng]}
                    draggable={editing}
                    eventHandlers={{
                      dragend: (e) =>
                        handleMarkerDrag(
                          e.target.getLatLng().lat,
                          e.target.getLatLng().lng
                        ),
                    }}
                  />
                </>
              )}
            </MapContainer>
          </div>
        </Section>

        {editing && (
          <div className="text-right">
            <button
              onClick={handleSave}
              className="rounded-lg bg-sky-600 px-6 py-2 text-white"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}