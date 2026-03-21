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
  FaBell
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.jsx";
import Chat from "../../components/Chat/Chat.jsx"; // Chat integration

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function CustomerDashboard() {
  const { user, token, logout } = useAuth();

  /* ---------------------- STATE ---------------------- */
  const [bookings, setBookings] = useState([]);
  const [providers, setProviders] = useState([]);
  const [bookingFilter, setBookingFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [bookingProvider, setBookingProvider] = useState(null);
  const [selectedService, setSelectedService] = useState("");
  const [notification, setNotification] = useState(null);

  const [quickBooking, setQuickBooking] = useState({
    date: "",
    time: "",
    location: "",
    notes: ""
  });

  const [providerReviews, setProviderReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 0, comment: "" });

  const [chatBookingId, setChatBookingId] = useState(null);

  /* ---------------------- HELPERS ---------------------- */
  const handleUnauthorized = () => {
    alert("Session expired. Please log in again.");
    logout();
  };

  /* ---------------------- FETCH BOOKINGS & PROVIDERS ---------------------- */
  useEffect(() => {
    if (!user || !token) return;

    const fetchData = async () => {
      try {
        const bookingsRes = await fetch(`${API_URL}/bookings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (bookingsRes.status === 401) return handleUnauthorized();
        const bookingsData = await bookingsRes.json();
        setBookings(Array.isArray(bookingsData.bookings) ? bookingsData.bookings : []);

        const providersRes = await fetch(`${API_URL}/providers`);
        const providersData = await providersRes.json();
        setProviders(Array.isArray(providersData) ? providersData : []);
      } catch (err) {
        console.error("Fetch bookings/providers error:", err);
      }
    };

    fetchData();
  }, [user, token]);

  /* ---------------------- FETCH REVIEWS ---------------------- */
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

  /* ---------------------- MEMOIZED DATA ---------------------- */
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
        !serviceFilter || p.services?.some((s) => s.name.toLowerCase() === serviceFilter.toLowerCase());
      return matchesSearch && matchesService;
    });
  }, [providers, searchTerm, serviceFilter]);

  /* ---------------------- BOOKING ---------------------- */
  const submitBooking = async () => {
    if (!quickBooking.date || !quickBooking.time || !quickBooking.location || !selectedService) {
      alert("Please complete all booking fields.");
      return;
    }

    try {
      const scheduledAt = new Date(`${quickBooking.date}T${quickBooking.time}`);
      const res = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          providerId: bookingProvider._id,
          serviceId: selectedService,
          scheduledAt,
          location: quickBooking.location,
          notes: quickBooking.notes
        })
      });
      if (res.status === 401) return handleUnauthorized();
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

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

  /* ---------------------- REVIEW ---------------------- */
  const openReviewModal = (booking) => {
    setReviewBooking(booking);
    setReviewData({ rating: 0, comment: "" });
  };

  const submitReview = async () => {
    if (!reviewData.rating) {
      alert("Please select a rating.");
      return;
    }

    try {
      const providerId = reviewBooking?.provider?._id || reviewBooking?.provider || "";
      if (!providerId) throw new Error("Provider not found for this booking.");

      const res = await fetch(`${API_URL}/reviews`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          providerId,
          bookingId: reviewBooking._id,
          rating: reviewData.rating,
          comment: reviewData.comment
        })
      });

      if (res.status === 401) return handleUnauthorized();

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setBookings((prev) =>
        prev.map((b) => (b._id === reviewBooking._id ? { ...b, reviewed: true } : b))
      );

      if (selectedProvider?._id === providerId) {
        const refreshed = await fetch(`${API_URL}/reviews/${providerId}`);
        if (refreshed.status === 401) return handleUnauthorized();
        const refreshedData = await refreshed.json();
        setProviderReviews(Array.isArray(refreshedData.reviews) ? refreshedData.reviews : []);
      }

      setReviewBooking(null);
      setNotification("Review submitted!");
      setTimeout(() => setNotification(null), 4000);

    } catch (err) {
      alert(err.message);
    }
  };

  /* ---------------------- RENDER ---------------------- */
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-sky-500">Welcome {user?.name}</h1>
        <FaBell className="text-xl text-gray-500" />
      </div>

      {notification && (
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded mb-6">
          {notification}
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div onClick={() => setBookingFilter("all")}>
          <Stat icon={<FaClipboardList />} label="Bookings" value={bookings.length} />
        </div>
        <Stat icon={<FaUsers />} label="Providers" value={providers.length} />
        <Stat
          icon={<FaStar />}
          label="Avg Rating"
          value={
            providers.length
              ? (providers.reduce((a, b) => a + (b.rating || 0), 0) / providers.length).toFixed(1)
              : "0"
          }
        />
        <div onClick={() => setBookingFilter("upcoming")}>
          <Stat icon={<FaClock />} label="Upcoming" value={upcomingBookings.length} />
        </div>
      </div>

      {/* BOOKINGS */}
      <Section title={bookingFilter === "upcoming" ? "Upcoming Bookings" : "Your Bookings"}>
        {filteredBookings.length === 0 ? (
          <Empty text="No bookings yet." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBookings.map((b) => (
              <div key={b._id} className="bg-white rounded-xl shadow p-4">
                <p className="font-semibold">{b.serviceName}</p>
                <p className="text-sm text-gray-500">{b.provider?.basicInfo?.providerName || b.provider?.name}</p>
                <p className="text-sm text-gray-400">{new Date(b.scheduledAt).toLocaleString()}</p>
                <div className="mt-2">
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  {b.status === "completed" && !b.reviewed && (
                    <button
                      onClick={() => openReviewModal(b)}
                      className="text-sm text-sky-600 underline"
                    >
                      Leave Review
                    </button>
                  )}
                  {b.status !== "cancelled" && (
                    <button
                      onClick={() => setChatBookingId(b._id)}
                      className="text-sm text-sky-600 underline"
                    >
                      Chat
                    </button>
                  )}
                  {b.reviewed && (
                    <span className="text-sm text-green-600 font-medium">Reviewed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* PROVIDERS */}
      <Section title="Available Providers">
        <div className="flex flex-wrap gap-4 mb-6">
          <input
            placeholder="Search provider"
            className="border px-3 py-2 rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="border px-3 py-2 rounded-lg"
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
          >
            <option value="">All Services</option>
            {allServices.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="max-h-[500px] overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProviders.map((p) => (
              <div
                key={p._id}
                onClick={() => setSelectedProvider(p)}
                className="bg-white rounded-xl shadow hover:shadow-lg cursor-pointer overflow-hidden p-4 text-center"
              >
                <div className="flex justify-center mb-3">
                  <img
                    src={p.basicInfo?.photoURL || "https://dummyimage.com/300x300/ccc/000"}
                    alt={p.basicInfo?.providerName || "Provider"}
                    className="w-24 h-24 rounded-full object-cover border-4 border-sky-100 shadow"
                  />
                </div>
                <h3 className="font-bold text-lg text-sky-600">{p.basicInfo?.providerName}</h3>
                <p className="text-sm text-gray-500">{p.services?.map((s) => s.name).join(", ")}</p>
                <div className="flex items-center justify-center gap-2">
                  <StarRating rating={p.rating} />
                  <span className="text-sm">{(p.rating || 0).toFixed(1)}</span>
                </div>
                <p className="text-sm mt-1">{p.experience} years experience</p>
                <p className="text-sky-600 font-semibold">From ${p.services?.[0]?.price || 20}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ---------------- MODALS ---------------- */}
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

      {/* ---------------- CHAT MODAL ---------------- */}
      {chatBookingId && (
        <Modal onClose={() => setChatBookingId(null)}>
          <Chat bookingId={chatBookingId} token={token} userId={user.id} />
        </Modal>
      )}
    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */
const Stat = ({ icon, label, value }) => (
  <div className="bg-white p-5 rounded-xl shadow flex items-center gap-4 cursor-pointer">
    <div className="text-sky-500 text-xl">{icon}</div>
    <div>
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <div className="bg-white p-6 rounded-xl shadow mb-8">
    <h2 className="text-xl font-semibold mb-4 text-sky-500">{title}</h2>
    {children}
  </div>
);

const Empty = ({ text }) => <p className="text-center text-gray-500 py-6">{text}</p>;

const StatusBadge = ({ status }) => {
  const styles = {
    pending: "bg-yellow-100 text-yellow-700",
    accepted: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700"
  };
  return <span className={`px-3 py-1 rounded-full text-sm ${styles[status] || "bg-gray-100 text-gray-700"}`}>{status}</span>;
};

const StarRating = ({ rating = 0 }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) stars.push(<FaStar key={i} className="text-yellow-400" />);
    else if (rating >= i - 0.5) stars.push(<FaStarHalfAlt key={i} className="text-yellow-400" />);
    else stars.push(<FaRegStar key={i} className="text-gray-300" />);
  }
  return <div className="flex gap-1 justify-center">{stars}</div>;
};

const Modal = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-6 w-[400px] relative max-h-[85vh] overflow-y-auto">
      <button className="absolute top-3 right-3" onClick={onClose}><FaTimes /></button>
      {children}
    </div>
  </div>
);

const ProviderModal = ({ selectedProvider, setSelectedProvider, providerReviews, reviewsLoading, setBookingProvider, setSelectedService }) => (
  <Modal onClose={() => setSelectedProvider(null)}>
    <div className="flex justify-center mb-3">
      <img src={selectedProvider.basicInfo?.photoURL || "https://dummyimage.com/300x300/ccc/000"} alt={selectedProvider.basicInfo?.providerName || "Provider"} className="w-24 h-24 rounded-full object-cover border-4 border-sky-100 shadow" />
    </div>
    <h2 className="text-xl font-bold text-sky-500 mb-2">{selectedProvider.basicInfo?.providerName}</h2>
    <StarRating rating={selectedProvider.rating} />
    <p className="mt-2 text-sm text-gray-600">Services: {selectedProvider.services?.map((s) => s.name).join(", ")}</p>
    <p className="mt-1 text-sm text-gray-600">Experience: {selectedProvider.experience || 0} years</p>
    <button className="bg-sky-500 text-white w-full py-2 rounded-lg mt-4" onClick={() => { setBookingProvider(selectedProvider); setSelectedProvider(null); setSelectedService(""); }}>Book Now</button>
    <div className="mt-6 text-left">
      <h3 className="font-semibold text-sky-600 mb-3">Reviews</h3>
      {reviewsLoading ? <p className="text-sm text-gray-500">Loading reviews...</p> :
        providerReviews.length === 0 ? <p className="text-sm text-gray-500">No reviews yet.</p> :
        providerReviews.map(r => (
          <div key={r._id} className="border rounded-lg p-2 mb-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold">{r.userName}</p>
              <StarRating rating={r.rating} />
            </div>
            <p className="text-sm text-gray-500">{r.comment}</p>
          </div>
        ))}
    </div>
  </Modal>
);

const BookingModal = ({ bookingProvider, quickBooking, setQuickBooking, selectedService, setSelectedService, submitBooking, setBookingProvider }) => (
  <Modal onClose={() => setBookingProvider(null)}>
    <h2 className="text-xl font-bold text-sky-500 mb-4">Book {bookingProvider.basicInfo?.providerName}</h2>
    <input type="date" className="border w-full px-3 py-2 mb-2 rounded" value={quickBooking.date} onChange={e => setQuickBooking(prev => ({ ...prev, date: e.target.value }))} />
    <input type="time" className="border w-full px-3 py-2 mb-2 rounded" value={quickBooking.time} onChange={e => setQuickBooking(prev => ({ ...prev, time: e.target.value }))} />
    <input type="text" placeholder="Location" className="border w-full px-3 py-2 mb-2 rounded" value={quickBooking.location} onChange={e => setQuickBooking(prev => ({ ...prev, location: e.target.value }))} />
    <textarea placeholder="Notes" className="border w-full px-3 py-2 mb-2 rounded" value={quickBooking.notes} onChange={e => setQuickBooking(prev => ({ ...prev, notes: e.target.value }))} />
    <select className="border w-full px-3 py-2 mb-2 rounded" value={selectedService} onChange={e => setSelectedService(e.target.value)}>
      <option value="">Select Service</option>
      {bookingProvider.services?.map(s => <option key={s._id} value={s._id}>{s.name} - ${s.price}</option>)}
    </select>
    <button className="bg-sky-500 text-white w-full py-2 rounded" onClick={submitBooking}>Confirm Booking</button>
  </Modal>
);

const ReviewModal = ({ reviewBooking, reviewData, setReviewData, submitReview, setReviewBooking }) => (
  <Modal onClose={() => setReviewBooking(null)}>
    <h2 className="text-xl font-bold text-sky-500 mb-4">Review {reviewBooking.serviceName}</h2>
    <StarRatingSelector rating={reviewData.rating} setRating={r => setReviewData(prev => ({ ...prev, rating: r }))} />
    <textarea placeholder="Comment" className="border w-full px-3 py-2 mb-2 rounded" value={reviewData.comment} onChange={e => setReviewData(prev => ({ ...prev, comment: e.target.value }))} />
    <button className="bg-sky-500 text-white w-full py-2 rounded" onClick={submitReview}>Submit Review</button>
  </Modal>
);

const StarRatingSelector = ({ rating, setRating }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} onClick={() => setRating(i)}>
        {i <= rating ? <FaStar className="text-yellow-400 inline" /> : <FaRegStar className="text-gray-300 inline" />}
      </span>
    );
  }
  return <div className="flex gap-1 justify-center mb-2 cursor-pointer">{stars}</div>;
};