// src/pages/customer/CustomerProviders.jsx
import { useState, useEffect } from "react";
import { FaStar, FaTimes } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function CustomerProviders() {
  const { token } = useAuth();

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedProvider, setSelectedProvider] = useState(null);
  const [bookingProvider, setBookingProvider] = useState(null);

  const [bookingForm, setBookingForm] = useState({
    date: "",
    time: "",
    location: "",
    notes: "",
    serviceId: ""
  });

  /* ---------------- FETCH ---------------- */
  useEffect(() => {
    if (!token) return;

    const fetchProviders = async () => {
      try {
        const res = await fetch(`${API_URL}/providers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setProviders(Array.isArray(data) ? data : []);
      } catch {
        setProviders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, [token]);

  /* ---------------- FILTER ---------------- */
  const filteredProviders = providers.filter((p) => {
    const name = p.basicInfo?.providerName || p.name || "";
    const services = p.services?.map((s) => s.name).join(" ") || "";

    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      services.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  /* ---------------- BOOK ---------------- */
  const submitBooking = async () => {
    if (!bookingForm.date || !bookingForm.time || !bookingForm.location) {
      alert("Fill all booking fields");
      return;
    }

    const serviceId =
      bookingForm.serviceId || bookingProvider?.services?.[0]?._id;

    try {
      const scheduledAt = new Date(`${bookingForm.date}T${bookingForm.time}`);

      const res = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          providerId: bookingProvider._id,
          serviceId,
          scheduledAt,
          location: bookingForm.location,
          notes: bookingForm.notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert("Booking successful!");
      setBookingProvider(null);
    } catch (err) {
      alert(err.message);
    }
  };

  /* ---------------- LOADING ---------------- */
  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-sky-500 text-lg font-medium">
        Loading providers...
      </div>
    );
  }

  /* ---------------- PAGE ---------------- */
  return (
    <div className="p-6 bg-gray-100 min-h-screen space-y-8">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-500 text-white p-6 rounded-2xl shadow">
        <h1 className="text-3xl font-bold">Find Service Providers</h1>
        <p className="opacity-90 mt-1">Search and book trusted professionals</p>
      </div>

      {/* SEARCH */}
      <div className="bg-white p-4 rounded-xl shadow">
        <input
          type="text"
          placeholder="Search providers or services..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
      </div>

      {/* PROVIDERS GRID */}
      {filteredProviders.length === 0 ? (
        <div className="bg-white p-10 text-center rounded-xl shadow text-gray-500">
          No providers found
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProviders.map((p) => (
            <div
              key={p._id}
              onClick={() => setSelectedProvider(p)}
              className="bg-white rounded-2xl shadow hover:shadow-xl transition p-5 cursor-pointer"
            >
              {/* IMAGE */}
              <div className="flex justify-center mb-4">
                <img
                  src={p.basicInfo?.photoURL || "https://dummyimage.com/300x300/ccc/000"}
                  className="w-24 h-24 rounded-full object-cover border-4 border-sky-100 shadow"
                />
              </div>

              {/* INFO */}
              <h3 className="text-lg font-bold text-center text-sky-600">
                {p.basicInfo?.providerName || p.name}
              </h3>

              <p className="text-sm text-gray-500 text-center mt-1">
                {p.services?.map((s) => s.name).join(", ")}
              </p>

              {/* RATING */}
              <div className="flex justify-center items-center gap-2 mt-2 text-yellow-500">
                <FaStar />
                <span className="text-sm text-gray-700">
                  {p.rating?.toFixed(1) || "0.0"}
                </span>
              </div>

              {/* BUTTON */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setBookingProvider(p);
                }}
                className="mt-4 w-full bg-sky-500 text-white py-2 rounded-lg hover:bg-sky-600 transition"
              >
                Book Now
              </button>
            </div>
          ))}
        </div>
      )}

      {/* PROVIDER MODAL */}
      {selectedProvider && (
        <Modal onClose={() => setSelectedProvider(null)}>
          <img
            src={selectedProvider.basicInfo?.photoURL}
            className="w-24 h-24 mx-auto rounded-full mb-4"
          />
          <h2 className="text-xl font-bold text-center text-sky-600">
            {selectedProvider.basicInfo?.providerName}
          </h2>

          <p className="text-center text-gray-500 mt-2">
            {selectedProvider.services?.map((s) => s.name).join(", ")}
          </p>

          <button
            className="mt-4 w-full bg-sky-500 text-white py-2 rounded-lg"
            onClick={() => {
              setBookingProvider(selectedProvider);
              setSelectedProvider(null);
            }}
          >
            Book Provider
          </button>
        </Modal>
      )}

      {/* BOOKING MODAL */}
      {bookingProvider && (
        <Modal onClose={() => setBookingProvider(null)}>
          <h2 className="text-xl font-bold text-sky-600 mb-4 text-center">
            Book {bookingProvider.basicInfo?.providerName}
          </h2>

          <div className="space-y-3">
            <select
              className="w-full border p-2 rounded-lg"
              onChange={(e) =>
                setBookingForm({ ...bookingForm, serviceId: e.target.value })
              }
            >
              <option>Select Service</option>
              {bookingProvider.services?.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} (${s.price})
                </option>
              ))}
            </select>

            <input
              type="date"
              className="w-full border p-2 rounded-lg"
              onChange={(e) =>
                setBookingForm({ ...bookingForm, date: e.target.value })
              }
            />

            <input
              type="time"
              className="w-full border p-2 rounded-lg"
              onChange={(e) =>
                setBookingForm({ ...bookingForm, time: e.target.value })
              }
            />

            <input
              placeholder="Location"
              className="w-full border p-2 rounded-lg"
              onChange={(e) =>
                setBookingForm({ ...bookingForm, location: e.target.value })
              }
            />

            <textarea
              placeholder="Notes"
              className="w-full border p-2 rounded-lg"
              onChange={(e) =>
                setBookingForm({ ...bookingForm, notes: e.target.value })
              }
            />

            <button
              onClick={submitBooking}
              className="w-full bg-sky-500 text-white py-2 rounded-lg hover:bg-sky-600"
            >
              Confirm Booking
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- REUSABLE MODAL ---------------- */
const Modal = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-2xl w-[400px] relative shadow-xl">
      <button className="absolute right-3 top-3" onClick={onClose}>
        <FaTimes />
      </button>
      {children}
    </div>
  </div>
);