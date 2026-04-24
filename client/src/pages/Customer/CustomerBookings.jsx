// src/pages/customer/CustomerBookings.jsx
import { useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaClock,
  FaUser,
  FaTimes,
  FaRedo,
  FaInfoCircle,
  FaFilter,
  FaSearch,
  FaExclamationTriangle,
  FaComments,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { createDispute } from "../../api/disputeApi.js";
import Chat from "../../components/Chat/Chat.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const FILTERS = ["All", "Upcoming", "Completed", "Cancelled"];
const PAGE_SIZE = 7;

const DISPUTE_OPTIONS = [
  { value: "no_show", label: "Provider did not show up" },
  { value: "poor_quality", label: "Poor service quality" },
  { value: "scope_mismatch", label: "Scope mismatch" },
  { value: "payment_issue", label: "Payment issue" },
  { value: "damage", label: "Damage or loss" },
  { value: "other", label: "Other" },
];

export default function CustomerBookings() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({ date: "", time: "" });

  const [disputeBooking, setDisputeBooking] = useState(null);
  const [disputeData, setDisputeData] = useState({
    category: "",
    issue: "",
  });
  const [disputeBusyId, setDisputeBusyId] = useState(null);

  const [chatBooking, setChatBooking] = useState(null);

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

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const bookingDate = new Date(b.scheduledAt);
      const status = String(b.status || "").toLowerCase();

      const isUpcoming =
        ["pending", "accepted", "in_progress"].includes(status) &&
        bookingDate > new Date();
      const isCompleted = status === "completed";
      const isCancelled = status === "cancelled";

      const matchesFilter =
        filter === "All" ||
        (filter === "Upcoming" && isUpcoming) ||
        (filter === "Completed" && isCompleted) ||
        (filter === "Cancelled" && isCancelled);

      const serviceName = (b.serviceName || "").toLowerCase();
      const providerName = (
        b.provider?.basicInfo?.providerName || b.providerName || ""
      ).toLowerCase();
      const search = query.trim().toLowerCase();

      const matchesQuery =
        !search || serviceName.includes(search) || providerName.includes(search);

      return matchesFilter && matchesQuery;
    });
  }, [bookings, filter, query]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, query]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredBookings.slice(start, start + PAGE_SIZE);
  }, [filteredBookings, currentPage]);

  const resetDisputeModal = () => {
    setDisputeBooking(null);
    setDisputeData({ category: "", issue: "" });
  };

  const openChat = (booking) => {
    setChatBooking(booking);
  };

  const closeChat = () => {
    setChatBooking(null);
  };

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

  const openDisputeFromBooking = (booking) => {
    const hasExistingDispute = Boolean(booking.disputeId || booking.dispute?._id);

    if (hasExistingDispute) {
      const disputeId =
        booking.disputeId?._id || booking.disputeId || booking.dispute?._id;
      navigate(`/customer/disputes/${disputeId}`);
      return;
    }

    setDisputeBooking(booking);
    setDisputeData({
      category: "",
      issue: "",
    });
  };

  const submitDispute = async () => {
    if (!disputeBooking) return;

    if (!disputeData.category) {
      alert("Please select a reason for the dispute.");
      return;
    }

    if (!disputeData.issue.trim()) {
      alert("Please describe the issue.");
      return;
    }

    const serviceName = disputeBooking.serviceName || "Booking";
    const providerName =
      disputeBooking.provider?.basicInfo?.providerName ||
      disputeBooking.providerName ||
      "Provider";
    const customerName = user?.name || "Customer";

    const fullDescription = `Service: ${serviceName}
Customer: ${customerName}
Provider: ${providerName}

Issue: ${disputeData.issue.trim()}`;

    setDisputeBusyId(disputeBooking._id);

    try {
      const dispute = await createDispute({
        jobId: disputeBooking._id,
        category: disputeData.category,
        description: fullDescription,
      });

      resetDisputeModal();
      navigate(`/customer/disputes/${dispute._id}`);
    } catch (err) {
      console.error("Open dispute error:", err);
      alert(err?.response?.data?.message || err.message || "Failed to open dispute");
    } finally {
      setDisputeBusyId(null);
    }
  };

  const disputeServiceName = disputeBooking?.serviceName || "Service";
  const disputeProviderName =
    disputeBooking?.provider?.basicInfo?.providerName ||
    disputeBooking?.providerName ||
    "Provider";
  const disputeCustomerName = user?.name || "Customer";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-teal-100 bg-white px-6 py-4 text-teal-700 shadow-sm">
          Loading bookings…
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-2 py-3 sm:px-3 lg:px-4 xl:px-5">
      <div className="space-y-5">
        <div className="rounded-[26px] border border-teal-200 bg-gradient-to-r from-teal-600 via-cyan-600 to-sky-600 p-5 shadow-lg">
          <h1 className="text-3xl font-bold tracking-tight text-white">Your Bookings</h1>
          <p className="mt-1 text-sm text-teal-50 sm:text-base">
            View, reschedule, cancel, dispute, and track all your bookings in one place.
          </p>
        </div>

        <div className="grid gap-4 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setCurrentPage(1);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-teal-600 text-white shadow-sm"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <FaFilter className="text-[11px]" />
                    {f}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-80">
            <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search service or provider..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>
        </div>

        <div className="hidden overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm lg:block">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <Th>Service</Th>
                  <Th>Provider</Th>
                  <Th>Date</Th>
                  <Th>Time</Th>
                  <Th>Status</Th>
                  <Th>Price</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>

              <tbody>
                {paginatedBookings.length === 0 ? (
                  <tr className="border-b border-slate-200">
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
                        <p className="text-base font-semibold text-slate-700">No bookings found</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Try a different filter or search term.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedBookings.map((b) => {
                    const bookingDate = new Date(b.scheduledAt);
                    const isUpcoming =
                      ["pending", "accepted", "in_progress"].includes(
                        String(b.status).toLowerCase()
                      ) && bookingDate > new Date();

                    const disputeId =
                      b.disputeId?._id || b.disputeId || b.dispute?._id || null;
                    const hasDispute = Boolean(disputeId);

                    return (
                      <tr
                        key={b._id}
                        className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-4 align-top">
                          <div className="max-w-[220px]">
                            <div className="truncate font-semibold text-slate-900">
                              {b.serviceName}
                            </div>
                            <div className="mt-1 truncate text-sm text-slate-500">
                              {b.notes || "No notes"}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                              <FaUser className="text-sm" />
                            </span>
                            <span className="font-medium">
                              {b.provider?.basicInfo?.providerName || b.providerName}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 align-top text-sm text-slate-700">
                          <span className="inline-flex items-center gap-2">
                            <FaCalendarAlt className="text-teal-600" />
                            {bookingDate.toLocaleDateString()}
                          </span>
                        </td>

                        <td className="px-5 py-4 align-top text-sm text-slate-700">
                          <span className="inline-flex items-center gap-2">
                            <FaClock className="text-teal-600" />
                            {bookingDate.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>

                        <td className="px-5 py-4 align-top">
                          <StatusBadge status={b.status} />
                        </td>

                        <td className="px-5 py-4 align-top text-sm font-semibold text-slate-900">
                          {typeof b.price === "number" ? `Ksh ${b.price.toFixed(2)}` : "N/A"}
                        </td>

                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              onClick={() => setSelectedBooking(b)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                            >
                              <FaInfoCircle />
                              Details
                            </button>

                            <button
                              onClick={() => openChat(b)}
                              className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
                            >
                              <FaComments />
                              Chat
                            </button>

                            <button
                              onClick={() => openDisputeFromBooking(b)}
                              disabled={disputeBusyId === b._id}
                              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <FaExclamationTriangle />
                              {hasDispute
                                ? "View Dispute"
                                : disputeBusyId === b._id
                                ? "Opening..."
                                : "Raise Dispute"}
                            </button>

                            {isUpcoming && (
                              <>
                                <button
                                  onClick={() => openReschedule(b)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-100"
                                >
                                  <FaRedo />
                                  Reschedule
                                </button>
                                <button
                                  onClick={() => handleCancel(b._id)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                                >
                                  <FaTimes />
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredBookings.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
              <p className="text-sm text-slate-600">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {(currentPage - 1) * PAGE_SIZE + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-900">
                  {Math.min(currentPage * PAGE_SIZE, filteredBookings.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900">{filteredBookings.length}</span>{" "}
                bookings
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Back
                </button>
                <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4 lg:hidden">
          {paginatedBookings.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <p className="font-semibold text-slate-700">No bookings found</p>
              <p className="mt-1 text-sm text-slate-500">
                Try a different filter or search term.
              </p>
            </div>
          ) : (
            paginatedBookings.map((b) => {
              const bookingDate = new Date(b.scheduledAt);
              const isUpcoming =
                ["pending", "accepted", "in_progress"].includes(
                  String(b.status).toLowerCase()
                ) && bookingDate > new Date();

              const disputeId =
                b.disputeId?._id || b.disputeId || b.dispute?._id || null;
              const hasDispute = Boolean(disputeId);

              return (
                <div
                  key={b._id}
                  className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{b.serviceName}</h3>
                      <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                        <FaUser className="text-teal-600" />
                        {b.provider?.basicInfo?.providerName || b.providerName}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate-700">
                    <InfoLine
                      icon={<FaCalendarAlt className="text-teal-600" />}
                      label="Date"
                      value={bookingDate.toLocaleDateString()}
                    />
                    <InfoLine
                      icon={<FaClock className="text-teal-600" />}
                      label="Time"
                      value={bookingDate.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    />
                    <InfoLine
                      label="Price"
                      value={typeof b.price === "number" ? `Ksh ${b.price.toFixed(2)}` : "N/A"}
                    />
                    <InfoLine label="Notes" value={b.notes || "No notes"} />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedBooking(b)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <FaInfoCircle />
                      Details
                    </button>

                    <button
                      onClick={() => openChat(b)}
                      className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
                    >
                      <FaComments />
                      Chat
                    </button>

                    <button
                      onClick={() => openDisputeFromBooking(b)}
                      disabled={disputeBusyId === b._id}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FaExclamationTriangle />
                      {hasDispute
                        ? "View Dispute"
                        : disputeBusyId === b._id
                        ? "Opening..."
                        : "Raise Dispute"}
                    </button>

                    {isUpcoming && (
                      <>
                        <button
                          onClick={() => openReschedule(b)}
                          className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-100"
                        >
                          <FaRedo />
                          Reschedule
                        </button>
                        <button
                          onClick={() => handleCancel(b._id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                        >
                          <FaTimes />
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {filteredBookings.length > 0 && (
            <div className="flex items-center justify-between rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
              <div className="text-sm font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <button
              className="absolute right-4 top-4 text-slate-400 transition hover:text-slate-700"
              onClick={() => setRescheduleBooking(null)}
            >
              <FaTimes />
            </button>

            <h2 className="text-xl font-bold text-slate-900">Reschedule Booking</h2>
            <p className="mt-1 text-sm text-slate-500">{rescheduleBooking.serviceName}</p>

            <div className="mt-5 space-y-4">
              <FieldLabel label="New date" />
              <input
                type="date"
                value={rescheduleData.date}
                onChange={(e) =>
                  setRescheduleData({ ...rescheduleData, date: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />

              <FieldLabel label="New time" />
              <input
                type="time"
                value={rescheduleData.time}
                onChange={(e) =>
                  setRescheduleData({ ...rescheduleData, time: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />

              <button
                className="w-full rounded-xl bg-teal-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-teal-700"
                onClick={submitReschedule}
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {disputeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
            <button
              className="absolute right-4 top-4 text-slate-400 transition hover:text-slate-700"
              onClick={resetDisputeModal}
              disabled={disputeBusyId === disputeBooking._id}
            >
              <FaTimes />
            </button>

            <h2 className="text-xl font-bold text-slate-900">Raise a Dispute</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a category from the schema, then describe the issue.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <FieldLabel label="Category" />
                <select
                  value={disputeData.category}
                  onChange={(e) =>
                    setDisputeData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  disabled={disputeBusyId === disputeBooking._id}
                >
                  <option value="">Select category</option>
                  {DISPUTE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel label="Description" />
                <textarea
                  value={disputeData.issue}
                  onChange={(e) =>
                    setDisputeData((prev) => ({
                      ...prev,
                      issue: e.target.value,
                    }))
                  }
                  placeholder="Describe what happened..."
                  rows={5}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  disabled={disputeBusyId === disputeBooking._id}
                />
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Service and parties involved</p>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <p>
                    <span className="font-medium text-slate-900">Service:</span> {disputeServiceName}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Customer:</span> {disputeCustomerName}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Provider:</span> {disputeProviderName}
                  </p>
                </div>
              </div>

              <button
                className="w-full rounded-xl bg-amber-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={submitDispute}
                disabled={disputeBusyId === disputeBooking._id}
              >
                {disputeBusyId === disputeBooking._id ? "Submitting..." : "Submit Dispute"}
              </button>

              <button
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={resetDisputeModal}
                disabled={disputeBusyId === disputeBooking._id}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedBooking && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() => setSelectedBooking(null)}
          />
          <div className="relative ml-auto flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 border-b border-slate-200 bg-white px-6 py-4">
              <button
                className="absolute right-4 top-4 text-slate-400 transition hover:text-slate-700"
                onClick={() => setSelectedBooking(null)}
              >
                <FaTimes />
              </button>
              <h2 className="pr-8 text-xl font-bold text-slate-900">Booking Details</h2>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div className="rounded-[22px] bg-gradient-to-r from-teal-50 to-cyan-50 p-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {selectedBooking.serviceName}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedBooking.provider?.basicInfo?.providerName || selectedBooking.providerName}
                </p>
              </div>

              <DetailRow
                label="Date"
                value={new Date(selectedBooking.scheduledAt).toLocaleDateString()}
              />
              <DetailRow
                label="Time"
                value={new Date(selectedBooking.scheduledAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
              <DetailRow label="Status" value={selectedBooking.status} />
              <DetailRow label="Notes" value={selectedBooking.notes || "N/A"} />
              <DetailRow
                label="Price"
                value={
                  typeof selectedBooking.price === "number"
                    ? `Ksh ${selectedBooking.price.toFixed(2)}`
                    : "N/A"
                }
              />

              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-900">Chat section</h3>
                  <button
                    onClick={() => openChat(selectedBooking)}
                    className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
                  >
                    <FaComments />
                    Open chat
                  </button>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Use this booking chat to speak with the provider about timing, updates, and support.
                </p>
              </div>

              <button
                onClick={() => openDisputeFromBooking(selectedBooking)}
                disabled={disputeBusyId === selectedBooking._id}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaExclamationTriangle />
                {selectedBooking.disputeId || selectedBooking.dispute?._id
                  ? "View Dispute"
                  : disputeBusyId === selectedBooking._id
                  ? "Opening..."
                  : "Raise Dispute"}
              </button>
            </div>
          </div>
        </div>
      )}

      {chatBooking && (
        <ChatBookingModal
          booking={chatBooking}
          token={token}
          userId={user?._id || user?.id}
          onClose={closeChat}
        />
      )}
    </div>
  );
}

const Th = ({ children, align = "left" }) => {
  const alignClass = align === "right" ? "text-right" : "text-left";
  return (
    <th
      className={`px-5 py-4 ${alignClass} text-xs font-semibold uppercase tracking-wider text-slate-500`}
    >
      {children}
    </th>
  );
};

const InfoLine = ({ icon, label, value }) => (
  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
    <div className="flex items-center gap-2 text-sm text-slate-600">
      {icon ? icon : <span className="h-2 w-2 rounded-full bg-slate-400" />}
      <span>{label}</span>
    </div>
    <span className="text-sm font-semibold text-slate-900">{value}</span>
  </div>
);

const FieldLabel = ({ label }) => (
  <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
);

const StatusBadge = ({ status }) => {
  const s = String(status || "").toLowerCase();

  const styles = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    accepted: "bg-teal-50 text-teal-700 border-teal-200",
    in_progress: "bg-cyan-50 text-cyan-700 border-cyan-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
        styles[s] || "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {status || "N/A"}
    </span>
  );
};

const DetailRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
    <span className="text-sm font-medium text-slate-600">{label}</span>
    <span className="text-right text-sm font-semibold text-slate-900">{value}</span>
  </div>
);

const ChatBookingModal = ({ booking, token, userId, onClose }) => {
  const providerName =
    booking?.provider?.basicInfo?.providerName || booking?.providerName || "Provider";

  return (
    <div className="fixed inset-0 z-[60] bg-black/45 p-0 sm:p-4">
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:mx-auto sm:h-[85vh] sm:w-11/12 sm:max-w-5xl sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-teal-600 sm:text-lg">
              Chat with {providerName}
            </h2>
            {booking?.serviceName && (
              <p className="truncate text-xs text-gray-500 sm:text-sm">{booking.serviceName}</p>
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

        <div className="min-h-0 flex-1 overflow-hidden p-2 sm:p-4">
          <div className="h-full min-h-0 overflow-hidden rounded-xl border bg-white">
            <Chat bookingId={booking?._id} token={token} userId={userId} />
          </div>
        </div>
      </div>
    </div>
  );
};
