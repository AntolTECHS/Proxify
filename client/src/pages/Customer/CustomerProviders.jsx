// src/pages/customer/CustomerProviders.jsx
import { useState, useEffect, useRef } from "react";
import { FaStar, FaTimes, FaSearch, FaMapMarkerAlt } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.jsx";
import { geocodingClient } from "../../utils/mapboxClient";

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BOOKING_DEBOUNCE_MS = 300;

const MAP_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Fix Leaflet default marker icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const toFiniteNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

function RecenterMap({ bounds }) {
  const map = useMap();

  useEffect(() => {
    if (bounds?.length === 2) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);

  return null;
}

const getProviderCoords = (provider) => {
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

async function geocodeBookingLocation(query) {
  const trimmed = String(query || "").trim();
  if (!trimmed) return { suggestions: [], coords: null };

  const res = await geocodingClient
    .forwardGeocode({
      query: trimmed,
      limit: 5,
      countries: ["ke"],
      types: ["region", "place", "locality", "neighborhood", "address"],
    })
    .send();

  const suggestions = res?.body?.features || [];
  const first = suggestions[0];

  const lng = first?.center?.[0];
  const lat = first?.center?.[1];

  const coords = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

  return { suggestions, coords };
}

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
    locationLat: null,
    locationLng: null,
    locationSuggestions: [],
    locationLoading: false,
    notes: "",
    serviceId: "",
  });

  const bookingLocationTimeout = useRef(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

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

    return () => {
      if (bookingLocationTimeout.current) {
        clearTimeout(bookingLocationTimeout.current);
      }
    };
  }, [token]);

  useEffect(() => {
    return () => {
      if (bookingLocationTimeout.current) {
        clearTimeout(bookingLocationTimeout.current);
      }
    };
  }, []);

  const filteredProviders = providers.filter((p) => {
    const name = p.basicInfo?.providerName || p.name || "";
    const services = p.services?.map((s) => s.name).join(" ") || "";
    const query = searchTerm.toLowerCase();

    return (
      name.toLowerCase().includes(query) ||
      services.toLowerCase().includes(query)
    );
  });

  const resetBookingForm = () => {
    setBookingForm({
      date: "",
      time: "",
      location: "",
      locationLat: null,
      locationLng: null,
      locationSuggestions: [],
      locationLoading: false,
      notes: "",
      serviceId: "",
    });
  };

  const handleBookingLocationChange = (value) => {
    setBookingForm((prev) => ({
      ...prev,
      location: value,
      locationLat: null,
      locationLng: null,
      locationSuggestions: [],
      locationLoading: Boolean(String(value || "").trim()),
    }));

    if (bookingLocationTimeout.current) {
      clearTimeout(bookingLocationTimeout.current);
    }

    const trimmed = String(value || "").trim();
    if (!trimmed) {
      setBookingForm((prev) => ({
        ...prev,
        locationLoading: false,
        locationSuggestions: [],
        locationLat: null,
        locationLng: null,
      }));
      return;
    }

    bookingLocationTimeout.current = setTimeout(async () => {
      try {
        const { suggestions, coords } = await geocodeBookingLocation(trimmed);

        setBookingForm((prev) => ({
          ...prev,
          locationSuggestions: suggestions,
          locationLoading: false,
          locationLat: coords?.lat ?? null,
          locationLng: coords?.lng ?? null,
        }));
      } catch (err) {
        console.error("Booking location geocode failed:", err);
        setBookingForm((prev) => ({
          ...prev,
          locationSuggestions: [],
          locationLoading: false,
        }));
      }
    }, BOOKING_DEBOUNCE_MS);
  };

  const selectBookingSuggestion = (place) => {
    const lng = place?.center?.[0];
    const lat = place?.center?.[1];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setBookingForm((prev) => ({
      ...prev,
      location: place.place_name || prev.location,
      locationLat: lat,
      locationLng: lng,
      locationSuggestions: [],
      locationLoading: false,
    }));
  };

  const submitBooking = async () => {
    const locationText = String(bookingForm.location || "").trim();
    const notes = String(bookingForm.notes || "").trim();

    if (!bookingForm.date || !bookingForm.time || !locationText) {
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
      if (Number.isNaN(scheduledAt.getTime())) {
        throw new Error("Please choose a valid booking date and time");
      }

      let lat = bookingForm.locationLat;
      let lng = bookingForm.locationLng;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        const geocodeResult = await geocodeBookingLocation(locationText);
        lat = geocodeResult.coords?.lat ?? null;
        lng = geocodeResult.coords?.lng ?? null;
      }

      const payload = {
        providerId: bookingProvider._id,
        serviceId,
        scheduledAt: scheduledAt.toISOString(),
        location: locationText,
        locationText,
        notes,
      };

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        payload.lat = lat;
        payload.lng = lng;
        payload.locationGeoJSON = {
          type: "Point",
          coordinates: [lng, lat],
        };
      }

      const res = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Booking failed");

      alert("Booking successful!");
      setBookingProvider(null);
      resetBookingForm();
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
                        setSelectedProvider(null);
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
          <Modal
            onClose={() => {
              setBookingProvider(null);
              resetBookingForm();
            }}
          >
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

              <div className="relative">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Location
                </label>
                <div className="relative">
                  <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    placeholder="Enter location (estate, street, landmark, town)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pl-11 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100"
                    value={bookingForm.location}
                    onChange={(e) => handleBookingLocationChange(e.target.value)}
                  />
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  The booking saves your typed location and converts it into coordinates before submission.
                </p>

                {bookingForm.locationLoading && (
                  <p className="mt-2 text-xs font-medium text-teal-600">Finding coordinates...</p>
                )}

                {bookingForm.locationLat != null && bookingForm.locationLng != null && (
                  <p className="mt-2 text-xs text-emerald-600">
                    Coordinates found: {bookingForm.locationLat.toFixed(5)}, {bookingForm.locationLng.toFixed(5)}
                  </p>
                )}

                {bookingForm.locationSuggestions.length > 0 && (
                  <ul className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                    {bookingForm.locationSuggestions.map((place, idx) => (
                      <li
                        key={`${place.id || idx}`}
                        className="cursor-pointer border-b border-slate-100 px-4 py-3 text-sm text-slate-700 hover:bg-teal-50"
                        onClick={() => selectBookingSuggestion(place)}
                      >
                        {place.place_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes
                </label>
                <textarea
                  placeholder="Add any helpful details"
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-100"
                  value={bookingForm.notes}
                  onChange={(e) =>
                    setBookingForm({ ...bookingForm, notes: e.target.value })
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

  const bounds = [
    [coords.lat, coords.lng],
    [coords.lat, coords.lng],
  ];

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-2 text-xl font-bold text-teal-600">
        {provider.basicInfo?.providerName || "Provider"} Location
      </h2>

      {provider.basicInfo?.location && (
        <p className="mb-3 text-sm text-gray-500">{provider.basicInfo.location}</p>
      )}

      <div className="h-80 overflow-hidden rounded-xl border shadow-sm">
        <MapContainer
          center={[coords.lat, coords.lng]}
          zoom={17}
          className="h-full w-full"
          scrollWheelZoom={true}
          zoomControl={true}
        >
          <TileLayer url={MAP_TILE_URL} attribution={MAP_ATTRIBUTION} />
          <RecenterMap bounds={bounds} />
          <Marker position={[coords.lat, coords.lng]} />
        </MapContainer>
      </div>

      <p className="mt-3 text-sm text-gray-500">
        This view uses a street map style with stronger labels and nearby roads.
      </p>
    </Modal>
  );
};