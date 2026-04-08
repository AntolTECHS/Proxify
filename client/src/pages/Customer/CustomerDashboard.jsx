// src/pages/Customer/CustomerDashboard.jsx
import { useState, useEffect, useMemo } from "react";
import {
  FaClipboardList,
  FaUsers,
  FaStar,
  FaClock,
  FaTimes,
  FaRegStar,
  FaStarHalfAlt,
  FaBell,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.jsx";
import Chat from "../../components/Chat/Chat.jsx";

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const MAP_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

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
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-teal-600 sm:text-3xl">
          Welcome {user?.name}
        </h1>
        <FaBell className="text-xl text-gray-500" />
      </div>

      {notification && (
        <div className="mb-6 rounded-lg bg-green-100 px-4 py-2 text-green-700">
          {notification}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div onClick={() => setBookingFilter("all")}>
          <Stat icon={<FaClipboardList />} label="Bookings" value={bookings.length} />
        </div>
        <Stat icon={<FaUsers />} label="Providers" value={providers.length} />
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
        />
        <div onClick={() => setBookingFilter("upcoming")}>
          <Stat icon={<FaClock />} label="Upcoming" value={upcomingBookings.length} />
        </div>
      </div>

      <Section title={bookingFilter === "upcoming" ? "Upcoming Bookings" : "Your Bookings"}>
        {filteredBookings.length === 0 ? (
          <Empty text="No bookings yet." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredBookings.map((b) => (
              <div key={b._id} className="rounded-xl bg-white p-4 shadow">
                <p className="font-semibold">{b.serviceName}</p>
                <p className="text-sm text-gray-500">
                  {b.provider?.basicInfo?.providerName || b.provider?.name}
                </p>
                <p className="text-sm text-gray-400">
                  {new Date(b.scheduledAt).toLocaleString()}
                </p>
                <div className="mt-2">
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  {b.status === "completed" && !b.reviewed && (
                    <button
                      onClick={() => openReviewModal(b)}
                      className="text-sm text-teal-600 underline"
                    >
                      Leave Review
                    </button>
                  )}
                  {b.status !== "cancelled" && (
                    <button
                      onClick={() => setChatBookingId(b._id)}
                      className="text-sm text-teal-600 underline"
                    >
                      Chat
                    </button>
                  )}
                  {b.reviewed && (
                    <span className="text-sm font-medium text-green-600">Reviewed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Available Providers">
        <div className="mb-6 flex flex-wrap gap-4">
          <input
            placeholder="Search provider"
            className="rounded-lg border px-3 py-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="rounded-lg border px-3 py-2"
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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
            {filteredProviders.map((p) => {
              const coords = getProviderCoords(p);

              return (
                <div
                  key={p._id}
                  onClick={() => setSelectedProvider(p)}
                  className="cursor-pointer overflow-hidden rounded-xl bg-white p-4 text-center shadow transition hover:shadow-lg"
                >
                  <div className="mb-3 flex justify-center">
                    <img
                      src={p.basicInfo?.photoURL || "https://dummyimage.com/300x300/ccc/000"}
                      alt={p.basicInfo?.providerName || "Provider"}
                      className="h-24 w-24 rounded-full border-4 border-teal-100 object-cover shadow"
                    />
                  </div>

                  <h3 className="text-lg font-bold text-teal-600">
                    {p.basicInfo?.providerName}
                  </h3>

                  <p className="text-sm text-gray-500">
                    {p.services?.map((s) => s.name).join(", ")}
                  </p>

                  <div className="flex items-center justify-center gap-2">
                    <StarRating rating={p.rating} />
                    <span className="text-sm">{(p.rating || 0).toFixed(1)}</span>
                  </div>

                  <p className="mt-1 text-sm">{p.experience} years experience</p>

                  <p className="mt-1 font-semibold text-teal-600">
                    From {formatKES(p.services?.[0]?.price || 20)}
                  </p>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMapProvider(p);
                    }}
                    className="mt-3 inline-flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-teal-600"
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

const Stat = ({ icon, label, value }) => (
  <div className="flex cursor-pointer items-center gap-4 rounded-xl bg-teal-600 p-5 text-white shadow transition hover:bg-teal-700">
    <div className="text-2xl text-white">{icon}</div>
    <div>
      <p className="text-sm text-white/90">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <div className="mb-8 rounded-xl bg-white p-6 shadow">
    <h2 className="mb-4 text-xl font-semibold text-teal-600">{title}</h2>
    {children}
  </div>
);

const Empty = ({ text }) => <p className="py-6 text-center text-gray-500">{text}</p>;

const StatusBadge = ({ status }) => {
  const styles = {
    pending: "bg-yellow-100 text-yellow-700",
    accepted: "bg-teal-100 text-teal-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-sm ${
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
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-0 sm:p-4">
    <div
      className={`relative flex w-full flex-col overflow-hidden rounded-none bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-2xl ${panelClassName}`}
    >
      <button
        className="absolute right-3 top-3 z-10 rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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
  <div className="fixed inset-0 z-50 bg-black/40 p-0 sm:p-4">
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:mx-auto sm:h-[85vh] sm:w-11/12 sm:max-w-5xl sm:rounded-2xl">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-teal-600 sm:text-lg">
            Chat with {providerName}
          </h2>
          {booking?.serviceName && (
            <p className="truncate text-xs text-gray-500 sm:text-sm">
              {booking.serviceName}
            </p>
          )}
        </div>

        <button
          className="ml-4 rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          onClick={onClose}
          aria-label="Close chat"
        >
          <FaTimes />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="h-full min-h-0 w-full p-2 sm:p-4">
          <div className="h-full min-h-0 overflow-hidden rounded-xl border bg-white">
            <Chat bookingId={booking?._id} token={token} userId={userId} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const MapModal = ({ provider, onClose }) => {
  const coords = getProviderCoords(provider);

  if (!coords) {
    return (
      <Modal onClose={onClose} panelClassName="max-w-md">
        <div className="p-6 pt-10 sm:p-6 sm:pt-10">
          <h2 className="mb-3 text-xl font-bold text-teal-600">
            {provider.basicInfo?.providerName || "Provider"} Location
          </h2>
          <p className="text-gray-600">
            No saved map coordinates are available for this provider yet.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {provider.basicInfo?.location || ""}
          </p>
        </div>
      </Modal>
    );
  }

  const bounds = [
    [coords.lat, coords.lng],
    [coords.lat, coords.lng],
  ];

  return (
    <Modal onClose={onClose} panelClassName="max-w-md lg:max-w-md">
      <div className="p-6 pt-10 sm:p-6 sm:pt-10">
        <h2 className="mb-2 text-xl font-bold text-teal-600">
          {provider.basicInfo?.providerName || "Provider"} Location
        </h2>

        {provider.basicInfo?.location && (
          <p className="mb-3 text-sm text-gray-500">{provider.basicInfo.location}</p>
        )}

        <div className="h-72 overflow-hidden rounded-xl border shadow-sm">
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
    <Modal onClose={() => setSelectedProvider(null)} panelClassName="max-w-sm sm:max-w-md">
      <div className="mx-auto max-w-sm p-6 pt-10 sm:p-6 sm:pt-10">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-teal-50 ring-4 ring-teal-100">
            <img
              src={
                selectedProvider.basicInfo?.photoURL ||
                "https://dummyimage.com/300x300/ccc/000"
              }
              alt={providerName}
              className="h-24 w-24 rounded-full object-cover"
            />
          </div>

          <h2 className="text-2xl font-bold text-slate-900">{providerName}</h2>

          <div className="mt-2 flex items-center justify-center gap-2">
            <StarRating rating={selectedProvider.rating} />
            <span className="text-sm font-semibold text-slate-700">
              {(selectedProvider.rating || 0).toFixed(1)}
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {selectedProvider.experience
              ? `${selectedProvider.experience} years experience`
              : "Experience not listed"}
          </p>

          {location && <p className="mt-1 text-sm text-slate-500">{location}</p>}
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">Services</p>
          <div className="flex flex-wrap justify-center gap-2">
            {services.length > 0 ? (
              services.map((s) => (
                <span
                  key={s._id}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200"
                >
                  {s.name}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">No services listed</span>
            )}
          </div>

          {primaryService && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
              <span className="text-sm text-slate-600">Starting price</span>
              <span className="text-sm font-semibold text-teal-600">
                {formatKES(primaryService.price || 0)}
              </span>
            </div>
          )}
        </div>

        {coords && (
          <button
            onClick={() => setSelectedProvider(null)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            <FaMapMarkerAlt />
            Map available
          </button>
        )}

        <button
          className="mt-4 w-full rounded-xl bg-teal-600 px-4 py-3 font-semibold text-white transition hover:bg-teal-700"
          onClick={() => {
            setBookingProvider(selectedProvider);
            setSelectedProvider(null);
            setSelectedService("");
          }}
        >
          Book Now
        </button>

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-teal-600">Reviews</h3>

          {reviewsLoading ? (
            <p className="text-sm text-gray-500">Loading reviews...</p>
          ) : providerReviews.length === 0 ? (
            <p className="text-sm text-gray-500">No reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {providerReviews.map((r) => (
                <div key={r._id} className="rounded-xl border border-slate-200 p-3">
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
}) => (
  <Modal onClose={() => setBookingProvider(null)} panelClassName="max-w-md">
    <div className="p-6 pt-10 sm:p-6 sm:pt-10">
      <h2 className="mb-4 text-xl font-bold text-teal-600">
        Book {bookingProvider.basicInfo?.providerName}
      </h2>

      <div className="space-y-3">
        <input
          type="date"
          className="w-full rounded-lg border px-3 py-2"
          value={quickBooking.date}
          onChange={(e) =>
            setQuickBooking((prev) => ({ ...prev, date: e.target.value }))
          }
        />
        <input
          type="time"
          className="w-full rounded-lg border px-3 py-2"
          value={quickBooking.time}
          onChange={(e) =>
            setQuickBooking((prev) => ({ ...prev, time: e.target.value }))
          }
        />
        <input
          type="text"
          placeholder="Location"
          className="w-full rounded-lg border px-3 py-2"
          value={quickBooking.location}
          onChange={(e) =>
            setQuickBooking((prev) => ({ ...prev, location: e.target.value }))
          }
        />
        <textarea
          placeholder="Notes"
          className="w-full rounded-lg border px-3 py-2"
          value={quickBooking.notes}
          onChange={(e) =>
            setQuickBooking((prev) => ({ ...prev, notes: e.target.value }))
          }
        />
        <select
          className="w-full rounded-lg border px-3 py-2"
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

        <button
          className="w-full rounded-lg bg-teal-600 py-3 font-semibold text-white transition hover:bg-teal-700"
          onClick={submitBooking}
        >
          Confirm Booking
        </button>
      </div>
    </div>
  </Modal>
);

const ReviewModal = ({
  reviewBooking,
  reviewData,
  setReviewData,
  submitReview,
  setReviewBooking,
}) => (
  <Modal onClose={() => setReviewBooking(null)} panelClassName="max-w-md">
    <div className="p-6 pt-10 sm:p-6 sm:pt-10">
      <h2 className="mb-4 text-xl font-bold text-teal-600">
        Review {reviewBooking.serviceName}
      </h2>
      <StarRatingSelector
        rating={reviewData.rating}
        setRating={(r) => setReviewData((prev) => ({ ...prev, rating: r }))}
      />
      <textarea
        placeholder="Comment"
        className="w-full rounded-lg border px-3 py-2"
        value={reviewData.comment}
        onChange={(e) => setReviewData((prev) => ({ ...prev, comment: e.target.value }))}
      />
      <button
        className="mt-3 w-full rounded-lg bg-teal-600 py-3 font-semibold text-white transition hover:bg-teal-700"
        onClick={submitReview}
      >
        Submit Review
      </button>
    </div>
  </Modal>
);