// src/pages/customer/CustomerProviders.jsx
import { useState, useEffect } from "react";
import { FaStar, FaTimes, FaSearch, FaMapMarkerAlt } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.jsx";

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function RecenterMap({ lat, lng }) {
  const map = useMap();

  useEffect(() => {
    if (lat != null && lng != null) {
      map.setView([lat, lng], 15);
    }
  }, [lat, lng, map]);

  return null;
}

const getProviderCoords = (provider) => {
  const coords =
    provider?.location?.coordinates ||
    provider?.locationGeoJSON?.coordinates ||
    provider?.coordinates ||
    [];

  const lng = coords?.[0];
  const lat = coords?.[1];

  if (lat == null || lng == null) return null;
  return { lat, lng };
};

export default function CustomerProviders() {
  const { token } = useAuth();

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedProvider, setSelectedProvider] = useState(null);
  const [bookingProvider, setBookingProvider] = useState(null);
  const [mapProvider, setMapProvider] = useState(null);

  const [bookingForm, setBookingForm] = useState({
    date: "",
    time: "",
    location: "",
    serviceId: "",
  });

  useEffect(() => {
    if (!token) return;

    const fetchProviders = async () => {
      try {
        const res = await fetch(`${API_URL}/providers`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        setProviders(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Fetch providers error:", err);
        setProviders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, [token]);

  const filteredProviders = providers.filter((p) => {
    const name = p.basicInfo?.providerName || p.name || "";
    const services = p.services?.map((s) => s.name).join(" ") || "";
    const query = searchTerm.toLowerCase();

    return (
      name.toLowerCase().includes(query) ||
      services.toLowerCase().includes(query)
    );
  });

  const submitBooking = async () => {
    if (!bookingForm.date || !bookingForm.time || !bookingForm.location) {
      alert("Fill all booking fields");
      return;
    }

    const serviceId = bookingForm.serviceId || bookingProvider?.services?.[0]?._id;

    if (!serviceId) {
      alert("Please select a service");
      return;
    }

    try {
      const scheduledAt = new Date(`${bookingForm.date}T${bookingForm.time}`);

      const res = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerId: bookingProvider._id,
          serviceId,
          scheduledAt,
          location: bookingForm.location,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Booking failed");

      alert("Booking successful!");
      setBookingProvider(null);
      setBookingForm({
        date: "",
        time: "",
        location: "",
        serviceId: "",
      });
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-slate-50 px-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-teal-100 border-t-teal-600" />
          <p className="mt-4 text-lg font-medium text-teal-600">
            Loading providers...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-3 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-teal-600 sm:text-4xl">
              Find Service Providers
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              Search trusted professionals, view their services, and book in a few simple steps.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Search providers or services
          </label>
          <div className="relative">
            <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search providers or services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-800 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100"
            />
          </div>
        </div>

        {filteredProviders.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-500">No providers found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProviders.map((p) => {
              const services =
                p.services?.map((s) => s.name).join(", ") || "No services listed";
              const providerName = p.basicInfo?.providerName || p.name || "Provider";
              const priceLabel = p.services?.[0]?.price
                ? `KES ${p.services[0].price}`
                : "Price on request";

              return (
                <div
                  key={p._id}
                  onClick={() => setSelectedProvider(p)}
                  className="group cursor-pointer overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition duration-200 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="px-3 py-4 sm:px-5 sm:py-5">
                    <div className="flex justify-center">
                      <img
                        src={
                          p.basicInfo?.photoURL ||
                          "https://dummyimage.com/300x300/ddd/000"
                        }
                        alt={providerName}
                        className="h-20 w-20 rounded-full object-cover shadow-md ring-4 ring-teal-100 sm:h-24 sm:w-24"
                      />
                    </div>

                    <div className="mt-4 text-center">
                      <h3 className="text-sm font-bold text-slate-900 sm:text-lg">
                        {providerName}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600 sm:mt-3 sm:text-sm sm:leading-6">
                        {services}
                      </p>

                      <div className="mt-3 flex items-center justify-center gap-2 sm:mt-4">
                        <FaStar className="text-amber-400" />
                        <span className="text-xs font-semibold text-slate-700 sm:text-sm">
                          {p.rating?.toFixed(1) || "0.0"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <div className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-medium text-teal-600 sm:text-xs">
                        <span>{priceLabel}</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMapProvider(p);
                        }}
                        className="inline-flex items-center justify-center rounded-full px-2 py-2 text-teal-600 transition hover:bg-teal-50"
                        title="View map"
                        aria-label="View map"
                      >
                        <FaMapMarkerAlt className="text-base sm:text-lg" />
                      </button>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBookingProvider(p);
                      }}
                      className="mt-3 w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-200 sm:text-base"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedProvider && (
          <Modal onClose={() => setSelectedProvider(null)}>
            <div className="text-center">
              <img
                src={
                  selectedProvider.basicInfo?.photoURL ||
                  "https://dummyimage.com/300x300/ddd/000"
                }
                alt={selectedProvider.basicInfo?.providerName || "Provider"}
                className="mx-auto h-28 w-28 rounded-full object-cover shadow-md ring-4 ring-teal-100"
              />
              <h2 className="mt-4 text-2xl font-bold text-slate-900">
                {selectedProvider.basicInfo?.providerName || selectedProvider.name}
              </h2>

              <div className="mt-2 flex items-center justify-center gap-2">
                <FaStar className="text-amber-400" />
                <span className="font-semibold text-slate-700">
                  {selectedProvider.rating?.toFixed(1) || "0.0"}
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                {selectedProvider.services?.map((s) => s.name).join(", ") ||
                  "No services listed"}
              </p>

              <button
                className="mt-6 w-full rounded-xl bg-teal-600 px-4 py-3 font-semibold text-white transition hover:bg-teal-700"
                onClick={() => {
                  setBookingProvider(selectedProvider);
                  setSelectedProvider(null);
                }}
              >
                Book Provider
              </button>
            </div>
          </Modal>
        )}

        {bookingProvider && (
          <Modal onClose={() => setBookingProvider(null)}>
            <h2 className="mb-6 text-center text-2xl font-bold text-slate-900">
              Book {bookingProvider.basicInfo?.providerName || bookingProvider.name}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Service
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100"
                  value={bookingForm.serviceId}
                  onChange={(e) =>
                    setBookingForm({ ...bookingForm, serviceId: e.target.value })
                  }
                >
                  <option value="">Select Service</option>
                  {bookingProvider.services?.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} {s.price ? `- KES ${s.price}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100"
                    value={bookingForm.date}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, date: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Time
                  </label>
                  <input
                    type="time"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100"
                    value={bookingForm.time}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, time: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Location
                </label>
                <input
                  placeholder="Enter location"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100"
                  value={bookingForm.location}
                  onChange={(e) =>
                    setBookingForm({ ...bookingForm, location: e.target.value })
                  }
                />
              </div>

              <button
                onClick={submitBooking}
                className="w-full rounded-xl bg-teal-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-200"
              >
                Confirm Booking
              </button>
            </div>
          </Modal>
        )}

        {mapProvider && (
          <MapModal provider={mapProvider} onClose={() => setMapProvider(null)} />
        )}
      </div>
    </div>
  );
}

const Modal = ({ children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm">
    <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:p-8">
      <button
        className="absolute right-4 top-4 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        onClick={onClose}
        aria-label="Close modal"
      >
        <FaTimes />
      </button>
      {children}
    </div>
  </div>
);

const MapModal = ({ provider, onClose }) => {
  const coords = getProviderCoords(provider);

  if (!coords) {
    return (
      <Modal onClose={onClose}>
        <h2 className="mb-3 text-xl font-bold text-teal-600">
          {provider.basicInfo?.providerName || "Provider"} Location
        </h2>
        <p className="text-gray-600">
          No saved map coordinates are available for this provider yet.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          {provider.basicInfo?.location || ""}
        </p>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-2 text-xl font-bold text-teal-600">
        {provider.basicInfo?.providerName || "Provider"} Location
      </h2>

      {provider.basicInfo?.location && (
        <p className="mb-3 text-sm text-gray-500">{provider.basicInfo.location}</p>
      )}

      <div className="h-80 overflow-hidden rounded-xl border">
        <MapContainer
          center={[coords.lat, coords.lng]}
          zoom={15}
          className="h-full w-full"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <RecenterMap lat={coords.lat} lng={coords.lng} />
          <Marker position={[coords.lat, coords.lng]} />
        </MapContainer>
      </div>
    </Modal>
  );
};