// src/pages/Customer/CustomerDashboard.jsx
import { useState, useEffect, useMemo } from "react";
import {
  FaClipboardList,
  FaCompress,
  FaUsers,
  FaStar,
  FaClock,
  FaExpand,
  FaTimes,
  FaRegStar,
  FaStarHalfAlt,
  FaBell,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.jsx";
import Chat from "../../components/Chat/Chat.jsx";
import "../../styles/customerDashboard.css";

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

const MAP_TILE_URL =
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const SURROUNDING_RADIUS_METERS = 2200;

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const getProviderId = (provider) => {
  if (!provider) return "";
  if (typeof provider === "string") return provider;
  return provider._id || provider.id || "";
};

const formatKES = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

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

const BOOKING_CARD_STYLES = [
  {
    shell:
      "border-[#d9e7e2] bg-white shadow-[0_12px_30px_rgba(8,47,43,0.08)] hover:shadow-[0_18px_42px_rgba(8,47,43,0.14)]",
    accent: "from-[#0f766e] to-[#14b8a6]",
    badge: "bg-[#e8f6f2] text-[#0f766e]",
  },
  {
    shell:
      "border-[#dee2f8] bg-white shadow-[0_12px_30px_rgba(49,46,129,0.08)] hover:shadow-[0_18px_42px_rgba(49,46,129,0.14)]",
    accent: "from-[#4f46e5] to-[#0ea5e9]",
    badge: "bg-[#eef2ff] text-[#4338ca]",
  },
  {
    shell:
      "border-[#f0e1cb] bg-white shadow-[0_12px_30px_rgba(120,53,15,0.08)] hover:shadow-[0_18px_42px_rgba(120,53,15,0.14)]",
    accent: "from-[#b45309] to-[#f59e0b]",
    badge: "bg-[#fff4df] text-[#b45309]",
  },
];

const PROVIDER_CARD_STYLES = [
  {
    shell:
      "border-[#d8e6e1] bg-white shadow-[0_12px_30px_rgba(8,47,43,0.08)] hover:shadow-[0_18px_42px_rgba(8,47,43,0.14)]",
    accent: "from-[#0f766e] to-[#14b8a6]",
    avatarRing: "border-[#c9e3da]",
    price: "text-[#0f766e]",
  },
  {
    shell:
      "border-[#dbe3ff] bg-white shadow-[0_12px_30px_rgba(37,99,235,0.08)] hover:shadow-[0_18px_42px_rgba(37,99,235,0.14)]",
    accent: "from-[#2563eb] to-[#7c3aed]",
    avatarRing: "border-[#cbd7ff]",
    price: "text-[#1d4ed8]",
  },
  {
    shell:
      "border-[#f2dfcd] bg-white shadow-[0_12px_30px_rgba(194,65,12,0.08)] hover:shadow-[0_18px_42px_rgba(194,65,12,0.14)]",
    accent: "from-[#c2410c] to-[#f97316]",
    avatarRing: "border-[#f8d6b0]",
    price: "text-[#c2410c]",
  },
];

const pickCardStyle = (styles, index) => styles[index % styles.length];

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

export default function CustomerDashboard() {
  const { user, token, logout } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [providers, setProviders] = useState([]);
  const [bookingFilter, setBookingFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [bookingProvider, setBookingProvider] = useState(null);
  const [selectedService, setSelectedService] = useState("");
  const [notification, setNotification] = useState(null);
  const [mapProvider, setMapProvider] = useState(null);

  const [quickBooking, setQuickBooking] = useState({
    date: "",
    time: "",
    location: "",
    notes: "",
  });

  const [providerReviews, setProviderReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 0, comment: "" });

  const [chatBookingId, setChatBookingId] = useState(null);
  const [expandedBooking, setExpandedBooking] = useState(null);
  const [showAllBookings, setShowAllBookings] = useState(false);

  const handleUnauthorized = () => {
    alert("Session expired. Please log in again.");
    logout();
  };

  const chatBooking = useMemo(
    () => bookings.find((b) => b._id === chatBookingId) || null,
    [bookings, chatBookingId]
  );

  const chatProviderName =
    chatBooking?.provider?.basicInfo?.providerName ||
    chatBooking?.provider?.name ||
    "Provider";

  useEffect(() => {
    if (!user || !token) return;

    const fetchData = async () => {
      try {
        const [bookingsRes, providersRes] = await Promise.all([
          fetch(`${API_URL}/bookings`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/providers`),
        ]);

        if (bookingsRes.status === 401 || providersRes.status === 401) {
          return handleUnauthorized();
        }

        const [bookingsData, providersData] = await Promise.all([
          bookingsRes.json(),
          providersRes.json(),
        ]);

        setBookings(Array.isArray(bookingsData.bookings) ? bookingsData.bookings : []);
        setProviders(Array.isArray(providersData) ? providersData : []);
      } catch (err) {
        console.error("Fetch bookings/providers error:", err);
      }
    };

    fetchData();
  }, [user, token]);

  useEffect(() => {
    if (!selectedProvider?._id) {
      setProviderReviews([]);
      return;
    }

    const fetchReviews = async () => {
      try {
        setReviewsLoading(true);
        const res = await fetch(`${API_URL}/reviews/${selectedProvider._id}`);
        if (res.status === 401) return handleUnauthorized();

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
  }, [selectedProvider]);

  const upcomingBookings = useMemo(
    () => bookings.filter((b) => b.status !== "completed" && b.status !== "cancelled"),
    [bookings]
  );

  const filteredBookings = useMemo(
    () => (bookingFilter === "upcoming" ? upcomingBookings : bookings),
    [bookingFilter, bookings, upcomingBookings]
  );

  const allServices = useMemo(() => {
    const names = providers.flatMap((p) => p.services?.map((s) => s.name) || []);
    return [...new Set(names)];
  }, [providers]);

  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      const matchesSearch = (p.basicInfo?.providerName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesService =
        !serviceFilter ||
        p.services?.some((s) => s.name.toLowerCase() === serviceFilter.toLowerCase());

      return matchesSearch && matchesService;
    });
  }, [providers, searchTerm, serviceFilter]);

  const submitBooking = async () => {
    if (!bookingProvider?._id) {
      alert("Please select a provider.");
      return;
    }

    if (
      !quickBooking.date ||
      !quickBooking.time ||
      !quickBooking.location ||
      !selectedService
    ) {
      alert("Please complete all booking fields.");
      return;
    }

    try {
      const scheduledAt = new Date(`${quickBooking.date}T${quickBooking.time}`);

      const res = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerId: bookingProvider._id,
          serviceId: selectedService,
          scheduledAt,
          location: quickBooking.location,
          notes: quickBooking.notes,
        }),
      });

      if (res.status === 401) return handleUnauthorized();

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Booking failed");

      setBookings((prev) => [data.booking, ...prev]);
      setNotification("Booking confirmed!");
      setBookingProvider(null);
      setQuickBooking({ date: "", time: "", location: "", notes: "" });
      setSelectedService("");
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      alert(err.message);
    }
  };

  const openReviewModal = (booking) => {
    setReviewBooking(booking);
    setReviewData({ rating: 0, comment: "" });
  };

  const submitReview = async () => {
    if (!reviewData.rating) {
      alert("Please select a rating.");
      return;
    }

    if (!reviewBooking?._id) {
      alert("Invalid booking.");
      return;
    }

    try {
      const providerId = getProviderId(reviewBooking.provider);
      if (!providerId) throw new Error("Provider not found for this booking.");

      const res = await fetch(`${API_URL}/reviews`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerId: String(providerId),
          bookingId: reviewBooking._id,
          rating: reviewData.rating,
          comment: reviewData.comment,
        }),
      });

      if (res.status === 401) return handleUnauthorized();

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit review");

      setBookings((prev) =>
        prev.map((b) => (b._id === reviewBooking._id ? { ...b, reviewed: true } : b))
      );

      if (selectedProvider?._id === providerId) {
        const refreshed = await fetch(`${API_URL}/reviews/${providerId}`);
        if (refreshed.status === 401) return handleUnauthorized();

        const refreshedData = await refreshed.json();
        setProviderReviews(
          Array.isArray(refreshedData.reviews) ? refreshedData.reviews : []
        );
      }

      setReviewBooking(null);
      setNotification("Review submitted!");
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error("SUBMIT REVIEW ERROR:", err);
      alert(err.message);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eef6f3] p-4 sm:p-6">
      <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-[#0f766e]/15 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-20 h-72 w-72 rounded-full bg-[#ca8a04]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-[#14b8a6]/10 blur-3xl" />

      <div className="relative mb-8 flex flex-wrap items-start justify-between gap-4 rounded-[1.75rem] border border-[#d4e5df] bg-gradient-to-r from-[#f6fffc] via-[#eef9f5] to-[#fef6e4] px-5 py-6 shadow-[0_18px_60px_rgba(8,47,43,0.12)] sm:px-7 sm:py-8">
        <div>
          <p className="inline-flex rounded-full bg-[#0f766e]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#0f766e]">
            Customer Control Center
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#143f3a] sm:text-4xl">
            Welcome {user?.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#4b6764] sm:text-base">
            Track bookings, find top-rated providers, and manage every service interaction from one clean workspace.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-[#d5e5df] bg-white/85 px-4 py-3 text-[#355956] shadow-sm">
          <FaBell className="text-base" />
          <span className="text-sm font-semibold">Updates</span>
        </div>
      </div>

      {notification && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm">
          {notification}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div onClick={() => setBookingFilter("all")}>
          <Stat
            icon={<FaClipboardList />}
            label="Bookings"
            value={bookings.length}
            tone="teal"
            delay={0}
          />
        </div>
        <Stat
          icon={<FaUsers />}
          label="Providers"
          value={providers.length}
          tone="blue"
          delay={90}
        />
        <Stat
          icon={<FaStar />}
          label="Avg Rating"
          value={
            providers.length
              ? (
                  providers.reduce((a, b) => a + (b.rating || 0), 0) / providers.length
                ).toFixed(1)
              : "0"
          }
          tone="amber"
          delay={180}
        />
        <div onClick={() => setBookingFilter("upcoming")}>
          <Stat
            icon={<FaClock />}
            label="Upcoming"
            value={upcomingBookings.length}
            tone="teal"
            delay={270}
          />
        </div>
      </div>

      <Section title={bookingFilter === "upcoming" ? "Upcoming Bookings" : "Your Bookings"}>
        {filteredBookings.length === 0 ? (
          <Empty text="No bookings yet." />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {(showAllBookings ? filteredBookings : filteredBookings.slice(0, 4)).map((b, idx) => {
                const cardStyle = pickCardStyle(BOOKING_CARD_STYLES, idx);
                const isExpanded = expandedBooking === b._id;

                return (
                  <div
                    key={b._id}
                    className={`dashboard-reveal overflow-hidden rounded-2xl border transition ${cardStyle.shell}`}
                    style={{ animationDelay: `${idx * 65}ms` }}
                  >
                    <div className={`h-1.5 w-full bg-gradient-to-r ${cardStyle.accent}`} />
                    
                    <div className="p-5">
                      {/* Collapsed View */}
                      {!isExpanded ? (
                        <>
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-bold text-[#183f3b]">{b.serviceName}</p>
                              <p className="truncate text-sm text-[#5f7a77]">
                                {b.provider?.basicInfo?.providerName || b.provider?.name}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              <StatusBadge status={b.status} />
                            </div>
                          </div>
                          <p className="mb-4 text-xs text-[#7a9391]">
                            {new Date(b.scheduledAt).toLocaleString()}
                          </p>
                          <button
                            onClick={() => setExpandedBooking(b._id)}
                            className="w-full rounded-lg border border-[#0f766e] bg-white px-3 py-2 text-xs font-bold text-[#0f766e] transition hover:bg-[#0f766e] hover:text-white"
                          >
                            View Details
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Expanded View */}
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                              <p className="text-base font-bold text-[#183f3b]">{b.serviceName}</p>
                              <p className="mt-1 text-sm text-[#5f7a77]">
                                {b.provider?.basicInfo?.providerName || b.provider?.name}
                              </p>
                            </div>
                            <StatusBadge status={b.status} />
                          </div>

                          <div className="mb-4 space-y-3 rounded-lg bg-[#f8fcfb] p-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-[#4f6e6b]">Date & Time</p>
                              <p className="mt-1 text-sm text-[#5f7a77]">{new Date(b.scheduledAt).toLocaleString()}</p>
                            </div>
                            {b.location && (
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-[#4f6e6b]">Location</p>
                                <p className="mt-1 text-sm text-[#5f7a77]">{b.location}</p>
                              </div>
                            )}
                            {b.notes && (
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-[#4f6e6b]">Notes</p>
                                <p className="mt-1 text-sm text-[#5f7a77]">{b.notes}</p>
                              </div>
                            )}
                          </div>

                          <div className="mb-4 rounded-lg bg-[#f0f8f6] px-3 py-2">
                            <p className={`text-lg font-black ${cardStyle.price}`}>
                              {formatKES(b.servicePrice || 0)}
                            </p>
                            <p className="text-xs text-[#5f7a77]">Service cost</p>
                          </div>

                          <div className="space-y-2 border-t border-[#e0ebe8] pt-3">
                            {b.status === "completed" && !b.reviewed && (
                              <button
                                onClick={() => openReviewModal(b)}
                                className="w-full rounded-lg border border-[#0f766e] bg-white px-3 py-2 text-xs font-bold text-[#0f766e] transition hover:bg-[#0f766e] hover:text-white"
                              >
                                Leave Review
                              </button>
                            )}
                            {b.status !== "cancelled" && (
                              <button
                                onClick={() => setChatBookingId(b._id)}
                                className="w-full rounded-lg border border-[#0f766e] bg-white px-3 py-2 text-xs font-bold text-[#0f766e] transition hover:bg-[#0f766e] hover:text-white"
                              >
                                Chat with Provider
                              </button>
                            )}
                            {b.reviewed && (
                              <span className={`inline-flex w-full justify-center rounded-lg px-2.5 py-2 text-xs font-bold ${cardStyle.badge}`}>
                                ✓ Reviewed
                              </span>
                            )}
                            <button
                              onClick={() => setExpandedBooking(null)}
                              className="w-full rounded-lg bg-[#e8f6f2] px-3 py-2 text-xs font-bold text-[#0f766e] transition hover:bg-[#d4f0eb]"
                            >
                              Collapse
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* View More Button */}
            {filteredBookings.length > 4 && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setShowAllBookings(!showAllBookings)}
                  className="rounded-xl bg-gradient-to-r from-[#0f766e] to-[#0d6b64] px-8 py-3 font-bold text-white shadow-lg transition hover:shadow-xl hover:scale-105"
                >
                  {showAllBookings ? "Show Less" : `View More (${filteredBookings.length - 4})`}
                </button>
              </div>
            )}
          </>
        )}
      </Section>

      <Section title="Available Providers">
        <div className="mb-6 flex flex-wrap gap-4">
          <input
            placeholder="Search provider"
            className="rounded-xl border border-[#d6e5e0] bg-[#f8fcfb] px-4 py-2.5 text-[#1f3f3b] outline-none transition placeholder:text-[#8aa5a1] focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/15"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="rounded-xl border border-[#d6e5e0] bg-[#f8fcfb] px-4 py-2.5 text-[#1f3f3b] outline-none transition focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/15"
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
          >
            <option value="">All Services</option>
            {allServices.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="max-h-[500px] overflow-y-auto">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProviders.map((p, idx) => {
              const cardStyle = pickCardStyle(PROVIDER_CARD_STYLES, idx);
              const coords = getProviderCoords(p);

              return (
                <div
                  key={p._id}
                  onClick={() => setSelectedProvider(p)}
                  className={`dashboard-reveal cursor-pointer overflow-hidden rounded-2xl border p-4 transition hover:-translate-y-1 ${cardStyle.shell}`}
                  style={{ animationDelay: `${idx * 75}ms` }}
                >
                  <div className={`mb-3 h-1 w-full rounded-full bg-gradient-to-r ${cardStyle.accent}`} />
                  <div className="mb-3 flex justify-center">
                    <img
                      src={p.basicInfo?.photoURL || "https://dummyimage.com/300x300/ccc/000"}
                      alt={p.basicInfo?.providerName || "Provider"}
                      className={`h-20 w-20 rounded-2xl border-2 object-cover shadow-sm ${cardStyle.avatarRing}`}
                    />
                  </div>

                  <h3 className="text-lg font-extrabold text-[#133f3a]">
                    {p.basicInfo?.providerName}
                  </h3>

                  <p className="text-sm text-[#597572]">
                    {p.services?.map((s) => s.name).join(", ")}
                  </p>

                  <div className="flex items-center justify-center gap-2">
                    <StarRating rating={p.rating} />
                    <span className="text-sm font-semibold text-[#45615e]">{(p.rating || 0).toFixed(1)}</span>
                  </div>

                  <p className="mt-1 text-sm text-[#607a77]">{p.experience} years experience</p>

                  <p className={`mt-1 font-bold ${cardStyle.price}`}>
                    From {formatKES(p.services?.[0]?.price || 20)}
                  </p>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMapProvider(p);
                    }}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-[#d4e4de] bg-[#f7fcfa] px-3 py-2 text-sm font-semibold text-[#41625f] transition hover:border-[#0f766e]/40 hover:text-[#0f766e]"
                  >
                    <FaMapMarkerAlt />
                    <span>{coords ? "View map" : "No map data"}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {selectedProvider && (
        <ProviderModal
          selectedProvider={selectedProvider}
          setSelectedProvider={setSelectedProvider}
          providerReviews={providerReviews}
          reviewsLoading={reviewsLoading}
          setBookingProvider={setBookingProvider}
          setSelectedService={setSelectedService}
        />
      )}

      {bookingProvider && (
        <BookingModal
          bookingProvider={bookingProvider}
          quickBooking={quickBooking}
          setQuickBooking={setQuickBooking}
          selectedService={selectedService}
          setSelectedService={setSelectedService}
          submitBooking={submitBooking}
          setBookingProvider={setBookingProvider}
        />
      )}

      {reviewBooking && (
        <ReviewModal
          reviewBooking={reviewBooking}
          reviewData={reviewData}
          setReviewData={setReviewData}
          submitReview={submitReview}
          setReviewBooking={setReviewBooking}
        />
      )}

      {chatBookingId && (
        <ChatModal
          booking={chatBooking}
          providerName={chatProviderName}
          token={token}
          userId={user?._id || user?.id}
          onClose={() => setChatBookingId(null)}
        />
      )}

      {mapProvider && <MapModal provider={mapProvider} onClose={() => setMapProvider(null)} />}
    </div>
  );
}

const Stat = ({ icon, label, value, tone = "teal", delay = 0 }) => {
  const tones = {
    teal: {
      card: "border-[#cfe2db] bg-white text-[#133f3a]",
      icon: "bg-[#e9f6f2] text-[#0f766e]",
      value: "text-[#143f3a]",
    },
    blue: {
      card: "border-[#d8e2ff] bg-white text-[#1e2a5a]",
      icon: "bg-[#eef2ff] text-[#4338ca]",
      value: "text-[#1e2a5a]",
    },
    amber: {
      card: "border-[#f0dfc7] bg-white text-[#5f3b11]",
      icon: "bg-[#fff4df] text-[#b45309]",
      value: "text-[#5f3b11]",
    },
  };

  const t = tones[tone] || tones.teal;

  return (
    <div
      className={`dashboard-reveal flex cursor-pointer items-center gap-4 rounded-2xl border p-5 shadow-[0_10px_30px_rgba(8,47,43,0.08)] transition hover:-translate-y-1 hover:shadow-[0_14px_36px_rgba(8,47,43,0.15)] ${t.card}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`rounded-xl p-3 text-xl ${t.icon}`}>{icon}</div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#5c7976]">{label}</p>
      <p className={`text-2xl font-black ${t.value}`}>{value}</p>
    </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="mb-8 rounded-[1.6rem] border border-[#d4e5df] bg-white/95 p-6 shadow-[0_14px_40px_rgba(8,47,43,0.1)]">
    <h2 className="mb-4 text-xl font-black text-[#0f766e]">{title}</h2>
    {children}
  </div>
);

const Empty = ({ text }) => (
  <p className="rounded-xl border border-[#dbe8e3] bg-[#f8fcfb] py-8 text-center text-[#607a77]">
    {text}
  </p>
);

const StatusBadge = ({ status }) => {
  const styles = {
    pending: "bg-yellow-100 text-yellow-700",
    accepted: "bg-teal-100 text-teal-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
};

const StarRating = ({ rating = 0 }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) stars.push(<FaStar key={i} className="text-yellow-400" />);
    else if (rating >= i - 0.5)
      stars.push(<FaStarHalfAlt key={i} className="text-yellow-400" />);
    else stars.push(<FaRegStar key={i} className="text-gray-300" />);
  }
  return <div className="flex justify-center gap-1">{stars}</div>;
};

const StarRatingSelector = ({ rating, setRating }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} onClick={() => setRating(i)} className="cursor-pointer">
        {i <= rating ? (
          <FaStar className="inline text-yellow-400" />
        ) : (
          <FaRegStar className="inline text-gray-300" />
        )}
      </span>
    );
  }
  return <div className="mb-2 flex justify-center gap-1">{stars}</div>;
};

const Modal = ({ children, onClose, panelClassName = "max-w-lg" }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#041311]/50 p-0 backdrop-blur-sm sm:p-4">
    <div
      className={`relative flex w-full flex-col overflow-hidden rounded-none border border-[#d4e5df] bg-[#fcfffe] shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:max-h-[85vh] sm:rounded-2xl ${panelClassName}`}
    >
      <button
        className="absolute right-3 top-3 z-10 rounded-full p-2 text-[#607a77] hover:bg-[#ecf5f2] hover:text-[#173f3b]"
        onClick={onClose}
        aria-label="Close modal"
      >
        <FaTimes />
      </button>
      {children}
    </div>
  </div>
);

const ChatModal = ({ booking, providerName, token, userId, onClose }) => (
  <div className="fixed inset-0 z-50 bg-[#041311]/50 p-0 backdrop-blur-sm sm:p-4">
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden border border-[#d4e5df] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:mx-auto sm:h-[85vh] sm:w-11/12 sm:max-w-5xl sm:rounded-2xl">
      <div className="flex shrink-0 items-center justify-between border-b border-[#dde8e4] px-4 py-3 sm:px-6 sm:py-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-black text-[#0f766e] sm:text-lg">
            Chat with {providerName}
          </h2>
          {booking?.serviceName && (
            <p className="truncate text-xs text-[#688380] sm:text-sm">
              {booking.serviceName}
            </p>
          )}
        </div>

        <button
          className="ml-4 rounded-full p-2 text-[#607a77] hover:bg-[#ecf5f2] hover:text-[#173f3b]"
          onClick={onClose}
          aria-label="Close chat"
        >
          <FaTimes />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="h-full min-h-0 w-full p-2 sm:p-4">
          <div className="h-full min-h-0 overflow-hidden rounded-xl border border-[#d6e6e0] bg-white">
            <Chat bookingId={booking?._id} token={token} userId={userId} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const MapModal = ({ provider, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const coords = getProviderCoords(provider);

  if (!coords) {
    return (
      <Modal onClose={onClose} panelClassName="max-w-md">
        <div className="p-6 pt-10 sm:p-6 sm:pt-10">
          <h2 className="mb-3 text-xl font-black text-[#0f766e]">
            {provider.basicInfo?.providerName || "Provider"} Location
          </h2>
          <p className="text-[#456360]">
            No saved map coordinates are available for this provider yet.
          </p>
          <p className="mt-2 text-sm text-[#6a8582]">
            {provider.basicInfo?.location || ""}
          </p>
        </div>
      </Modal>
    );
  }

  const bounds = getSurroundingBounds(coords.lat, coords.lng);

  return (
    <Modal
      onClose={onClose}
      panelClassName={
        isFullscreen
          ? "max-w-none w-[96vw] h-[92vh]"
          : "max-w-md lg:max-w-md"
      }
    >
      <div className="p-6 pt-10 sm:p-6 sm:pt-10">
        <h2 className="mb-2 text-xl font-black text-[#0f766e]">
          {provider.basicInfo?.providerName || "Provider"} Location
        </h2>

        {provider.basicInfo?.location && (
          <p className="mb-3 text-sm text-[#67817e]">{provider.basicInfo.location}</p>
        )}

        <div
          className={`relative overflow-hidden rounded-xl border border-[#d5e5df] shadow-sm ${
            isFullscreen ? "h-[calc(92vh-170px)]" : "h-72"
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
          The map frames nearby roads and neighborhoods around this provider for better area context.
        </p>
      </div>
    </Modal>
  );
};

const ProviderModal = ({
  selectedProvider,
  setSelectedProvider,
  providerReviews,
  reviewsLoading,
  setBookingProvider,
  setSelectedService,
}) => {
  const providerName =
    selectedProvider.basicInfo?.providerName || selectedProvider.name || "Provider";

  const services = selectedProvider.services || [];
  const primaryService = services?.[0];
  const location = selectedProvider.basicInfo?.location || "";
  const coords = getProviderCoords(selectedProvider);

  return (
    <Modal onClose={() => setSelectedProvider(null)} panelClassName="max-w-2xl">
      <div className="max-h-[85vh] overflow-y-auto p-6 pt-10 sm:p-7 sm:pt-10">
        <div className="rounded-3xl border border-[#d4e5df] bg-gradient-to-r from-[#f7fffc] via-[#edf8f4] to-[#fef6e4] p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start gap-4 sm:flex-nowrap">
            <div className="mx-auto sm:mx-0">
              <img
                src={
                  selectedProvider.basicInfo?.photoURL ||
                  "https://dummyimage.com/300x300/ccc/000"
                }
                alt={providerName}
                className="h-24 w-24 rounded-2xl border-2 border-[#c9e3da] object-cover shadow-md"
              />
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h2 className="truncate text-2xl font-black text-[#143f3a]">{providerName}</h2>

              <div className="mt-2 flex items-center justify-center gap-2 sm:justify-start">
                <StarRating rating={selectedProvider.rating} />
                <span className="text-sm font-bold text-[#395c58]">
                  {(selectedProvider.rating || 0).toFixed(1)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#4f6d69] ring-1 ring-[#d4e5df]">
                  {selectedProvider.experience
                    ? `${selectedProvider.experience} years experience`
                    : "Experience not listed"}
                </span>
                {location && (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#4f6d69] ring-1 ring-[#d4e5df]">
                    {location}
                  </span>
                )}
                {coords && (
                  <span className="rounded-full bg-[#e8f6f2] px-3 py-1 text-xs font-semibold text-[#0f766e]">
                    <span className="inline-flex items-center gap-1">
                      <FaMapMarkerAlt />
                      Map available
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#dbe7e3] bg-[#f8fcfb] p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#4f6e6b]">Services</p>
            {primaryService && (
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0f766e] ring-1 ring-[#d9e7e2]">
                From {formatKES(primaryService.price || 0)}
              </span>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {services.length > 0 ? (
              services.map((s) => (
                <div
                  key={s._id}
                  className="rounded-xl border border-[#d9e7e2] bg-white px-3 py-2 text-sm font-medium text-[#425f5c]"
                >
                  {s.name}
                </div>
              ))
            ) : (
              <span className="text-sm text-slate-500">No services listed</span>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#dbe7e3] bg-white p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#0f766e]">Recent Reviews</h3>

          {reviewsLoading ? (
            <p className="text-sm text-gray-500">Loading reviews...</p>
          ) : providerReviews.length === 0 ? (
            <p className="text-sm text-gray-500">No reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {providerReviews.map((r) => (
                <div key={r._id} className="rounded-xl border border-[#dbe7e3] bg-[#fbfefd] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {r.customer?.name || "Anonymous"}
                    </p>
                    <StarRating rating={r.rating} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="flex-1 rounded-xl border border-[#d7e6e1] bg-white px-4 py-3 font-semibold text-[#4f6d69] transition hover:bg-[#f8fcfb]"
            onClick={() => setSelectedProvider(null)}
          >
            Close
          </button>

          <button
            className="flex-1 rounded-xl bg-gradient-to-r from-[#0f766e] to-[#0a5a54] px-4 py-3 font-semibold text-white transition hover:from-[#0d6b64] hover:to-[#084944]"
            onClick={() => {
              setBookingProvider(selectedProvider);
              setSelectedProvider(null);
              setSelectedService("");
            }}
          >
            Continue to Booking
          </button>
        </div>
      </div>
    </Modal>
  );
};

const BookingModal = ({
  bookingProvider,
  quickBooking,
  setQuickBooking,
  selectedService,
  setSelectedService,
  submitBooking,
  setBookingProvider,
}) => {
  const selectedServiceObj =
    bookingProvider.services?.find((s) => s._id === selectedService) || null;

  return (
    <Modal onClose={() => setBookingProvider(null)} panelClassName="max-w-2xl">
      <div className="max-h-[85vh] overflow-y-auto p-6 pt-10 sm:p-7 sm:pt-10">
        <div className="rounded-3xl border border-[#d4e5df] bg-gradient-to-r from-[#f7fffc] via-[#edf8f4] to-[#fef6e4] p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-black text-[#0f766e] sm:text-2xl">
            Book {bookingProvider.basicInfo?.providerName}
          </h2>
          <p className="mt-1 text-sm text-[#67817e]">
            Choose service details, schedule, and location to confirm this booking.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#4f6d69] ring-1 ring-[#d4e5df]">
              {bookingProvider.services?.length || 0} services available
            </span>
            {selectedServiceObj && (
              <span className="rounded-full bg-[#e8f6f2] px-3 py-1 text-xs font-semibold text-[#0f766e]">
                Selected: {selectedServiceObj.name} ({formatKES(selectedServiceObj.price)})
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#dbe7e3] bg-[#f8fcfb] p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#4f6e6b]">
                Date
              </label>
              <input
                type="date"
                className="w-full rounded-xl border border-[#d4e4df] bg-white px-3 py-2.5 outline-none transition focus:border-[#0f766e] focus:ring-4 focus:ring-[#0f766e]/15"
                value={quickBooking.date}
                onChange={(e) =>
                  setQuickBooking((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#4f6e6b]">
                Time
              </label>
              <input
                type="time"
                className="w-full rounded-xl border border-[#d4e4df] bg-white px-3 py-2.5 outline-none transition focus:border-[#0f766e] focus:ring-4 focus:ring-[#0f766e]/15"
                value={quickBooking.time}
                onChange={(e) =>
                  setQuickBooking((prev) => ({ ...prev, time: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#4f6e6b]">
              Service
            </label>
            <select
              className="w-full rounded-xl border border-[#d4e4df] bg-white px-3 py-2.5 outline-none transition focus:border-[#0f766e] focus:ring-4 focus:ring-[#0f766e]/15"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
            >
              <option value="">Select Service</option>
              {bookingProvider.services?.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} - {formatKES(s.price)}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#4f6e6b]">
              Location
            </label>
            <input
              type="text"
              placeholder="Estate, street, landmark"
              className="w-full rounded-xl border border-[#d4e4df] bg-white px-3 py-2.5 outline-none transition placeholder:text-[#8aa5a1] focus:border-[#0f766e] focus:ring-4 focus:ring-[#0f766e]/15"
              value={quickBooking.location}
              onChange={(e) =>
                setQuickBooking((prev) => ({ ...prev, location: e.target.value }))
              }
            />
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#4f6e6b]">
              Notes
            </label>
            <textarea
              placeholder="Any instructions for the provider"
              rows={3}
              className="w-full rounded-xl border border-[#d4e4df] bg-white px-3 py-2.5 outline-none transition placeholder:text-[#8aa5a1] focus:border-[#0f766e] focus:ring-4 focus:ring-[#0f766e]/15"
              value={quickBooking.notes}
              onChange={(e) =>
                setQuickBooking((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="flex-1 rounded-xl border border-[#d7e6e1] bg-white px-4 py-3 font-semibold text-[#4f6d69] transition hover:bg-[#f8fcfb]"
            onClick={() => setBookingProvider(null)}
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-xl bg-gradient-to-r from-[#0f766e] to-[#0a5a54] px-4 py-3 font-semibold text-white transition hover:from-[#0d6b64] hover:to-[#084944]"
            onClick={submitBooking}
          >
            Confirm Booking
          </button>
        </div>
      </div>
    </Modal>
  );
};

const ReviewModal = ({
  reviewBooking,
  reviewData,
  setReviewData,
  submitReview,
  setReviewBooking,
}) => (
  <Modal onClose={() => setReviewBooking(null)} panelClassName="max-w-md">
    <div className="p-6 pt-10 sm:p-6 sm:pt-10">
      <h2 className="mb-4 text-xl font-black text-[#0f766e]">
        Review {reviewBooking.serviceName}
      </h2>
      <StarRatingSelector
        rating={reviewData.rating}
        setRating={(r) => setReviewData((prev) => ({ ...prev, rating: r }))}
      />
      <textarea
        placeholder="Comment"
        className="w-full rounded-xl border border-[#d4e4df] bg-[#f7fcfa] px-3 py-2.5 outline-none transition focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/15"
        value={reviewData.comment}
        onChange={(e) => setReviewData((prev) => ({ ...prev, comment: e.target.value }))}
      />
      <button
        className="mt-3 w-full rounded-xl bg-gradient-to-r from-[#0f766e] to-[#0a5a54] py-3 font-semibold text-white transition hover:from-[#0d6b64] hover:to-[#084944]"
        onClick={submitReview}
      >
        Submit Review
      </button>
    </div>
  </Modal>
);