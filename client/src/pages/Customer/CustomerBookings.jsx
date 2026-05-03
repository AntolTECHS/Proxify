// src/pages/customer/CustomerBookings.jsx
import { useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaUser,
  FaTimes,
  FaRedo,
  FaInfoCircle,
  FaFilter,
  FaSearch,
  FaExclamationTriangle,
  FaComments,
  FaLayerGroup,
  FaMoneyBillWave,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { createDispute } from "../../api/disputeApi.js";
import Chat from "../../components/Chat/Chat.jsx";
import "../../styles/customerBookings.css";

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

  const bookingStats = useMemo(() => {
    const now = new Date();
    const stats = {
      total: bookings.length,
      upcoming: 0,
      completed: 0,
      cancelled: 0,
      spend: 0,
    };

    bookings.forEach((booking) => {
      const status = String(booking.status || "").toLowerCase();
      const bookingDate = new Date(booking.scheduledAt);
      const isUpcoming =
        ["pending", "accepted", "in_progress"].includes(status) && bookingDate > now;

      if (isUpcoming) stats.upcoming += 1;
      if (status === "completed") {
        stats.completed += 1;
        if (typeof booking.price === "number") stats.spend += booking.price;
      }
      if (status === "cancelled") stats.cancelled += 1;
    });

    return stats;
  }, [bookings]);

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
  const filteredLabel = filter === "All" ? "All bookings" : `${filter} bookings`;
  const formatCurrency = (value) => `Ksh ${value.toFixed(2)}`;

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
    <div className="customer-bookings-page relative w-full overflow-hidden px-2 py-3 sm:px-3 lg:px-4 xl:px-5">
      <div className="pointer-events-none absolute -left-14 top-10 h-48 w-48 rounded-full bg-[#0f766e]/15 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-24 h-64 w-64 rounded-full bg-[#ca8a04]/10 blur-3xl" />

      <div className="relative space-y-5">
        <div className="bookings-reveal rounded-[28px] border border-[#d4e5df] bg-gradient-to-r from-[#f6fffc] via-[#eef9f5] to-[#fef6e4] p-5 shadow-[0_18px_60px_rgba(8,47,43,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6f8885]">Bookings hub</p>
              <h1 className="bookings-hero-title text-3xl font-black tracking-tight text-[#143f3a] sm:text-4xl">
                Your Bookings
              </h1>
            </div>
            <div className="rounded-2xl border border-[#d4e5df] bg-white/90 px-4 py-2 text-sm font-semibold text-[#0f766e] shadow-sm">
              {filteredLabel} · {filteredBookings.length} shown
            </div>
          </div>
          <p className="mt-1 text-sm text-[#4f6b68] sm:text-base">
            View, reschedule, cancel, dispute, and track all your bookings in one place.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total bookings"
            value={bookingStats.total}
            icon={<FaLayerGroup />}
            tone="teal"
          />
          <StatCard
            title="Upcoming"
            value={bookingStats.upcoming}
            icon={<FaClock />}
            tone="sky"
          />
          <StatCard
            title="Completed"
            value={bookingStats.completed}
            icon={<FaCheckCircle />}
            tone="emerald"
          />
          <StatCard
            title="Total spend"
            value={formatCurrency(bookingStats.spend)}
            icon={<FaMoneyBillWave />}
            tone="amber"
          />
        </div>

        <div className="bookings-reveal grid gap-4 rounded-[22px] border border-[#d4e5df] bg-white/95 p-4 shadow-[0_12px_35px_rgba(8,47,43,0.09)] lg:grid-cols-[1fr_auto] lg:items-center">
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
                      ? "bg-[#0f766e] text-white shadow-sm"
                      : "border border-[#d7e6e1] bg-[#f8fcfb] text-[#4f6d69] hover:bg-white"
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
            <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7b9592]" />
            <input
              type="text"
              placeholder="Search service or provider..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-[#d4e4df] bg-[#f7fcfa] py-2 pl-10 pr-3 text-sm text-[#203f3b] outline-none transition placeholder:text-[#8aa5a1] focus:border-[#0f766e] focus:bg-white focus:ring-2 focus:ring-[#0f766e]/15"
            />
          </div>
        </div>

        <div className="bookings-panel bookings-reveal hidden overflow-hidden rounded-[24px] border border-[#d4e5df] bg-white shadow-[0_12px_35px_rgba(8,47,43,0.08)] lg:block">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-[#f7fcfa]">
                <tr className="border-b border-[#dce9e4]">
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
                  <tr className="border-b border-[#dce9e4]">
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-[#d4e5df] bg-[#f8fcfb] px-6 py-10">
                        <p className="text-base font-semibold text-[#4f6d69]">No bookings found</p>
                        <p className="mt-1 text-sm text-[#78928f]">
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
                        className="border-b border-[#dce9e4] last:border-b-0 hover:bg-[#f9fcfb]"
                      >
                        <td className="px-5 py-4 align-top">
                          <div className="max-w-[220px]">
                            <div className="truncate font-semibold text-[#143f3a]">
                              {b.serviceName}
                            </div>
                            <div className="mt-1 truncate text-sm text-[#6e8784]">
                              {b.notes || "No notes"}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 align-top">
                          <div className="flex items-center gap-2 text-sm text-[#4b6764]">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#e9f6f2] text-[#0f766e]">
                              <FaUser className="text-sm" />
                            </span>
                            <span className="font-medium">
                              {b.provider?.basicInfo?.providerName || b.providerName}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 align-top text-sm text-[#4f6d69]">
                          <span className="inline-flex items-center gap-2">
                            <FaCalendarAlt className="text-[#0f766e]" />
                            {bookingDate.toLocaleDateString()}
                          </span>
                        </td>

                        <td className="px-5 py-4 align-top text-sm text-[#4f6d69]">
                          <span className="inline-flex items-center gap-2">
                            <FaClock className="text-[#0f766e]" />
                            {bookingDate.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>

                        <td className="px-5 py-4 align-top">
                          <StatusBadge status={b.status} />
                        </td>

                        <td className="px-5 py-4 align-top text-sm font-semibold text-[#143f3a]">
                          {typeof b.price === "number" ? `Ksh ${b.price.toFixed(2)}` : "N/A"}
                        </td>

                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              onClick={() => setSelectedBooking(b)}
                              className="inline-flex items-center gap-2 rounded-xl border border-[#d7e6e1] bg-white px-3 py-2 text-sm font-medium text-[#4f6d69] transition hover:border-[#0f766e]/35 hover:bg-[#edf8f5] hover:text-[#0f766e]"
                            >
                              <FaInfoCircle />
                              Details
                            </button>

                            <button
                              onClick={() => openChat(b)}
                              className="inline-flex items-center gap-2 rounded-xl border border-[#cfe1db] bg-[#f6fcfa] px-3 py-2 text-sm font-medium text-[#0f766e] transition hover:bg-[#edf8f5]"
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
                                  className="inline-flex items-center gap-2 rounded-xl border border-[#cfe1db] bg-[#f6fcfa] px-3 py-2 text-sm font-medium text-[#0f766e] transition hover:bg-[#edf8f5]"
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
              <p className="text-sm text-[#5f7a77]">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {(currentPage - 1) * PAGE_SIZE + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-900">
                  {Math.min(currentPage * PAGE_SIZE, filteredBookings.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-[#143f3a]">{filteredBookings.length}</span>{" "}
                bookings
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl border border-[#d7e6e1] bg-white px-4 py-2 text-sm font-medium text-[#4f6d69] transition hover:bg-[#f6fcfa] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Back
                </button>
                <div className="rounded-xl bg-[#edf7f4] px-4 py-2 text-sm font-semibold text-[#4f6d69]">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-xl border border-[#d7e6e1] bg-white px-4 py-2 text-sm font-medium text-[#4f6d69] transition hover:bg-[#f6fcfa] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4 lg:hidden">
          {paginatedBookings.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[#d4e5df] bg-white p-8 text-center shadow-sm">
              <p className="font-semibold text-[#4f6d69]">No bookings found</p>
              <p className="mt-1 text-sm text-[#78928f]">
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
                  className="bookings-card bookings-reveal rounded-[24px] border border-[#d4e5df] bg-white p-5 shadow-[0_10px_30px_rgba(8,47,43,0.08)] transition hover:shadow-[0_14px_36px_rgba(8,47,43,0.14)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-[#143f3a]">{b.serviceName}</h3>
                      <p className="mt-1 flex items-center gap-2 text-sm text-[#5f7a77]">
                        <FaUser className="text-[#0f766e]" />
                        {b.provider?.basicInfo?.providerName || b.providerName}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-[#4f6d69]">
                    <InfoLine
                      icon={<FaCalendarAlt className="text-[#0f766e]" />}
                      label="Date"
                      value={bookingDate.toLocaleDateString()}
                    />
                    <InfoLine
                      icon={<FaClock className="text-[#0f766e]" />}
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
                      className="inline-flex items-center gap-2 rounded-xl border border-[#d7e6e1] bg-white px-4 py-2 text-sm font-medium text-[#4f6d69] transition hover:bg-[#f6fcfa]"
                    >
                      <FaInfoCircle />
                      Details
                    </button>

                    <button
                      onClick={() => openChat(b)}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#cfe1db] bg-[#f6fcfa] px-4 py-2 text-sm font-medium text-[#0f766e] transition hover:bg-[#edf8f5]"
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
                          className="inline-flex items-center gap-2 rounded-xl border border-[#cfe1db] bg-[#f6fcfa] px-4 py-2 text-sm font-medium text-[#0f766e] transition hover:bg-[#edf8f5]"
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
            <div className="flex items-center justify-between rounded-[24px] border border-[#d4e5df] bg-white px-4 py-4 shadow-sm">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-[#d7e6e1] bg-white px-4 py-2 text-sm font-medium text-[#4f6d69] transition hover:bg-[#f6fcfa] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
              <div className="text-sm font-semibold text-[#4f6d69]">
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-[#d7e6e1] bg-white px-4 py-2 text-sm font-medium text-[#4f6d69] transition hover:bg-[#f6fcfa] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#041311]/50 p-4 backdrop-blur-sm transition-opacity duration-300">
          <div className="relative w-full max-w-md rounded-2xl border border-[#d4e5df] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <button
              className="absolute right-4 top-4 rounded-full p-2 text-[#7b9592] transition-all hover:bg-[#ecf5f2] hover:text-[#0f766e]"
              onClick={() => setRescheduleBooking(null)}
            >
              <FaTimes className="text-lg" />
            </button>

            <h2 className="text-2xl font-black text-[#143f3a]">Reschedule Booking</h2>
            <p className="mt-2 text-sm text-[#6f8885]">{rescheduleBooking.serviceName}</p>

            <div className="mt-6 space-y-4">
              <FieldLabel label="New date" />
              <input
                type="date"
                value={rescheduleData.date}
                onChange={(e) =>
                  setRescheduleData({ ...rescheduleData, date: e.target.value })
                }
                className="w-full rounded-xl border-2 border-[#d4e4df] bg-[#f7fcfa] px-4 py-3 text-[#203f3b] outline-none transition-all focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/15"
              />

              <FieldLabel label="New time" />
              <input
                type="time"
                value={rescheduleData.time}
                onChange={(e) =>
                  setRescheduleData({ ...rescheduleData, time: e.target.value })
                }
                className="w-full rounded-xl border-2 border-[#d4e4df] bg-[#f7fcfa] px-4 py-3 text-[#203f3b] outline-none transition-all focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/15"
              />

              <button
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-[#0f766e] to-[#0d6b64] px-4 py-3 font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105"
                onClick={submitReschedule}
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {disputeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#041311]/50 p-4 backdrop-blur-sm transition-opacity duration-300">
          <div className="relative w-full max-h-[90vh] max-w-lg overflow-hidden rounded-2xl border border-[#d4e5df] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <button
              className="absolute right-4 top-4 rounded-full p-2 text-[#7b9592] transition-all hover:bg-[#ecf5f2] hover:text-[#0f766e] disabled:cursor-not-allowed"
              onClick={resetDisputeModal}
              disabled={disputeBusyId === disputeBooking._id}
            >
              <FaTimes className="text-lg" />
            </button>

            <h2 className="text-2xl font-black text-[#143f3a]">Raise a Dispute</h2>
            <p className="mt-2 text-sm text-[#6f8885]">
              Choose a category and describe the issue in detail.
            </p>

            <div className="mt-6 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(90vh - 200px)" }}>
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
                  className="w-full rounded-xl border-2 border-[#d4e4df] bg-[#f7fcfa] px-4 py-3 text-[#203f3b] outline-none transition-all focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/15 disabled:cursor-not-allowed"
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
                  className="w-full rounded-xl border-2 border-[#d4e4df] bg-[#f7fcfa] px-4 py-3 text-[#203f3b] outline-none transition-all placeholder:text-[#8aa5a1] focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/15 disabled:cursor-not-allowed"
                  disabled={disputeBusyId === disputeBooking._id}
                />
              </div>

              <div className="rounded-2xl border border-[#d4e5df] bg-[#f8fcfb] p-5">
                <p className="text-sm font-semibold text-[#143f3a]">Service and parties involved</p>
                <div className="mt-4 space-y-3 text-sm text-[#4f6d69]">
                  <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5">
                    <span className="font-medium text-[#143f3a]">Service:</span>
                    <span className="text-right font-semibold text-[#0f766e]">{disputeServiceName}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5">
                    <span className="font-medium text-[#143f3a]">Customer:</span>
                    <span className="text-right font-semibold text-[#0f766e]">{disputeCustomerName}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5">
                    <span className="font-medium text-[#143f3a]">Provider:</span>
                    <span className="text-right font-semibold text-[#0f766e]">{disputeProviderName}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-[#d4e5df] pt-5">
                <button
                  className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-3 font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={submitDispute}
                  disabled={disputeBusyId === disputeBooking._id}
                >
                  {disputeBusyId === disputeBooking._id ? "Submitting..." : "Submit Dispute"}
                </button>

                <button
                  className="w-full rounded-xl border-2 border-[#d4e5df] bg-white px-4 py-3 font-semibold text-[#4f6d69] transition-all hover:bg-[#f8fcfb] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={resetDisputeModal}
                  disabled={disputeBusyId === disputeBooking._id}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedBooking && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#041311]/50 p-4 backdrop-blur-sm transition-opacity duration-300">
          <div
            className="absolute inset-0"
            onClick={() => setSelectedBooking(null)}
          />
          <div className="relative flex h-auto max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#d4e5df] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="sticky top-0 border-b border-[#dce9e4] bg-gradient-to-r from-[#f8fcfb] to-white px-6 py-5">
              <button
                  className="absolute right-4 top-4 rounded-full p-2 text-[#7b9592] transition-all hover:bg-[#ecf5f2] hover:text-[#0f766e]"
                onClick={() => setSelectedBooking(null)}
              >
                <FaTimes className="text-lg" />
              </button>
                <h2 className="pr-8 text-2xl font-black text-[#143f3a]">Booking Details</h2>
                <p className="mt-1 text-sm text-[#5f7a77]">Complete information and actions for this booking</p>
            </div>

            <div className="space-y-5 overflow-y-auto px-6 py-6">
                <div className="rounded-[22px] border border-[#d4e5df] bg-gradient-to-r from-[#eef9f5] to-[#f8fcfb] p-4">
                  <h3 className="text-lg font-semibold text-[#143f3a]">
                  {selectedBooking.serviceName}
                </h3>
                  <p className="mt-1 text-sm text-[#5f7a77]">
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

              <div className="rounded-[22px] border border-[#d4e5df] bg-[#f8fcfb] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-[#143f3a]">Chat section</h3>
                  <button
                    onClick={() => openChat(selectedBooking)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#cfe1db] bg-[#f6fcfa] px-3 py-2 text-sm font-medium text-[#0f766e] transition hover:bg-[#edf8f5]"
                  >
                    <FaComments />
                    Open chat
                  </button>
                </div>
                <p className="mt-2 text-sm text-[#5f7a77]">
                  Use this booking chat to speak with the provider about timing, updates, and support.
                </p>
              </div>

              <div className="rounded-2xl border border-[#d4e5df] bg-gradient-to-r from-[#f8fcfb] to-[#f0fbf9] p-5">
                <h3 className="mb-4 text-base font-bold text-[#143f3a]">Quick Actions</h3>
                <div className="flex flex-col gap-3">
                  {selectedBooking.status !== "completed" && (
                    <>
                      {(() => {
                        const bookingDate = new Date(selectedBooking.scheduledAt);
                        const isUpcoming =
                          ["pending", "accepted", "in_progress"].includes(
                            String(selectedBooking.status).toLowerCase()
                          ) && bookingDate > new Date();

                        return isUpcoming ? (
                          <>
                            <button
                              onClick={() => openReschedule(selectedBooking)}
                              className="flex items-center justify-center gap-2 rounded-xl border border-[#0f766e]/20 bg-[#f0fbf9] px-4 py-3 text-sm font-semibold text-[#0f766e] transition-all hover:border-[#0f766e]/40 hover:bg-[#edf8f5]"
                            >
                              <FaRedo />
                              Reschedule
                            </button>
                            <button
                              onClick={() => handleCancel(selectedBooking._id)}
                              className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition-all hover:bg-rose-100"
                            >
                              <FaTimes />
                              Cancel
                            </button>
                          </>
                        ) : null;
                      })()}
                    </>
                  )}
                  
                  <button
                    onClick={() => openChat(selectedBooking)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0f766e] to-[#0d6b64] px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105"
                  >
                    <FaComments />
                    Open Chat
                  </button>
                  
                  <button
                    onClick={() => openDisputeFromBooking(selectedBooking)}
                    disabled={disputeBusyId === selectedBooking._id}
                    className="flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition-all hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
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
      className={`px-5 py-4 ${alignClass} text-xs font-semibold uppercase tracking-wider text-[#6f8885]`}
    >
      {children}
    </th>
  );
};

const STAT_TONES = {
  teal: {
    ring: "ring-[#0f766e]/20",
    bg: "from-[#ecfdf9] via-white to-white",
    icon: "bg-[#0f766e]/10 text-[#0f766e]",
    title: "text-[#4f6d69]",
    value: "text-[#0f2f2b]",
  },
  sky: {
    ring: "ring-[#0ea5e9]/15",
    bg: "from-[#eff8ff] via-white to-white",
    icon: "bg-[#0ea5e9]/10 text-[#0369a1]",
    title: "text-[#4f6d69]",
    value: "text-[#0f2f2b]",
  },
  emerald: {
    ring: "ring-[#10b981]/15",
    bg: "from-[#ecfdf5] via-white to-white",
    icon: "bg-[#10b981]/10 text-[#047857]",
    title: "text-[#4f6d69]",
    value: "text-[#0f2f2b]",
  },
  amber: {
    ring: "ring-[#f59e0b]/15",
    bg: "from-[#fffbeb] via-white to-white",
    icon: "bg-[#f59e0b]/10 text-[#b45309]",
    title: "text-[#4f6d69]",
    value: "text-[#0f2f2b]",
  },
};

const StatCard = ({ title, value, icon, tone }) => {
  const styles = STAT_TONES[tone] || STAT_TONES.teal;
  return (
    <div
      className={`bookings-stat-card bookings-reveal rounded-[22px] border border-[#d4e5df] bg-gradient-to-br ${styles.bg} p-4 shadow-[0_12px_30px_rgba(8,47,43,0.08)] ring-1 ${styles.ring}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.26em] ${styles.title}`}>
            {title}
          </p>
          <p className={`mt-2 text-2xl font-black ${styles.value}`}>{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${styles.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const InfoLine = ({ icon, label, value }) => (
  <div className="flex items-center justify-between rounded-xl border border-[#d4e5df] bg-[#f8fcfb] px-4 py-3">
    <div className="flex items-center gap-2 text-sm text-[#5f7a77]">
      {icon ? icon : <span className="h-2 w-2 rounded-full bg-[#90a9a6]" />}
      <span>{label}</span>
    </div>
    <span className="text-sm font-semibold text-[#143f3a]">{value}</span>
  </div>
);

const FieldLabel = ({ label }) => (
  <label className="mb-1 block text-sm font-medium text-[#4f6d69]">{label}</label>
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
  <div className="flex items-start justify-between gap-4 rounded-xl border border-[#d4e5df] bg-[#f8fcfb] px-4 py-3">
    <span className="text-sm font-medium text-[#5f7a77]">{label}</span>
    <span className="text-right text-sm font-semibold text-[#143f3a]">{value}</span>
  </div>
);

const ChatBookingModal = ({ booking, token, userId, onClose }) => {
  const providerName =
    booking?.provider?.basicInfo?.providerName || booking?.providerName || "Provider";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#041311]/50 p-0 backdrop-blur-sm transition-opacity duration-300 sm:p-4">
      <div className="flex h-[100dvh] w-full max-h-[95vh] flex-col overflow-hidden rounded-none border-t border-[#d4e5df] bg-white shadow-2xl transition-all duration-300 sm:max-h-[90vh] sm:w-11/12 sm:max-w-6xl sm:rounded-2xl">
        <div className="sticky top-0 flex shrink-0 items-center justify-between border-b border-[#dde8e4] bg-gradient-to-r from-[#f8fcfb] to-white px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-black text-[#0f766e] sm:text-xl">
              Chat with {providerName}
            </h2>
            {booking?.serviceName && (
              <p className="mt-1 truncate text-xs text-[#688380] sm:text-sm">{booking.serviceName}</p>
            )}
          </div>

          <button
            className="ml-4 rounded-full p-2 text-[#607a77] transition-all hover:bg-[#ecf5f2] hover:text-[#0f766e]"
            onClick={onClose}
            aria-label="Close chat"
            title="Close chat"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
          <div className="h-full min-h-0 flex flex-col overflow-hidden rounded-xl border border-[#d6e6e0] bg-white">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Chat bookingId={booking?._id} token={token} userId={userId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
