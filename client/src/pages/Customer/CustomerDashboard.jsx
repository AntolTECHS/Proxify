import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FaClipboardList, FaUsers, FaStar, FaClock, FaPlus, FaHistory, FaHeart, FaTimes } from "react-icons/fa";
import { fetchBookings, fetchProviders, createBooking } from "../../redux/slices/customerSlice"; // Add createBooking thunk

export default function CustomerDashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { bookings, providers } = useSelector((state) => state.customer);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const bookingsPerPage = 5;

  // Modals
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [quickBooking, setQuickBooking] = useState({
    date: "",
    time: "",
    notes: ""
  });

  useEffect(() => {
    if (user) {
      dispatch(fetchBookings(user.id));
      dispatch(fetchProviders());
    }
  }, [user, dispatch]);

  // --- Bookings Filtering ---
  const filteredBookings = bookings.filter(
    (b) =>
      (statusFilter === "All" || b.status === statusFilter) &&
      (b.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.providerName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const indexOfLastBooking = currentPage * bookingsPerPage;
  const indexOfFirstBooking = indexOfLastBooking - bookingsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirstBooking, indexOfLastBooking);
  const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  // --- Provider Filtering ---
  const filteredProviders = providers.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const avgRating =
    providers.length > 0
      ? (providers.reduce((acc, p) => acc + p.rating, 0) / providers.length).toFixed(1)
      : 0;

  const openQuickBooking = (provider) => {
    setSelectedProvider(provider);
    setQuickBooking({
      date: "",
      time: "",
      notes: ""
    });
  };

  const submitQuickBooking = () => {
    if (!quickBooking.date || !quickBooking.time) {
      alert("Please select a date and time.");
      return;
    }

    dispatch(createBooking({
      customerId: user.id,
      providerId: selectedProvider.id,
      service: selectedProvider.service,
      date: quickBooking.date,
      time: quickBooking.time,
      notes: quickBooking.notes
    }));

    alert("Booking request submitted!");
    setSelectedProvider(null);
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Welcome, {user?.name || "Customer"}!
      </h1>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="p-6 bg-white shadow-md rounded-lg border border-gray-200 hover:shadow-lg transition cursor-pointer flex items-center space-x-4">
          <FaPlus className="text-teal-600 w-6 h-6" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Book a Service</h3>
            <p className="text-gray-500 text-sm">Quickly schedule a new service with a provider.</p>
          </div>
        </div>
        <div className="p-6 bg-white shadow-md rounded-lg border border-gray-200 hover:shadow-lg transition cursor-pointer flex items-center space-x-4">
          <FaHistory className="text-teal-600 w-6 h-6" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Booking History</h3>
            <p className="text-gray-500 text-sm">View all your past and current bookings.</p>
          </div>
        </div>
        <div className="p-6 bg-white shadow-md rounded-lg border border-gray-200 hover:shadow-lg transition cursor-pointer flex items-center space-x-4">
          <FaHeart className="text-teal-600 w-6 h-6" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Favorite Providers</h3>
            <p className="text-gray-500 text-sm">Quickly access your preferred providers.</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="flex items-center p-6 bg-white shadow-md rounded-lg border border-gray-200">
          <div className="p-4 bg-teal-600 rounded-full flex items-center justify-center mr-4">
            <FaClipboardList className="text-white w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-500">Total Bookings</p>
            <p className="text-2xl font-bold text-gray-800">{bookings.length}</p>
          </div>
        </div>
        <div className="flex items-center p-6 bg-white shadow-md rounded-lg border border-gray-200">
          <div className="p-4 bg-teal-600 rounded-full flex items-center justify-center mr-4">
            <FaUsers className="text-white w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-500">Active Providers</p>
            <p className="text-2xl font-bold text-gray-800">{providers.length}</p>
          </div>
        </div>
        <div className="flex items-center p-6 bg-white shadow-md rounded-lg border border-gray-200">
          <div className="p-4 bg-teal-600 rounded-full flex items-center justify-center mr-4">
            <FaStar className="text-white w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-500">Avg Rating</p>
            <p className="text-2xl font-bold text-gray-800">{avgRating}</p>
          </div>
        </div>
        <div className="flex items-center p-6 bg-white shadow-md rounded-lg border border-gray-200">
          <div className="p-4 bg-teal-600 rounded-full flex items-center justify-center mr-4">
            <FaClock className="text-white w-6 h-6" />
          </div>
          <div>
            <p className="text-gray-500">Upcoming Bookings</p>
            <p className="text-2xl font-bold text-gray-800">
              {bookings.filter((b) => b.status === "Scheduled").length}
            </p>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white shadow-md rounded-lg border border-gray-200 p-6 mb-12">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Your Bookings</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Service</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Provider</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Date</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentBookings.map((b) => (
                <tr
                  key={b.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedBooking(b)}
                >
                  <td className="px-4 py-2">{b.service}</td>
                  <td className="px-4 py-2">{b.providerName}</td>
                  <td className="px-4 py-2">{b.date}</td>
                  <td
                    className={`px-4 py-2 font-semibold ${
                      b.status === "Scheduled"
                        ? "text-blue-600"
                        : b.status === "In Progress"
                        ? "text-yellow-600"
                        : "text-green-600"
                    }`}
                  >
                    {b.status}
                  </td>
                </tr>
              ))}
              {currentBookings.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-gray-500">
                    No bookings found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-center space-x-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => handlePageChange(num)}
                className={`px-3 py-1 rounded-md border ${
                  currentPage === num
                    ? "bg-teal-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Providers Grid */}
      <div className="bg-white shadow-md rounded-lg border border-gray-200 p-6 mb-12">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Available Providers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map((p) => (
            <div
              key={p.id}
              className="p-4 border border-gray-200 rounded-lg shadow hover:shadow-lg transition cursor-pointer"
              onClick={() => openQuickBooking(p)}
            >
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="text-gray-500">{p.service}</p>
              <p className="text-yellow-500">⭐ {p.rating}</p>
              <p
                className={`mt-2 font-medium ${
                  p.isVerified ? "text-green-600" : "text-red-500"
                }`}
              >
                {p.isVerified ? "Verified" : "Unverified"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Booking Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-1/2 p-6 relative">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
              onClick={() => setSelectedProvider(null)}
            >
              <FaTimes className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Book {selectedProvider.name}
            </h2>

            <p className="mb-2"><strong>Service:</strong> {selectedProvider.service}</p>
            <p>
              <strong>Status:</strong>{" "}
              <span className={selectedProvider.isVerified ? "text-green-600" : "text-red-500"}>
                {selectedProvider.isVerified ? "Verified" : "Unverified"}
              </span>
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Date</label>
                <input
                  type="date"
                  className="input w-full"
                  value={quickBooking.date}
                  onChange={(e) => setQuickBooking({ ...quickBooking, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Time</label>
                <input
                  type="time"
                  className="input w-full"
                  value={quickBooking.time}
                  onChange={(e) => setQuickBooking({ ...quickBooking, time: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Notes</label>
                <textarea
                  className="input w-full"
                  placeholder="Additional instructions..."
                  value={quickBooking.notes}
                  onChange={(e) => setQuickBooking({ ...quickBooking, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end space-x-2">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
                onClick={() => setSelectedProvider(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition"
                onClick={submitQuickBooking}
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
