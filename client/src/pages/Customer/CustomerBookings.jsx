// src/pages/customer/CustomerBookings.jsx
import { useEffect, useState } from "react";
import {
  FaCalendarAlt,
  FaClock,
  FaUser,
  FaTimes,
  FaRedo,
  FaInfoCircle,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.jsx";

const API_URL = "http://localhost:5000/api";
const FILTERS = ["All", "Upcoming", "Completed", "Cancelled"];

export default function CustomerBookings() {
  const { user, token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const [selectedBooking, setSelectedBooking] = useState(null); // drawer
  const [rescheduleBooking, setRescheduleBooking] = useState(null); // modal
  const [rescheduleData, setRescheduleData] = useState({ date: "", time: "" });

  useEffect(() => {
    if (!user || !token) return;

    const fetchBookings = async () => {
      try {
        const res = await fetch(
          `${API_URL}/bookings?customerId=${user._id || user.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setBookings(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user, token]);

  const filteredBookings = bookings.filter((b) => {
    if (filter === "All") return true;
    if (filter === "Upcoming") return ["Scheduled", "Pending"].includes(b.status);
    if (filter === "Completed") return b.status === "Completed";
    if (filter === "Cancelled") return b.status === "Cancelled";
    return true;
  });

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Cancel this booking?")) return;

    try {
      await fetch(`${API_URL}/bookings/${bookingId}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId ? { ...b, status: "Cancelled" } : b
        )
      );
    } catch (err) {
      alert("Failed to cancel booking");
    }
  };

  const openReschedule = (booking) => {
    setRescheduleBooking(booking);
    setRescheduleData({ date: booking.date, time: booking.time });
  };

  const submitReschedule = async () => {
    if (!rescheduleData.date || !rescheduleData.time) {
      alert("Select both date and time");
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/bookings/${rescheduleBooking._id}/reschedule`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(rescheduleData),
        }
      );

      if (!res.ok) throw new Error("Reschedule failed");
      const updated = await res.json();

      setBookings((prev) =>
        prev.map((b) => (b._id === updated._id ? updated : b))
      );
      setRescheduleBooking(null);
      alert("Booking rescheduled");
    } catch (err) {
      console.error(err);
      alert("Failed to reschedule");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 font-medium" style={{ color: "#0ea5e9" }}>
        Loading bookings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border rounded-lg p-6" style={{ backgroundColor: "#e0f2fe", borderColor: "#0ea5e9" }}>
        <h1 className="text-2xl font-bold" style={{ color: "#0ea5e9" }}>Your Bookings</h1>
        <p className="mt-1" style={{ color: "#0ea5e9" }}>Manage your bookings here</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-md border transition"
            style={
              filter === f
                ? { backgroundColor: "#0ea5e9", color: "#ffffff", borderColor: "#0ea5e9" }
                : { backgroundColor: "#ffffff", color: "#0ea5e9", borderColor: "#0ea5e9" }
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* Bookings */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white border rounded-lg py-16 text-center text-gray-500">
          No bookings found.
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredBookings.map((b) => {
            const isUpcoming = ["Scheduled", "Pending"].includes(b.status);

            return (
              <div
                key={b._id}
                className="bg-white border rounded-lg p-5 hover:shadow-md transition"
                style={{ borderColor: "#0ea5e933" }}
              >
                {/* TOP */}
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-lg">{b.service}</h3>
                    <p className="flex items-center gap-2 mt-1" style={{ color: "#0ea5e9" }}>
                      <FaUser /> {b.providerName}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <StatusBadge status={b.status} />

                  {/* Info drawer trigger */}
                  <button
                    onClick={() => setSelectedBooking(b)}
                    style={{ color: "#0ea5e9" }}
                    className="absolute top-3 right-3 hover:opacity-80"
                  >
                    <FaInfoCircle />
                  </button>
                </div>

                {/* META */}
                <div className="flex gap-6 mt-4 text-sm text-gray-600">
                  <span className="flex items-center gap-2" style={{ color: "#0ea5e9" }}>
                    <FaCalendarAlt /> {b.date}
                  </span>
                  <span className="flex items-center gap-2" style={{ color: "#0ea5e9" }}>
                    <FaClock /> {b.time}
                  </span>
                </div>

                {/* Actions */}
                {isUpcoming && (
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => openReschedule(b)}
                      className="flex items-center gap-2 px-4 py-2 rounded-md border transition"
                      style={{ borderColor: "#0ea5e9", color: "#0ea5e9" }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#e0f2fe")}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <FaRedo /> Reschedule
                    </button>
                    <button
                      onClick={() => handleCancel(b._id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-md border border-red-500 text-red-600 hover:bg-red-50 transition"
                    >
                      <FaTimes /> Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 w-96 relative shadow-lg">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setRescheduleBooking(null)}
            >
              <FaTimes />
            </button>
            <h2 className="text-xl font-bold mb-4" style={{ color: "#0ea5e9" }}>
              Reschedule {rescheduleBooking.service}
            </h2>
            <input
              type="date"
              value={rescheduleData.date}
              onChange={(e) =>
                setRescheduleData({ ...rescheduleData, date: e.target.value })
              }
              className="input mb-3 w-full"
            />
            <input
              type="time"
              value={rescheduleData.time}
              onChange={(e) =>
                setRescheduleData({ ...rescheduleData, time: e.target.value })
              }
              className="input mb-4 w-full"
            />
            <button
              className="w-full py-2 rounded-md text-white"
              style={{ backgroundColor: "#0ea5e9" }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#0284c7")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#0ea5e9")}
              onClick={submitReschedule}
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Booking Details Drawer */}
      {selectedBooking && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setSelectedBooking(null)}
          />
          <div className="relative ml-auto w-80 bg-white h-full p-6 shadow-lg overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              onClick={() => setSelectedBooking(null)}
            >
              <FaTimes />
            </button>
            <h2 className="text-xl font-bold mb-4" style={{ color: "#0ea5e9" }}>
              {selectedBooking.service}
            </h2>
            <p className="text-gray-600 mb-1">
              <strong>Provider:</strong> {selectedBooking.providerName}
            </p>
            <p className="text-gray-600 mb-1">
              <strong>Date:</strong> {selectedBooking.date}
            </p>
            <p className="text-gray-600 mb-1">
              <strong>Time:</strong> {selectedBooking.time}
            </p>
            <p className="text-gray-600 mb-1">
              <strong>Status:</strong> {selectedBooking.status}
            </p>
            <p className="text-gray-600 mb-1">
              <strong>Notes:</strong> {selectedBooking.notes || "N/A"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- STATUS BADGES ---------------- */
const StatusBadge = ({ status }) => {
  const styles = {
    Scheduled: "bg-[#e0f2fe] text-[#0ea5e9] border-[#0ea5e9] animate-pulse",
    Pending: "bg-[#e0f2fe] text-[#0ea5e9] border-[#0ea5e9] animate-pulse",
    Completed: "bg-green-100 text-green-700 border-green-500 animate-fadeIn",
    Cancelled: "bg-red-100 text-red-600 border-red-500 animate-shake",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full border text-sm font-medium ${
        styles[status] || ""
      }`}
    >
      {status}
    </span>
  );
};