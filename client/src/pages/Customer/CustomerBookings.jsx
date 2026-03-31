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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const FILTERS = ["All", "Upcoming", "Completed", "Cancelled"];

export default function CustomerBookings() {
  const { user, token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({ date: "", time: "" });

  useEffect(() => {
    if (!user || !token) return;

    const fetchBookings = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      } catch (err) {
        console.error("Fetch bookings error:", err);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user, token]);

  const filteredBookings = bookings.filter((b) => {
    if (filter === "All") return true;

    const isUpcoming =
      ["pending", "accepted", "in_progress"].includes(b.status) &&
      new Date(b.scheduledAt) > new Date();
    const isCompleted = b.status === "completed";
    const isCancelled = b.status === "cancelled";

    if (filter === "Upcoming") return isUpcoming;
    if (filter === "Completed") return isCompleted;
    if (filter === "Cancelled") return isCancelled;

    return true;
  });

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;

    try {
      const res = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "cancelled" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to cancel booking");

      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, status: "cancelled" } : b))
      );
    } catch (err) {
      console.error("Cancel booking error:", err);
      alert("Failed to cancel booking: " + err.message);
    }
  };

  const openReschedule = (booking) => {
    const bookingDate = new Date(booking.scheduledAt);
    setRescheduleBooking(booking);
    setRescheduleData({
      date: bookingDate.toISOString().split("T")[0],
      time: bookingDate.toTimeString().slice(0, 5),
    });
  };

  const submitReschedule = async () => {
    if (!rescheduleData.date || !rescheduleData.time) {
      alert("Please select both date and time");
      return;
    }

    try {
      const scheduledAt = new Date(`${rescheduleData.date}T${rescheduleData.time}`);
      const res = await fetch(
        `${API_URL}/bookings/${rescheduleBooking._id}/reschedule`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ scheduledAt }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Reschedule failed");

      setBookings((prev) =>
        prev.map((b) => (b._id === rescheduleBooking._id ? data.booking : b))
      );
      setRescheduleBooking(null);
      alert("Booking rescheduled successfully!");
    } catch (err) {
      console.error("Reschedule error:", err);
      alert("Failed to reschedule booking: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 font-medium text-teal-600">
        Loading bookings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="border rounded-lg p-6 bg-teal-600 border-teal-600">
        <h1 className="text-2xl font-bold text-white">Your Bookings</h1>
        <p className="mt-1 text-white">Manage all your bookings here</p>
      </div>

      {/* FILTERS */}
      <div className="flex gap-3 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md border transition ${
              filter === f
                ? "bg-teal-600 text-white border-teal-600"
                : "bg-white text-teal-600 border-teal-600"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* BOOKINGS LIST */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white border rounded-lg py-16 text-center text-gray-500">
          No bookings found.
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredBookings.map((b) => {
            const bookingDate = new Date(b.scheduledAt);
            const isUpcoming =
              ["pending", "accepted", "in_progress"].includes(b.status) &&
              bookingDate > new Date();

            return (
              <div
                key={b._id}
                className="bg-white border rounded-lg p-5 hover:shadow-md transition relative"
              >
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {b.serviceName || b.service?.name}
                    </h3>
                    <p className="flex items-center gap-2 mt-1 text-teal-600">
                      <FaUser /> {b.provider?.basicInfo?.providerName || b.providerName}
                    </p>
                  </div>

                  <StatusBadge status={b.status} />

                  <button
                    onClick={() => setSelectedBooking(b)}
                    className="absolute top-3 right-3 text-teal-600 hover:opacity-80"
                  >
                    <FaInfoCircle />
                  </button>
                </div>

                <div className="flex gap-6 mt-4 text-sm text-gray-600">
                  <span className="flex items-center gap-2 text-teal-600">
                    <FaCalendarAlt /> {bookingDate.toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-2 text-teal-600">
                    <FaClock />{" "}
                    {bookingDate.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {isUpcoming && (
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => openReschedule(b)}
                      className="flex items-center gap-2 px-4 py-2 rounded-md border border-teal-600 text-teal-600 hover:bg-teal-50 transition"
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

      {/* RESCHEDULE MODAL */}
      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg p-6 w-96 relative shadow-lg">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setRescheduleBooking(null)}
            >
              <FaTimes />
            </button>
            <h2 className="text-xl font-bold mb-4 text-teal-600">
              Reschedule {rescheduleBooking.serviceName || rescheduleBooking.service?.name}
            </h2>
            <input
              type="date"
              value={rescheduleData.date}
              onChange={(e) =>
                setRescheduleData({ ...rescheduleData, date: e.target.value })
              }
              className="border border-teal-600 p-2 rounded w-full mb-3"
            />
            <input
              type="time"
              value={rescheduleData.time}
              onChange={(e) =>
                setRescheduleData({ ...rescheduleData, time: e.target.value })
              }
              className="border border-teal-600 p-2 rounded w-full mb-4"
            />
            <button
              className="w-full py-2 rounded-md text-white bg-teal-600 hover:bg-teal-700 transition"
              onClick={submitReschedule}
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* BOOKING DETAILS DRAWER */}
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
            <h2 className="text-xl font-bold mb-4 text-teal-600">
              {selectedBooking.serviceName || selectedBooking.service?.name}
            </h2>
            <p className="text-gray-600 mb-1">
              <strong>Provider:</strong>{" "}
              {selectedBooking.provider?.basicInfo?.providerName || selectedBooking.providerName}
            </p>
            <p className="text-gray-600 mb-1">
              <strong>Date:</strong>{" "}
              {new Date(selectedBooking.scheduledAt).toLocaleDateString()}
            </p>
            <p className="text-gray-600 mb-1">
              <strong>Time:</strong>{" "}
              {new Date(selectedBooking.scheduledAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-gray-600 mb-1">
              <strong>Status:</strong> {selectedBooking.status}
            </p>
            <p className="text-gray-600 mb-1">
              <strong>Notes:</strong> {selectedBooking.notes || "N/A"}
            </p>
            <p className="text-gray-600 mb-1">
              <strong>Price:</strong> ${selectedBooking.price?.toFixed(2) || "N/A"}
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
    pending: "bg-teal-100 text-teal-700 border border-teal-400 animate-pulse",
    accepted: "bg-teal-200 text-teal-800 border border-teal-500 animate-pulse",
    in_progress: "bg-teal-100 text-teal-700 border border-teal-500 animate-pulse",
    completed: "bg-green-100 text-green-700 border border-green-400",
    cancelled: "bg-red-100 text-red-600 border border-red-400",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full border text-sm font-medium ${
        styles[status?.toLowerCase()] || "bg-gray-100 text-gray-700 border-gray-300"
      }`}
    >
      {status}
    </span>
  );
};