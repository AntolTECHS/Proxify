// src/pages/customer/CustomerDashboard.jsx
import { useState, useEffect, useMemo } from "react";
import { FaClipboardList, FaUsers, FaStar, FaClock, FaTimes } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function CustomerDashboard() {
  const { user, token } = useAuth();

  const [customerLat, setCustomerLat] = useState(null);
  const [customerLng, setCustomerLng] = useState(null);

  const [bookings, setBookings] = useState([]);
  const [providers, setProviders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedProvider, setSelectedProvider] = useState(null);
  const [quickBooking, setQuickBooking] = useState({ date: "", time: "", notes: "" });

  // Filters
  const [distanceFilter, setDistanceFilter] = useState(null);
  const [serviceFilter, setServiceFilter] = useState("");

  const BOOKINGS_PER_PAGE = 5;

  // Get customer geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCustomerLat(pos.coords.latitude);
          setCustomerLng(pos.coords.longitude);
        },
        () => console.warn("Location access denied")
      );
    }
  }, []);

  // Fetch bookings and providers
  useEffect(() => {
    if (!user || !token) return;

    const fetchData = async () => {
      try {
        const bookingsRes = await fetch(`${API_URL}/bookings?customerId=${user._id || user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const bookingsData = bookingsRes.ok ? await bookingsRes.json() : [];
        setBookings(bookingsData);

        const providersRes = await fetch(`${API_URL}/providers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const providersData = providersRes.ok ? await providersRes.json() : [];
        setProviders(providersData);
      } catch (err) {
        console.error("Dashboard fetch failed:", err);
        setBookings([]);
        setProviders([]);
      }
    };

    fetchData();
  }, [user, token]);

  const safeBookings = useMemo(() => (Array.isArray(bookings) ? bookings : []), [bookings]);
  const safeProviders = useMemo(() => (Array.isArray(providers) ? providers : []), [providers]);

  // Unique service options
  const allServices = useMemo(() => {
    const names = safeProviders.flatMap((p) => p.services?.map((s) => s.name) || []);
    return [...new Set(names)];
  }, [safeProviders]);

  // Filter bookings by status and search
  const filteredBookings = useMemo(() => {
    return safeBookings.filter((b) => {
      const service = b?.service?.toLowerCase() || "";
      const providerName = b?.providerName?.toLowerCase() || "";
      return (
        (statusFilter === "All" || b.status === statusFilter) &&
        (service.includes(searchTerm.toLowerCase()) ||
          providerName.includes(searchTerm.toLowerCase()))
      );
    });
  }, [safeBookings, statusFilter, searchTerm]);

  const totalPages = Math.ceil(filteredBookings.length / BOOKINGS_PER_PAGE);
  const currentBookings = filteredBookings.slice(
    (currentPage - 1) * BOOKINGS_PER_PAGE,
    currentPage * BOOKINGS_PER_PAGE
  );

  // Helper: Calculate distance in km
  const getDistance = (lat1, lng1, lat2, lng2) => {
    if (!lat1 || !lng1 || !lat2 || !lng2) return null;
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Filter providers by search, service, and distance
  const filteredProviders = useMemo(() => {
    return safeProviders.filter((p) => {
      const matchesSearch =
        (p.basicInfo?.providerName || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesService =
        !serviceFilter ||
        p.services?.some((s) => s.name.toLowerCase() === serviceFilter.toLowerCase());

      const matchesDistance =
        !distanceFilter ||
        (customerLat &&
          customerLng &&
          p.lat &&
          p.lng &&
          getDistance(customerLat, customerLng, p.lat, p.lng) <= distanceFilter);

      return matchesSearch && matchesService && matchesDistance;
    });
  }, [safeProviders, searchTerm, serviceFilter, distanceFilter, customerLat, customerLng]);

  const avgRating = useMemo(() => {
    if (!safeProviders.length) return "0.0";
    const total = safeProviders.reduce((sum, p) => sum + (p.rating || 0), 0);
    return (total / safeProviders.length).toFixed(1);
  }, [safeProviders]);

  const openQuickBooking = (provider) => {
    setSelectedProvider(provider);
    setQuickBooking({ date: "", time: "", notes: "" });
  };

  const submitQuickBooking = async () => {
    if (!quickBooking.date || !quickBooking.time) {
      alert("Please select date and time");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: user._id || user.id,
          providerId: selectedProvider._id,
          service: selectedProvider.services?.[0]?.name || "General Service",
          ...quickBooking,
        }),
      });

      if (!res.ok) throw new Error("Booking failed");

      const newBooking = await res.json();
      setBookings((prev) => [newBooking, ...prev]);
      setSelectedProvider(null);
      alert("Booking submitted successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to create booking");
    }
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8" style={{ color: "#0ea5e9" }}>
        Welcome, {user?.name || "Customer"} 👋
      </h1>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <Stat icon={<FaClipboardList />} label="Total Bookings" value={safeBookings.length} />
        <Stat icon={<FaUsers />} label="Providers" value={safeProviders.length} />
        <Stat icon={<FaStar />} label="Avg Rating" value={avgRating} />
        <Stat
          icon={<FaClock />}
          label="Upcoming"
          value={safeBookings.filter((b) => b.status === "Scheduled").length}
        />
      </div>

      {/* BOOKINGS */}
      <Section title="Your Bookings">
        {currentBookings.length === 0 ? (
          <Empty text="No bookings found." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Service</th>
                <th>Provider</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {currentBookings.map((b) => (
                <tr key={b._id || b.id} className="border-b">
                  <td className="py-2">{b.service}</td>
                  <td>{b.providerName}</td>
                  <td>{b.date}</td>
                  <td className="font-medium">{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* FILTERS */}
      <Section title="Available Providers">
        <div className="flex flex-wrap gap-4 mb-4 items-center">
          {/* Distance Filter */}
          <div className="flex items-center gap-2">
            <label className="text-gray-700 font-medium">Max Distance (km):</label>
            <input
              type="number"
              min="1"
              value={distanceFilter || ""}
              onChange={(e) => setDistanceFilter(e.target.value ? Number(e.target.value) : null)}
              className="border rounded px-2 py-1 w-20"
            />
          </div>

          {/* Service Filter */}
          <div className="flex items-center gap-2">
            <label className="text-gray-700 font-medium">Service:</label>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="">All</option>
              {allServices.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <button
            onClick={() => {
              setDistanceFilter(null);
              setServiceFilter("");
            }}
            className="ml-auto px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Reset
          </button>
        </div>

        {filteredProviders.length === 0 ? (
          <Empty text="No providers available." />
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {filteredProviders.map((p) => (
              <div
                key={p._id}
                className="bg-white p-4 rounded-xl shadow hover:shadow-lg transition cursor-pointer"
                onClick={() => openQuickBooking(p)}
              >
                {p.basicInfo?.photoURL ? (
                  <img
                    src={p.basicInfo.photoURL}
                    alt={p.basicInfo.providerName}
                    className="w-full h-40 object-cover rounded-lg mb-2"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-200 flex items-center justify-center rounded-lg mb-2">
                    No Photo
                  </div>
                )}

                <h3 className="font-bold text-lg" style={{ color: "#0ea5e9" }}>
                  {p.basicInfo?.providerName}
                </h3>

                <p className="text-gray-600">
                  {p.services?.length > 0
                    ? p.services.map((s) => `${s.name} ($${s.price})`).join(", ")
                    : "General Service"}
                </p>

                <p className="mt-1 text-yellow-500">
                  ⭐ {p.rating ? p.rating.toFixed(1) : "N/A"}
                </p>

                {customerLat && customerLng && p.lat && p.lng && (
                  <p className="text-gray-500 text-sm">
                    {getDistance(customerLat, customerLng, p.lat, p.lng).toFixed(1)} km away
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* QUICK BOOKING MODAL */}
      {selectedProvider && (
        <Modal onClose={() => setSelectedProvider(null)}>
          <h2 className="text-xl font-bold mb-4" style={{ color: "#0ea5e9" }}>
            Book {selectedProvider.basicInfo?.providerName}
          </h2>

          <input
            type="date"
            className="input mb-3 border rounded-lg p-2 w-full"
            style={{ borderColor: "#0ea5e9" }}
            onChange={(e) => setQuickBooking({ ...quickBooking, date: e.target.value })}
          />

          <input
            type="time"
            className="input mb-3 border rounded-lg p-2 w-full"
            style={{ borderColor: "#0ea5e9" }}
            onChange={(e) => setQuickBooking({ ...quickBooking, time: e.target.value })}
          />

          <button
            className="w-full py-2 rounded-lg text-white mt-2 transition"
            style={{ backgroundColor: "#0ea5e9" }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#0284c7")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#0ea5e9")}
            onClick={submitQuickBooking}
          >
            Confirm Booking
          </button>
        </Modal>
      )}
    </div>
  );
}

/* =========================
   UI HELPERS
========================= */
const Stat = ({ icon, label, value }) => (
  <div className="bg-white p-6 rounded-xl shadow flex gap-4">
    <div className="text-[#0ea5e9] text-xl">{icon}</div>
    <div>
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <div className="bg-white p-6 rounded-xl shadow mb-10">
    <h2 className="text-xl font-semibold mb-4" style={{ color: "#0ea5e9" }}>
      {title}
    </h2>
    {children}
  </div>
);

const Empty = ({ text }) => <p className="text-gray-500 text-center py-8">{text}</p>;

const Modal = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-xl w-96 relative">
      <button
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        onClick={onClose}
      >
        <FaTimes />
      </button>
      {children}
    </div>
  </div>
);