import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FaUsers,
  FaClipboardList,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";

import {
  fetchUsers,
  fetchProviders,
  fetchBookings,
  approveProvider,
  rejectProvider,
  updateBookingStatus,
} from "../../redux/slices/adminSlice";

export default function AdminDashboard() {
  const dispatch = useDispatch();

  const { users, providers, bookings, loading } = useSelector(
    (state) => state.admin
  );
  const { user } = useSelector((state) => state.auth);

  const [bookingFilter, setBookingFilter] = useState("All");
  const [bookingSearch, setBookingSearch] = useState("");

  /* =========================
     Fetch Admin Data
  ========================= */
  useEffect(() => {
    if (user?.role === "admin") {
      dispatch(fetchUsers());
      dispatch(fetchProviders());
      dispatch(fetchBookings());
    }
  }, [dispatch, user]);

  /* =========================
     Provider Actions
  ========================= */
  const handleProviderAction = (id, action) => {
    if (action === "approve") {
      dispatch(approveProvider(id));
    }

    if (action === "reject") {
      const notes =
        prompt("Enter rejection reason:") || "No reason provided";
      dispatch(rejectProvider({ id, notes }));
    }
  };

  /* =========================
     Filter Bookings
  ========================= */
  const filteredBookings = bookings.filter((b) => {
    const matchesStatus =
      bookingFilter === "All" || b.status === bookingFilter;

    const matchesSearch =
      b.service?.name
        ?.toLowerCase()
        .includes(bookingSearch.toLowerCase()) ||
      b.customer?.name
        ?.toLowerCase()
        .includes(bookingSearch.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  /* =========================
     UI
  ========================= */
  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        Admin Dashboard
      </h1>

      {/* =========================
         Stats
      ========================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard label="Total Users" value={users.length} icon={<FaUsers />} />
        <StatCard
          label="Total Providers"
          value={providers.length}
          icon={<FaUsers />}
        />
        <StatCard
          label="Total Bookings"
          value={bookings.length}
          icon={<FaClipboardList />}
        />
      </div>

      {/* =========================
         Providers
      ========================= */}
      <section className="bg-white p-6 rounded-lg shadow mb-12">
        <h2 className="text-xl font-semibold mb-4">Providers</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((p) => (
            <div
              key={p._id}
              className="border rounded-lg p-4 shadow-sm"
            >
              <h3 className="font-semibold text-lg">{p.name}</h3>
              <p className="text-gray-500">{p.email}</p>

              <p className="mt-2">
                Status:{" "}
                <span
                  className={`font-semibold ${
                    p.isVerified
                      ? "text-green-600"
                      : p.verificationStatus === "pending"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {p.isVerified
                    ? "Verified"
                    : p.verificationStatus}
                </span>
              </p>

              {!p.isVerified && p.verificationStatus === "pending" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() =>
                      handleProviderAction(p._id, "approve")
                    }
                    className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    <FaCheckCircle className="mr-1" /> Approve
                  </button>

                  <button
                    onClick={() =>
                      handleProviderAction(p._id, "reject")
                    }
                    className="flex items-center px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    <FaTimesCircle className="mr-1" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* =========================
         Bookings
      ========================= */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Bookings</h2>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Search bookings..."
            className="border rounded px-3 py-2 w-full md:w-1/2"
            value={bookingSearch}
            onChange={(e) => setBookingSearch(e.target.value)}
          />

          <div className="flex gap-2">
            {["All", "pending", "accepted", "completed", "cancelled"].map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setBookingFilter(status)}
                  className={`px-3 py-1 rounded border ${
                    bookingFilter === status
                      ? "bg-teal-600 text-white"
                      : "bg-white"
                  }`}
                >
                  {status}
                </button>
              )
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Service</th>
                <th className="px-4 py-2 text-left">Customer</th>
                <th className="px-4 py-2 text-left">Provider</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredBookings.map((b) => (
                <tr key={b._id} className="border-t">
                  <td className="px-4 py-2">{b.service?.name}</td>
                  <td className="px-4 py-2">{b.customer?.name}</td>
                  <td className="px-4 py-2">{b.provider?.name}</td>
                  <td className="px-4 py-2 font-semibold capitalize">
                    {b.status}
                  </td>
                </tr>
              ))}

              {filteredBookings.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-4 text-gray-500"
                  >
                    No bookings found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {loading && (
        <p className="text-center mt-6 text-gray-500">
          Loading admin data...
        </p>
      )}
    </div>
  );
}

/* =========================
   Small Stat Card
========================= */
function StatCard({ label, value, icon }) {
  return (
    <div className="flex items-center bg-white p-6 rounded-lg shadow">
      <div className="p-4 bg-teal-600 text-white rounded-full mr-4">
        {icon}
      </div>
      <div>
        <p className="text-gray-500">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}
