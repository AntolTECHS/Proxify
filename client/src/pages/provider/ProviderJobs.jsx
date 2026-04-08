// src/pages/provider/ProviderJobs.jsx
import { useEffect, useMemo, useState } from "react";
import { FaTimes, FaMapMarkerAlt, FaMap, FaEyeSlash } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.jsx";
import Chat from "../../components/Chat/Chat.jsx";

import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const formatKES = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

function RecenterMap({ bounds }) {
  const map = useMap();

  useEffect(() => {
    if (bounds?.length === 2) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);

  return null;
}

const toFiniteNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const getBookingCoords = (job) => {
  if (Number.isFinite(job?.lat) && Number.isFinite(job?.lng)) {
    return { lat: job.lat, lng: job.lng };
  }

  const coords = job?.locationCoords?.coordinates;
  if (Array.isArray(coords) && coords.length === 2) {
    const lng = toFiniteNumber(coords[0]);
    const lat = toFiniteNumber(coords[1]);
    if (lat != null && lng != null) return { lat, lng };
  }

  return null;
};

const getProviderCoords = (provider) => {
  if (!provider) return null;

  const coords =
    provider?.location?.coordinates ||
    provider?.locationGeoJSON?.coordinates ||
    provider?.coordinates ||
    [];

  if (Array.isArray(coords) && coords.length === 2) {
    const lng = toFiniteNumber(coords[0]);
    const lat = toFiniteNumber(coords[1]);
    if (lat != null && lng != null) return { lat, lng };
  }

  if (Number.isFinite(provider?.lat) && Number.isFinite(provider?.lng)) {
    return { lat: provider.lat, lng: provider.lng };
  }

  return null;
};

export default function ProviderJobs() {
  const { token } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [modalJob, setModalJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [error, setError] = useState("");
  const [providerCoords, setProviderCoords] = useState(null);

  const fetchProviderProfile = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API}/providers/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const data = await res.json();
      setProviderCoords(getProviderCoords(data));
    } catch (err) {
      console.error("Fetch provider profile error:", err);
      setProviderCoords(null);
    }
  };

  const fetchJobs = async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/bookings/provider`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load jobs");
      }

      setJobs(data.bookings || []);
    } catch (err) {
      console.error("Fetch jobs error:", err);
      setError(err?.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviderProfile();
    fetchJobs();
  }, [token]);

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API}/bookings/${id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to update booking status");
      }

      const updatedBooking = data.booking;

      setJobs((prev) => prev.map((j) => (j._id === id ? updatedBooking : j)));

      if (modalJob?._id === id) {
        setModalJob(updatedBooking);
      }
    } catch (err) {
      console.error("Update status error:", err);
      setError(err?.message || "Failed to update booking status");
    }
  };

  const statusColor = (status) => {
    if (status === "pending") return "text-yellow-600";
    if (status === "accepted") return "text-blue-600";
    if (status === "in_progress") return "text-purple-600";
    if (status === "completed") return "text-green-600";
    if (status === "cancelled") return "text-red-600";
    return "text-gray-600";
  };

  const paymentColor = (paymentStatus) => {
    if (paymentStatus === "paid") return "text-green-600";
    if (paymentStatus === "unpaid") return "text-red-600";
    if (paymentStatus === "refunded") return "text-blue-600";
    return "text-gray-600";
  };

  const modalCoords = getBookingCoords(modalJob);
  const routeBounds = useMemo(() => {
    if (!providerCoords || !modalCoords) return null;
    return [
      [providerCoords.lat, providerCoords.lng],
      [modalCoords.lat, modalCoords.lng],
    ];
  }, [providerCoords, modalCoords]);

  const closeModal = () => {
    setModalJob(null);
    setShowChat(false);
    setShowMap(true);
  };

  return (
    <div className="w-full min-h-screen bg-gray-100 p-4 md:p-6">
      <h1 className="mb-6 text-3xl font-bold text-gray-800">Your Jobs</h1>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-gray-500">Loading jobs...</p>
      ) : jobs.length === 0 ? (
        <p className="text-gray-500">No jobs yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-md">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Service
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Customer
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                  Status
                </th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {jobs.map((job) => (
                <tr key={job._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{job.serviceName}</td>
                  <td className="px-4 py-2">{job.customer?.name}</td>
                  <td className="px-4 py-2">
                    {new Date(job.scheduledAt).toLocaleDateString()}
                  </td>
                  <td className={`px-4 py-2 font-semibold ${statusColor(job.status)}`}>
                    {job.status}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => {
                        setModalJob(job);
                        setShowChat(false);
                        setShowMap(true);
                      }}
                      className="rounded bg-sky-500 px-3 py-1 text-sm text-white hover:bg-sky-600"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="relative flex h-[85vh] max-h-[85vh] w-full flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2">
            <button
              className="absolute right-3 top-3 z-10 text-gray-600 hover:text-gray-900"
              onClick={closeModal}
            >
              <FaTimes />
            </button>

            {showChat ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="shrink-0 border-b border-gray-200 px-5 py-4">
                  <h2 className="text-lg font-bold text-sky-500">
                    Chat with {modalJob.customer?.name || "Customer"}
                  </h2>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                  <div className="h-full w-full p-4">
                    <Chat bookingId={modalJob._id} token={token} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
                <h2 className="mb-4 text-xl font-semibold">{modalJob.serviceName}</h2>

                <div className="space-y-1 text-sm md:text-base">
                  <p>
                    <strong>Customer:</strong> {modalJob.customer?.name}
                  </p>
                  <p>
                    <strong>Date:</strong> {new Date(modalJob.scheduledAt).toLocaleString()}
                  </p>
                  <p>
                    <strong>Location:</strong> {modalJob.location}
                  </p>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowMap((v) => !v)}
                      className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600"
                    >
                      {showMap ? <FaEyeSlash /> : <FaMap />}
                      {showMap ? "Hide Map" : "Show Map"}
                    </button>
                  </div>

                  {showMap ? (
                    providerCoords && modalCoords ? (
                      <div className="mt-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-600">
                          <FaMapMarkerAlt />
                          Provider and customer route
                        </div>
                        <div className="h-80 overflow-hidden rounded-xl border">
                          <MapContainer
                            center={[
                              (providerCoords.lat + modalCoords.lat) / 2,
                              (providerCoords.lng + modalCoords.lng) / 2,
                            ]}
                            zoom={14}
                            scrollWheelZoom={true}
                            className="h-full w-full"
                          >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <RecenterMap bounds={routeBounds} />
                            <Marker position={[providerCoords.lat, providerCoords.lng]} />
                            <Marker position={[modalCoords.lat, modalCoords.lng]} />
                            <Polyline
                              positions={[
                                [providerCoords.lat, providerCoords.lng],
                                [modalCoords.lat, modalCoords.lng],
                              ]}
                              pathOptions={{ color: "blue", weight: 4, opacity: 0.85 }}
                            />
                          </MapContainer>
                        </div>
                      </div>
                    ) : modalCoords ? (
                      <div className="mt-4">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-600">
                          <FaMapMarkerAlt />
                          Customer location on map
                        </div>
                        <div className="h-72 overflow-hidden rounded-xl border">
                          <MapContainer
                            center={[modalCoords.lat, modalCoords.lng]}
                            zoom={14}
                            scrollWheelZoom={true}
                            className="h-full w-full"
                          >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <RecenterMap
                              bounds={[[modalCoords.lat, modalCoords.lng], [modalCoords.lat, modalCoords.lng]]}
                            />
                            <Marker position={[modalCoords.lat, modalCoords.lng]} />
                          </MapContainer>
                        </div>
                        {!providerCoords && (
                          <p className="mt-2 text-sm text-gray-500">
                            Provider coordinates are not available yet.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500">
                        No saved map coordinates are available for this booking.
                      </p>
                    )
                  ) : (
                    <p className="mt-3 text-sm text-gray-500">
                      Map hidden. Use the toggle above to show or hide the route.
                    </p>
                  )}

                  <p>
                    <strong>Price:</strong> {formatKES(modalJob.price)}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span className={`font-semibold ${statusColor(modalJob.status)}`}>
                      {modalJob.status}
                    </span>
                  </p>
                  <p>
                    <strong>Payment:</strong>{" "}
                    <span className={`font-semibold ${paymentColor(modalJob.paymentStatus)}`}>
                      {modalJob.paymentStatus || "unpaid"}
                    </span>
                  </p>
                  {modalJob.notes && (
                    <p className="mt-2 text-gray-600">
                      <strong>Notes:</strong> {modalJob.notes}
                    </p>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {modalJob.status === "pending" && (
                    <button
                      onClick={() => updateStatus(modalJob._id, "accepted")}
                      className="rounded bg-blue-500 px-4 py-2 text-white"
                    >
                      Accept Job
                    </button>
                  )}

                  {modalJob.status === "accepted" && (
                    <button
                      onClick={() => updateStatus(modalJob._id, "in_progress")}
                      className="rounded bg-purple-500 px-4 py-2 text-white"
                    >
                      Start Job
                    </button>
                  )}

                  {modalJob.status === "in_progress" && (
                    <button
                      onClick={() => updateStatus(modalJob._id, "completed")}
                      className="rounded bg-green-500 px-4 py-2 text-white"
                    >
                      Mark Completed
                    </button>
                  )}

                  {modalJob.status !== "completed" && modalJob.status !== "cancelled" && (
                    <button
                      onClick={() => updateStatus(modalJob._id, "cancelled")}
                      className="rounded bg-red-500 px-4 py-2 text-white"
                    >
                      Cancel
                    </button>
                  )}

                  <button
                    onClick={() => setShowChat(true)}
                    className="rounded bg-sky-500 px-4 py-2 text-white"
                  >
                    Open Chat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}