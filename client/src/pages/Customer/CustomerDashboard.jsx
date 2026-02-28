// src/pages/customer/CustomerDashboard.jsx
import { useState, useEffect, useMemo } from "react";
import {
  FaClipboardList,
  FaUsers,
  FaStar,
  FaClock,
  FaTimes,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.jsx";

const API_URL = "http://localhost:5000/api";

export default function CustomerDashboard() {
  const { user, token } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [providers, setProviders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedProvider, setSelectedProvider] = useState(null);
  const [quickBooking, setQuickBooking] = useState({
    date: "",
    time: "",
    notes: "",
  });

  const BOOKINGS_PER_PAGE = 5;

  useEffect(() => {
    if (!user || !token) return;

    const fetchData = async () => {
      try {
        const [bookingsRes, providersRes] = await Promise.all([
          fetch(`${API_URL}/bookings?customerId=${user._id || user.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/providers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setBookings(bookingsRes.ok ? await bookingsRes.json() : []);
        setProviders(providersRes.ok ? await providersRes.json() : []);
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

  const filteredBookings = useMemo(() => {
    return safeBookings.filter((b) => {
      const service = b?.service?.toLowerCase() || "";
      const provider = b?.providerName?.toLowerCase() || "";

      return (
        (statusFilter === "All" || b.status === statusFilter) &&
        (service.includes(searchTerm.toLowerCase()) ||
          provider.includes(searchTerm.toLowerCase()))
      );
    });
  }, [safeBookings, statusFilter, searchTerm]);

  const totalPages = Math.ceil(filteredBookings.length / BOOKINGS_PER_PAGE);
  const currentBookings = filteredBookings.slice(
    (currentPage - 1) * BOOKINGS_PER_PAGE,
    currentPage * BOOKINGS_PER_PAGE
  );

  const filteredProviders = useMemo(
    () => safeProviders.filter((p) => (p?.name || "").toLowerCase().includes(searchTerm.toLowerCase())),
    [safeProviders, searchTerm]
  );

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
          providerId: selectedProvider._id || selectedProvider.id,
          service: selectedProvider.service,
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

      {/* PROVIDERS */}
      <Section title="Available Providers">
        {filteredProviders.length === 0 ? (
          <Empty text="No providers available." />
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {filteredProviders.map((p) => (
              <div
                key={p._id || p.id}
                className="bg-white p-4 rounded-xl shadow hover:shadow-lg transition cursor-pointer"
                onClick={() => openQuickBooking(p)}
              >
                <h3 className="font-bold text-lg" style={{ color: "#0ea5e9" }}>
                  {p.name}
                </h3>
                <p className="text-gray-600">{p.service}</p>
                <p className="mt-1" style={{ color: "#0ea5e9" }}>⭐ {p.rating || "N/A"}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* QUICK BOOKING MODAL */}
      {selectedProvider && (
        <Modal onClose={() => setSelectedProvider(null)}>
          <h2 className="text-xl font-bold mb-4" style={{ color: "#0ea5e9" }}>
            Book {selectedProvider.name}
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
    <h2 className="text-xl font-semibold mb-4" style={{ color: "#0ea5e9" }}>{title}</h2>
    {children}
  </div>
);

const Empty = ({ text }) => (
  <p className="text-gray-500 text-center py-8">{text}</p>
);

const Modal = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-xl w-96 relative">
      <button className="absolute top-3 right-3 text-gray-500 hover:text-gray-700" onClick={onClose}>
        <FaTimes />
      </button>
      {children}
    </div>
  </div>
);