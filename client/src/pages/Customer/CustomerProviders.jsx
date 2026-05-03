// src/pages/customer/CustomerProviders.jsx
import { useState, useEffect, useRef } from "react";
import {
  FaCompress,
  FaExpand,
  FaMapMarkerAlt,
  FaSearch,
  FaStar,
  FaTimes,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.jsx";
import { geocodingClient } from "../../utils/mapboxClient";
import "../../styles/customerProviders.css";

import {
  Circle,
  MapContainer,
  Marker,
  ScaleControl,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BOOKING_DEBOUNCE_MS = 300;

const MAP_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const SURROUNDING_RADIUS_METERS = 2200;
const CARD_THEME_STORAGE_KEY = "customerProviders.cardTheme";

const CARD_THEME_OPTIONS = [
  { key: "corporate", label: "Corporate / Minimal" },
  { key: "luxury", label: "Luxury / Premium" },
  { key: "vibrant", label: "Vibrant / Consumer" },
];

const CARD_THEME_STYLES = {
  corporate: {
    card:
      "rounded-[1.1rem] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(15,23,42,0.14)]",
    accent: "bg-slate-800",
    avatarRing: "ring-slate-200",
    title: "text-slate-900",
    meta: "text-slate-600",
    separator: "text-slate-400",
    star: "text-amber-500",
    serviceWrap: "border-slate-200 bg-slate-50",
    serviceLabel: "text-slate-500",
    serviceText: "text-slate-700",
    priceChip: "border-slate-200 bg-white text-slate-700",
    mapBtn: "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
    cta:
      "bg-gradient-to-r from-slate-800 to-slate-700 text-white hover:from-slate-700 hover:to-slate-600 focus:ring-slate-300",
  },
  luxury: {
    card:
      "rounded-[1.1rem] border border-[#3f3121] bg-gradient-to-b from-[#211911] to-[#140f0a] shadow-[0_10px_28px_rgba(0,0,0,0.35)] hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(0,0,0,0.45)]",
    accent: "bg-gradient-to-r from-[#d4af64] to-[#f7dda1]",
    avatarRing: "ring-[#6b5433]",
    title: "text-[#f7e9cd]",
    meta: "text-[#d6c4a1]",
    separator: "text-[#8f7957]",
    star: "text-[#f0c878]",
    serviceWrap: "border-[#4b3b28] bg-[#1b140d]",
    serviceLabel: "text-[#ba9b67]",
    serviceText: "text-[#f2debb]",
    priceChip: "border-[#705835] bg-[#2a1f14] text-[#f6d89a]",
    mapBtn: "border-[#705835] bg-[#231a11] text-[#f6d89a] hover:bg-[#2f2418]",
    cta:
      "bg-gradient-to-r from-[#d4af64] to-[#f5ddaa] text-[#24180d] hover:from-[#c79e4c] hover:to-[#ecd39f] focus:ring-[#d4af64]/45",
  },
  vibrant: {
    card:
      "rounded-[1.1rem] border border-[#d6ddff] bg-white shadow-[0_10px_26px_rgba(67,56,202,0.14)] hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(249,115,22,0.22)]",
    accent: "bg-gradient-to-r from-[#2563eb] via-[#7c3aed] to-[#f97316]",
    avatarRing: "ring-[#cfd9ff]",
    title: "text-[#1e1b4b]",
    meta: "text-[#4c4c82]",
    separator: "text-[#8f8fbf]",
    star: "text-[#f59e0b]",
    serviceWrap: "border-[#dde4ff] bg-[#f6f8ff]",
    serviceLabel: "text-[#5b5eb3]",
    serviceText: "text-[#2c2f78]",
    priceChip: "border-[#c9d5ff] bg-[#eef2ff] text-[#2c2f78]",
    mapBtn: "border-[#c9d5ff] bg-white text-[#2c2f78] hover:bg-[#eef2ff]",
    cta:
      "bg-gradient-to-r from-[#2563eb] via-[#7c3aed] to-[#f97316] text-white hover:from-[#1d4ed8] hover:via-[#6d28d9] hover:to-[#ea580c] focus:ring-[#7c3aed]/30",
  },
};

const isValidCardTheme = (themeKey) =>
  CARD_THEME_OPTIONS.some((theme) => theme.key === themeKey);

const getInitialCardTheme = () => {
  if (typeof window === "undefined") return "corporate";

  try {
    const savedTheme = window.localStorage.getItem(CARD_THEME_STORAGE_KEY);
    return isValidCardTheme(savedTheme) ? savedTheme : "corporate";
  } catch {
    return "corporate";
  }
};

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

const getSurroundingBounds = (lat, lng, radiusMeters = SURROUNDING_RADIUS_METERS) => {
  const safeLat = Number(lat);
  const safeLng = Number(lng);
  const latDelta = radiusMeters / 111320;
  const lngDelta =
    radiusMeters /
    (111320 * Math.max(Math.cos((safeLat * Math.PI) / 180), 0.2));

  return [
    [safeLat - latDelta, safeLng - lngDelta],
    [safeLat + latDelta, safeLng + lngDelta],
  ];
};

function RecenterMap({ bounds }) {
  const map = useMap();

  useEffect(() => {
    if (bounds?.length === 2) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    }
  }, [bounds, map]);

  return null;
}

function ResizeMapOnExpand({ trigger, bounds }) {
  const map = useMap();

  useEffect(() => {
    // Leaflet needs an explicit size invalidation when parent container dimensions change.
    const timer = window.setTimeout(() => {
      map.invalidateSize();
      if (bounds?.length === 2) {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [trigger, bounds, map]);

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
  const [cardTheme, setCardTheme] = useState(getInitialCardTheme);

  const [selectedProvider, setSelectedProvider] = useState(null);
  const [bookingProvider, setBookingProvider] = useState(null);
  const [mapProvider, setMapProvider] = useState(null);
  const [providerReviews, setProviderReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

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

  useEffect(() => {
    try {
      if (isValidCardTheme(cardTheme)) {
        window.localStorage.setItem(CARD_THEME_STORAGE_KEY, cardTheme);
      }
    } catch {
      // Ignore storage access failures (private mode, disabled storage, etc.)
    }
  }, [cardTheme]);

  useEffect(() => {
    const providerId = selectedProvider?._id || selectedProvider?.id;
    if (!providerId || !token) {
      setProviderReviews([]);
      return;
    }

    const fetchReviews = async () => {
      try {
        setReviewsLoading(true);
        const res = await fetch(`${API_URL}/reviews/${providerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setProviderReviews(Array.isArray(data.reviews) ? data.reviews : []);
      } catch (err) {
        console.error("Fetch provider reviews error:", err);
        setProviderReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [selectedProvider, token]);

  const filteredProviders = providers.filter((p) => {
    const name = p.basicInfo?.providerName || p.name || "";
    const services = p.services?.map((s) => s.name).join(" ") || "";
    const query = searchTerm.toLowerCase();

    return (
      name.toLowerCase().includes(query) ||
      services.toLowerCase().includes(query)
    );
  });

  const activeCardTheme = CARD_THEME_STYLES[cardTheme] || CARD_THEME_STYLES.corporate;

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
      <div className="min-h-[70vh] flex items-center justify-center bg-[#f6f9f8] px-6">
        <div className="rounded-3xl border border-[#d9e8e3] bg-white/80 px-10 py-9 text-center shadow-[0_20px_60px_rgba(8,47,43,0.12)] backdrop-blur-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#b9dfd3] border-t-[#0f766e]" />
          <p className="mt-4 text-lg font-semibold text-[#0f766e]">
            Loading providers...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-providers-page relative min-h-screen overflow-hidden bg-[#f2f7f5] px-3 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-16 top-6 h-48 w-48 rounded-full bg-[#0f766e]/15 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-32 h-72 w-72 rounded-full bg-[#ca8a04]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-[#0ea5a3]/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl space-y-8">
        <div className="rounded-[2rem] border border-[#d4e5df] bg-gradient-to-r from-[#f7fffc] via-[#ecf9f4] to-[#fdf6e3] p-5 shadow-[0_20px_70px_rgba(10,55,48,0.13)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="inline-flex items-center rounded-full bg-[#0f766e]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#0f766e]">
                Discover local experts
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-[#103c39] sm:text-5xl">
                Find Service Providers
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-[#3d5f5c] sm:text-base">
                Search trusted professionals, compare skills and rates, then lock in your booking in a few focused clicks.
              </p>
            </div>

            <div className="grid min-w-[220px] grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#cde3db] bg-white/80 px-4 py-3 text-center shadow-sm">
                <p className="text-xs uppercase tracking-wide text-[#51716e]">Providers</p>
                <p className="mt-1 text-2xl font-black text-[#103c39]">{providers.length}</p>
              </div>
              <div className="rounded-2xl border border-[#eadcae] bg-[#fff8df]/90 px-4 py-3 text-center shadow-sm">
                <p className="text-xs uppercase tracking-wide text-[#866d2c]">Matches</p>
                <p className="mt-1 text-2xl font-black text-[#7c5d12]">{filteredProviders.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-[#d3e4de] bg-white/85 p-4 shadow-[0_16px_45px_rgba(8,47,43,0.1)] backdrop-blur-sm sm:p-5">
          <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-[#395754]">
            Search providers or services
          </label>
          <div className="relative">
            <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#5f817d]" />
            <input
              type="text"
              placeholder="Search providers or services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-[#d3e5df] bg-[#f8fcfb] py-3 pl-11 pr-4 text-[#183634] outline-none transition duration-200 placeholder:text-[#86a39f] focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/15"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {CARD_THEME_OPTIONS.map((theme) => {
              const active = cardTheme === theme.key;
              return (
                <button
                  key={theme.key}
                  type="button"
                  onClick={() => setCardTheme(theme.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "border-[#0f766e] bg-[#0f766e] text-white"
                      : "border-[#cfe1db] bg-white text-[#45615e] hover:border-[#0f766e]/40 hover:text-[#0f766e]"
                  }`}
                >
                  {theme.label}
                </button>
              );
            })}
          </div>
        </div>

        {filteredProviders.length === 0 ? (
          <div className="rounded-[1.8rem] border border-[#d6e4df] bg-white/90 p-10 text-center shadow-[0_20px_60px_rgba(8,47,43,0.1)]">
            <p className="text-base font-semibold text-[#365755]">No providers found</p>
            <p className="mt-2 text-sm text-[#5f7976]">Try a different keyword for services, skills, or names.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProviders.map((p, idx) => {
              const services =
                p.services?.map((s) => s.name).join(", ") || "No services listed";
              const providerName = p.basicInfo?.providerName || p.name || "Provider";
              const priceLabel = p.services?.[0]?.price
                ? `KES ${p.services[0].price}`
                : "Price on request";
              const serviceCount = p.services?.length || 0;
              const locationLabel = p.basicInfo?.location || "Location not specified";

              return (
                <div
                  key={p._id}
                  onClick={() => setSelectedProvider(p)}
                  className={`provider-card group cursor-pointer overflow-hidden transition duration-300 ${activeCardTheme.card}`}
                  style={{ animationDelay: `${idx * 70}ms` }}
                >
                  <div className={`h-1.5 w-full ${activeCardTheme.accent}`} />

                  <div className="px-4 py-5 sm:px-5 sm:py-5">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          p.basicInfo?.photoURL ||
                          "https://dummyimage.com/300x300/ddd/000"
                        }
                        alt={providerName}
                        className={`h-16 w-16 rounded-2xl object-cover shadow-sm ring-2 ${activeCardTheme.avatarRing}`}
                      />

                      <div className="min-w-0 flex-1">
                        <h3 className={`truncate text-[15px] font-extrabold sm:text-base ${activeCardTheme.title}`}>
                          {providerName}
                        </h3>

                        <div className="mt-1 flex items-center gap-1.5">
                          <FaStar className={`text-xs ${activeCardTheme.star}`} />
                          <span className={`text-xs font-semibold ${activeCardTheme.meta}`}>
                            {p.rating?.toFixed(1) || "0.0"}
                          </span>
                          <span className={`text-xs ${activeCardTheme.separator}`}>•</span>
                          <span className={`text-xs ${activeCardTheme.meta}`}>
                            {serviceCount} service{serviceCount === 1 ? "" : "s"}
                          </span>
                        </div>

                        <p className={`mt-1 truncate text-xs ${activeCardTheme.meta}`}>
                          {locationLabel}
                        </p>
                      </div>
                    </div>

                    <div className={`mt-4 rounded-xl border p-3 ${activeCardTheme.serviceWrap}`}>
                      <p className={`text-[11px] font-semibold uppercase tracking-wide ${activeCardTheme.serviceLabel}`}>
                        Services
                      </p>
                      <p className={`mt-1 line-clamp-2 text-sm leading-6 ${activeCardTheme.serviceText}`}>
                        {services}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className={`rounded-lg border px-3 py-2 text-[11px] font-bold sm:text-xs ${activeCardTheme.priceChip}`}>
                        <span>{priceLabel}</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMapProvider(p);
                        }}
                        className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition ${activeCardTheme.mapBtn}`}
                        title="View map"
                        aria-label="View map"
                      >
                        <span className="mr-1.5 inline-flex items-center">
                          <FaMapMarkerAlt className="text-sm" />
                        </span>
                        Map
                      </button>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBookingProvider(p);
                        setSelectedProvider(null);
                      }}
                      className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold shadow-[0_10px_25px_rgba(15,118,110,0.24)] transition focus:outline-none focus:ring-4 ${activeCardTheme.cta}`}
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
                className="mx-auto h-28 w-28 rounded-full object-cover shadow-md ring-4 ring-[#c8e8de]"
              />
              <h2 className="mt-4 text-2xl font-black text-[#163f3b]">
                {selectedProvider.basicInfo?.providerName || selectedProvider.name}
              </h2>

              <div className="mt-2 flex items-center justify-center gap-2">
                <FaStar className="text-[#e3a51a]" />
                <span className="font-semibold text-[#385957]">
                  {selectedProvider.rating?.toFixed(1) || "0.0"}
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-[#56716e]">
                {selectedProvider.services?.map((s) => s.name).join(", ") ||
                  "No services listed"}
              </p>

              <div className="mt-5 rounded-2xl border border-[#dbe8e3] bg-[#f8fcfb] p-4 text-left">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5f7a77]">
                  Provider info
                </h3>
                <div className="mt-3 space-y-2 text-sm text-[#476864]">
                  <p>
                    <span className="font-semibold text-[#294846]">Location:</span>{" "}
                    {selectedProvider.basicInfo?.location || "Location not specified"}
                  </p>
                  <p>
                    <span className="font-semibold text-[#294846]">Services:</span>{" "}
                    {selectedProvider.services?.length || 0}
                  </p>
                  <p>
                    <span className="font-semibold text-[#294846]">Starting price:</span>{" "}
                    {selectedProvider.services?.[0]?.price
                      ? `KES ${selectedProvider.services[0].price}`
                      : "Price on request"}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#dbe8e3] bg-white p-4 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5f7a77]">
                    Reviews
                  </h3>
                  <span className="text-xs font-semibold text-[#3c5c59]">
                    {providerReviews.length} total
                  </span>
                </div>

                {reviewsLoading ? (
                  <p className="mt-3 text-sm text-[#6a8682]">Loading reviews...</p>
                ) : providerReviews.length === 0 ? (
                  <p className="mt-3 text-sm text-[#6a8682]">
                    No reviews yet. Be the first to book and review.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {providerReviews.slice(0, 3).map((review, index) => (
                      <div
                        key={review._id || `review-${index}`}
                        className="rounded-xl border border-[#eef4f2] bg-[#f8fcfb] p-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-[#264542]">
                            {review.user?.name || "Customer"}
                          </p>
                          <div className="flex items-center gap-1 text-xs font-semibold text-[#385957]">
                            <FaStar className="text-[#e3a51a]" />
                            {Number.isFinite(review.rating)
                              ? review.rating.toFixed(1)
                              : "0.0"}
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-[#56716e]">
                          {review.comment || "No written feedback provided."}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#0f766e] to-[#0a5a54] px-4 py-3 font-bold text-white transition hover:from-[#0d6b64] hover:to-[#084944]"
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
            <div className="mb-6 text-center">
              <p className="inline-flex items-center rounded-full bg-[#0f766e]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#0f766e]">
                Booking request
              </p>
              <h2 className="mt-3 text-2xl font-black text-[#163f3b]">
                Book {bookingProvider.basicInfo?.providerName || bookingProvider.name}
              </h2>
            </div>

            <div className="booking-hero-card mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={
                      bookingProvider.basicInfo?.photoURL ||
                      "https://dummyimage.com/300x300/ddd/000"
                    }
                    alt={bookingProvider.basicInfo?.providerName || "Provider"}
                    className="h-16 w-16 rounded-2xl object-cover shadow-sm ring-2 ring-[#cde7df]"
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#2c4f4b]">
                      {bookingProvider.basicInfo?.providerName || bookingProvider.name}
                    </p>
                    <p className="text-xs text-[#5d7774]">
                      {bookingProvider.basicInfo?.location || "Location not specified"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="booking-hero-pill">
                    <FaStar className="text-[#e0a91d]" />
                    {bookingProvider.rating?.toFixed(1) || "0.0"}
                  </span>
                  <span className="booking-hero-pill">
                    {bookingProvider.services?.length || 0} services
                  </span>
                  <span className="booking-hero-pill">
                    {bookingProvider.services?.[0]?.price
                      ? `KES ${bookingProvider.services[0].price}`
                      : "Price on request"}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm text-[#4e6b68]">
                Choose your service, time, and location to lock this booking.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#3a5956]">
                  Service
                </label>
                <select
                  className="w-full rounded-xl border border-[#d4e4df] bg-[#f7fcfa] px-4 py-3 outline-none transition focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/15"
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
                  <label className="mb-1 block text-sm font-semibold text-[#3a5956]">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-[#d4e4df] bg-[#f7fcfa] px-4 py-3 outline-none transition focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/15"
                    value={bookingForm.date}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, date: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#3a5956]">
                    Time
                  </label>
                  <input
                    type="time"
                    className="w-full rounded-xl border border-[#d4e4df] bg-[#f7fcfa] px-4 py-3 outline-none transition focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/15"
                    value={bookingForm.time}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, time: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="relative">
                <label className="mb-1 block text-sm font-semibold text-[#3a5956]">
                  Location
                </label>
                <div className="relative">
                  <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6b8b87]" />
                  <input
                    placeholder="Enter location (estate, street, landmark, town)"
                    className="w-full rounded-xl border border-[#d4e4df] bg-[#f7fcfa] px-4 py-3 pl-11 outline-none transition focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/15"
                    value={bookingForm.location}
                    onChange={(e) => handleBookingLocationChange(e.target.value)}
                  />
                </div>

                <p className="mt-2 text-xs text-[#5d7774]">
                  The booking saves your typed location and converts it into coordinates before submission.
                </p>

                {bookingForm.locationLoading && (
                  <p className="mt-2 text-xs font-semibold text-[#0f766e]">Finding coordinates...</p>
                )}

                {bookingForm.locationLat != null && bookingForm.locationLng != null && (
                  <p className="mt-2 text-xs font-medium text-emerald-700">
                    Coordinates found: {bookingForm.locationLat.toFixed(5)}, {bookingForm.locationLng.toFixed(5)}
                  </p>
                )}

                {bookingForm.locationSuggestions.length > 0 && (
                  <ul className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl border border-[#d4e3de] bg-white shadow-xl">
                    {bookingForm.locationSuggestions.map((place, idx) => (
                      <li
                        key={`${place.id || idx}`}
                        className="cursor-pointer border-b border-[#edf5f2] px-4 py-3 text-sm text-[#365654] hover:bg-[#edf8f5]"
                        onClick={() => selectBookingSuggestion(place)}
                      >
                        {place.place_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[#3a5956]">
                  Notes
                </label>
                <textarea
                  placeholder="Add any helpful details"
                  rows={3}
                  className="w-full rounded-xl border border-[#d4e4df] bg-[#f7fcfa] px-4 py-3 outline-none transition focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/15"
                  value={bookingForm.notes}
                  onChange={(e) =>
                    setBookingForm({ ...bookingForm, notes: e.target.value })
                  }
                />
              </div>

              <button
                onClick={submitBooking}
                className="w-full rounded-xl bg-gradient-to-r from-[#0f766e] to-[#0a5a54] px-4 py-3 font-bold text-white shadow-[0_10px_25px_rgba(15,118,110,0.28)] transition hover:from-[#0d6b64] hover:to-[#084944] focus:outline-none focus:ring-4 focus:ring-[#0f766e]/25"
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

const Modal = ({ children, onClose, containerClassName = "" }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#041311]/55 px-4 py-6 backdrop-blur-sm">
    <div
      className={`relative w-full max-w-lg rounded-[1.8rem] border border-[#d4e4de] bg-[#fbfffd] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-8 ${containerClassName}`}
    >
      <button
        className="absolute right-4 top-4 rounded-full p-2 text-[#607a77] transition hover:bg-[#ecf5f2] hover:text-[#173f3b]"
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const coords = getProviderCoords(provider);

  if (!coords) {
    return (
      <Modal onClose={onClose}>
        <h2 className="mb-3 text-xl font-black text-[#0f766e]">
          {provider.basicInfo?.providerName || "Provider"} Location
        </h2>
        <p className="text-[#456360]">
          No saved map coordinates are available for this provider yet.
        </p>
        <p className="mt-2 text-sm text-[#6a8582]">
          {provider.basicInfo?.location || ""}
        </p>
      </Modal>
    );
  }

  const bounds = getSurroundingBounds(coords.lat, coords.lng);

  return (
    <Modal
      onClose={onClose}
      containerClassName={
        isFullscreen
          ? "max-w-none w-[96vw] h-[92vh] p-4 sm:p-6"
          : "max-w-3xl"
      }
    >
      <h2 className="mb-2 text-xl font-black text-[#0f766e]">
        {provider.basicInfo?.providerName || "Provider"} Location
      </h2>

      {provider.basicInfo?.location && (
        <p className="mb-3 text-sm text-[#67817e]">{provider.basicInfo.location}</p>
      )}

      <div
        className={`relative overflow-hidden rounded-xl border border-[#d5e5df] shadow-sm ${
          isFullscreen ? "h-[calc(92vh-170px)]" : "h-80"
        }`}
      >
        <button
          type="button"
          onClick={() => setIsFullscreen((prev) => !prev)}
          className="absolute right-3 top-3 z-[1000] inline-flex items-center justify-center rounded-lg border border-[#c7ddd7] bg-white/95 p-2 text-[#0f766e] shadow transition hover:bg-[#eef8f5]"
          title={isFullscreen ? "Exit full screen" : "View full screen"}
          aria-label={isFullscreen ? "Exit full screen" : "View full screen"}
        >
          {isFullscreen ? <FaCompress /> : <FaExpand />}
        </button>

        <MapContainer
          center={[coords.lat, coords.lng]}
          zoom={13}
          className="h-full w-full"
          scrollWheelZoom={true}
          zoomControl={true}
        >
          <TileLayer url={MAP_TILE_URL} attribution={MAP_ATTRIBUTION} />
          <RecenterMap bounds={bounds} />
          <ResizeMapOnExpand trigger={isFullscreen} bounds={bounds} />
          <Marker position={[coords.lat, coords.lng]} />
          <Circle
            center={[coords.lat, coords.lng]}
            radius={SURROUNDING_RADIUS_METERS}
            pathOptions={{ color: "#0f766e", weight: 2, fillOpacity: 0.06 }}
          />
          <ScaleControl position="bottomleft" />
        </MapContainer>
      </div>

      <p className="mt-3 text-sm text-[#5f7a77]">
        The map now frames nearby roads and neighborhoods around this provider for better area context.
      </p>
    </Modal>
  );
};