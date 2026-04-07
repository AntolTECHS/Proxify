// src/pages/admin/AdminBookingsPage.jsx
import { useCallback, useEffect, useMemo, useState, memo } from "react";
import {
  FaSearch,
  FaSpinner,
  FaEye,
  FaComments,
  FaTrash,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../context/AuthContext";
import { adminService } from "../../services/adminService";

const STATUS_OPTIONS = ["All", "pending", "accepted", "completed", "cancelled"];
const BOOKING_STATUSES = ["pending", "accepted", "completed", "cancelled"];
const PAGE_SIZE = 8;

function safeText(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "-";
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(n)) return safeText(value);
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(n);
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    accepted: "bg-blue-100 text-blue-800 border-blue-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
        styles[status] || "bg-gray-100 text-gray-700 border-gray-200"
      }`}
    >
      {status || "unknown"}
    </span>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-gray-900 break-words">{value ?? "-"}</div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isRight = msg?.senderRole === "provider" || msg?.senderRole === "admin";

  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
          isRight
            ? "bg-gray-900 text-white"
            : "border border-gray-200 bg-gray-100 text-gray-900"
        }`}
      >
        <div className="mb-1 text-[11px] opacity-70">
          {msg?.senderName || msg?.sender || "Unknown"} •{" "}
          {msg?.createdAt ? formatDate(msg.createdAt) : "-"}
        </div>

        {msg?.type === "image" && msg?.imageUrl ? (
          <img
            src={msg.imageUrl}
            alt="attachment"
            className="mb-2 max-h-64 rounded-xl object-cover"
          />
        ) : null}

        <div className="whitespace-pre-wrap">
          {msg?.message || msg?.text || msg?.body || msg?.content || "-"}
        </div>
      </div>
    </div>
  );
}

const BookingRow = memo(function BookingRow({ booking, onView, onChat, onDelete, onStatusChange }) {
  return (
    <tr className="border-t hover:bg-gray-50">
      <td className="px-4 py-3 align-top">
        <div className="font-medium text-gray-900">{safeText(booking.serviceName || booking.service?.name)}</div>
        <div className="text-xs text-gray-500">{safeText(booking._id)}</div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="font-medium text-gray-900">{safeText(booking.customer?.name || booking.user?.name)}</div>
        <div className="text-xs text-gray-500">{safeText(booking.customer?.email || booking.user?.email)}</div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="font-medium text-gray-900">{safeText(booking.provider?.name)}</div>
        <div className="text-xs text-gray-500">{safeText(booking.provider?.email)}</div>
      </td>
      <td className="px-4 py-3 align-top">{formatDate(booking.bookingDate || booking.date || booking.scheduledAt || booking.createdAt)}</td>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <StatusBadge status={booking.status} />
          <select
            value={booking.status || "pending"}
            onChange={(e) => onStatusChange(booking._id, e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900"
          >
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onView(booking)}>
            <FaEye className="mr-2" />
            View
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onChat(booking)}>
            <FaComments className="mr-2" />
            Chat
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(booking._id)}>
            <FaTrash className="mr-2" />
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
});

function Tabs({ active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_OPTIONS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
            active === s
              ? "border-sky-200 bg-sky-50 text-sky-700"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function ModalShell({ title, subtitle, onClose, actions, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label={`Close ${title}`} />
      <div className={`relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl ${wide ? "max-w-6xl" : "max-w-4xl"}`}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminBookingsPage() {
  const { token, user } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [chatBooking, setChatBooking] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);

  const canAccess = token && user?.role === "admin";

  const load = useCallback(async ({ showLoader = false } = {}) => {
    if (!canAccess) return;

    if (showLoader) setLoading(true);
    setError("");

    try {
      const data = await adminService.getBookings(token);
      setBookings(Array.isArray(data) ? data : []);
    } catch (e) {
      setBookings([]);
      setError(e?.message || "Failed to load bookings");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [canAccess, token]);

  useEffect(() => {
    load({ showLoader: true });
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const list = bookings.filter((b) => {
      const okStatus = filter === "All" || String(b.status || "").toLowerCase() === filter;
      const okSearch =
        safeText(b.serviceName || b.service?.name).toLowerCase().includes(q) ||
        safeText(b.customer?.name || b.user?.name).toLowerCase().includes(q) ||
        safeText(b.provider?.name).toLowerCase().includes(q) ||
        safeText(b.customer?.email || b.user?.email).toLowerCase().includes(q) ||
        safeText(b.provider?.email).toLowerCase().includes(q) ||
        safeText(b._id).toLowerCase().includes(q) ||
        safeText(b.status).toLowerCase().includes(q);

      return okStatus && okSearch;
    });

    const withDate = (b) => new Date(b?.bookingDate || b?.date || b?.scheduledAt || b?.createdAt || 0).getTime();

    list.sort((a, b) => {
      if (sortBy === "oldest") return withDate(a) - withDate(b);
      if (sortBy === "service-asc") return String(a?.serviceName || a?.service?.name || "").localeCompare(String(b?.serviceName || b?.service?.name || ""));
      if (sortBy === "status-asc") return String(a?.status || "").localeCompare(String(b?.status || ""));
      return withDate(b) - withDate(a); // newest
    });

    return list;
  }, [bookings, filter, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const loadBookingDetails = useCallback(
    async (booking) => {
      if (!booking?._id) return booking;
      return (await adminService.getBookingById(booking._id, token).catch(() => booking)) || booking;
    },
    [token]
  );

  const loadConversation = useCallback(
    async (bookingId) => {
      const convo = (await adminService.getBookingConversation(bookingId, token).catch(() => [])) || [];
      return Array.isArray(convo) ? convo : [];
    },
    [token]
  );

  const updateStatus = useCallback(
    async (id, status) => {
      try {
        await adminService.updateBookingStatus(id, status, token);
        await load({ showLoader: false });

        if (selectedBooking?._id === id) {
          const refreshed = await adminService.getBookingById(id, token).catch(() => null);
          if (refreshed) setSelectedBooking(refreshed);
        }

        if (chatBooking?._id === id) {
          const refreshed = await adminService.getBookingById(id, token).catch(() => null);
          if (refreshed) setChatBooking(refreshed);
        }
      } catch (e) {
        setError(e?.message || "Failed to update booking status");
      }
    },
    [token, load, selectedBooking?._id, chatBooking?._id]
  );

  const deleteBooking = useCallback(
    async (id) => {
      const ok = window.confirm("Delete this booking permanently?");
      if (!ok) return;

      try {
        await adminService.deleteBooking(id, token);
        if (selectedBooking?._id === id) setSelectedBooking(null);
        if (chatBooking?._id === id) {
          setChatBooking(null);
          setChatMessages([]);
        }
        await load({ showLoader: false });
      } catch (e) {
        setError(e?.message || "Failed to delete booking");
      }
    },
    [token, load, selectedBooking?._id, chatBooking?._id]
  );

  const openDetails = useCallback(
    async (booking) => {
      setSelectedBooking(booking);
      setDetailsLoading(true);
      setError("");

      try {
        const details = await loadBookingDetails(booking);
        setSelectedBooking(details);
      } catch (e) {
        setError(e?.message || "Failed to load booking details");
      } finally {
        setDetailsLoading(false);
      }
    },
    [loadBookingDetails]
  );

  const openChat = useCallback(
    async (booking) => {
      setChatBooking(booking);
      setChatMessages([]);
      setChatLoading(true);
      setError("");

      try {
        const details = await loadBookingDetails(booking);
        const convo = await loadConversation(details._id || booking._id);
        setChatBooking(details);
        setChatMessages(convo);
      } catch (e) {
        setError(e?.message || "Failed to load chat");
      } finally {
        setChatLoading(false);
      }
    },
    [loadBookingDetails, loadConversation]
  );

  const closeDetails = useCallback(() => {
    setSelectedBooking(null);
    setDetailsLoading(false);
  }, []);

  const closeChat = useCallback(() => {
    setChatBooking(null);
    setChatMessages([]);
    setChatLoading(false);
  }, []);

  const bookingDate =
    selectedBooking?.bookingDate ||
    selectedBooking?.date ||
    selectedBooking?.scheduledAt ||
    selectedBooking?.createdAt ||
    null;

  const chatBookingDate =
    chatBooking?.bookingDate ||
    chatBooking?.date ||
    chatBooking?.scheduledAt ||
    chatBooking?.createdAt ||
    null;

  if (!canAccess) {
    return <div className="rounded-3xl bg-white p-6 shadow-sm">Access denied.</div>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm">
          <FaSpinner className="animate-spin text-gray-700" />
          <span className="text-gray-700">Loading bookings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
            <p className="mt-1 text-gray-600">
              Review bookings, full details, and conversations between customers and providers.
            </p>
          </div>
          <Button onClick={() => load({ showLoader: true })} variant="outline">
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xl">
              <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by service, customer, provider, email, status, or booking ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm outline-none focus:border-sky-500"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="service-asc">Service A-Z</option>
                <option value="status-asc">Status A-Z</option>
              </select>

              <Button variant="outline" onClick={() => load({ showLoader: true })}>
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-5">
            <Tabs active={filter} onChange={setFilter} />
          </div>

          <div className="mt-5 flex items-center justify-between text-sm text-gray-500">
            <p>
              Showing <strong className="text-gray-900">{filtered.length}</strong> booking(s)
            </p>
            <p>
              Page <strong className="text-gray-900">{currentPage}</strong> of{" "}
              <strong className="text-gray-900">{totalPages}</strong>
            </p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full overflow-hidden rounded-2xl border bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Service</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Provider</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((b) => (
                  <BookingRow
                    key={b._id}
                    booking={b}
                    onView={openDetails}
                    onChat={openChat}
                    onDelete={deleteBooking}
                    onStatusChange={updateStatus}
                  />
                ))}

                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      No bookings found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              {filtered.length === 0
                ? "No results"
                : `${Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}-${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <FaChevronLeft className="mr-2" />
                Prev
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <FaChevronRight className="ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedBooking && (
        <ModalShell
          title="Booking Details"
          subtitle="Full record and all linked details."
          onClose={closeDetails}
          wide
          actions={
            <>
              <Button variant="secondary" onClick={() => openChat(selectedBooking)}>
                View Chat
              </Button>
              <Button variant="outline" onClick={closeDetails}>
                Close
              </Button>
            </>
          }
        >
          <div className="flex-1 overflow-y-auto p-6">
            {detailsLoading ? (
              <div className="rounded-2xl border bg-gray-50 p-6 text-gray-600">Loading booking details...</div>
            ) : (
              <div className="space-y-6">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                          {safeText(selectedBooking.serviceName || selectedBooking.service?.name || "Booking")}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">Booking ID: {safeText(selectedBooking._id)}</p>
                      </div>
                      <StatusBadge status={selectedBooking.status} />
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <DetailRow label="Created At" value={formatDate(selectedBooking.createdAt)} />
                      <DetailRow label="Updated At" value={formatDate(selectedBooking.updatedAt)} />
                      <DetailRow label="Booking Date" value={formatDate(bookingDate)} />
                      <DetailRow label="Status" value={<StatusBadge status={selectedBooking.status} />} />
                      <DetailRow label="Amount" value={formatCurrency(selectedBooking.amount ?? selectedBooking.price)} />
                      <DetailRow label="Payment Status" value={safeText(selectedBooking.paymentStatus)} />
                      <DetailRow label="Payment Method" value={safeText(selectedBooking.paymentMethod)} />
                      <DetailRow label="Location" value={safeText(selectedBooking.location)} />
                      <DetailRow label="Address" value={safeText(selectedBooking.address)} />
                      <DetailRow label="Notes" value={safeText(selectedBooking.notes || selectedBooking.message)} />
                      <DetailRow label="Cancellation Reason" value={safeText(selectedBooking.cancelReason)} />
                      <DetailRow label="Completion Notes" value={safeText(selectedBooking.completionNotes)} />
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900">Customer</h3>
                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <DetailRow label="Name" value={safeText(selectedBooking.customer?.name || selectedBooking.user?.name)} />
                        <DetailRow label="Email" value={safeText(selectedBooking.customer?.email || selectedBooking.user?.email)} />
                        <DetailRow label="Phone" value={safeText(selectedBooking.customer?.phone || selectedBooking.user?.phone)} />
                        <DetailRow label="Role" value={safeText(selectedBooking.customer?.role || selectedBooking.user?.role || "customer")} />
                        <DetailRow label="Account ID" value={safeText(selectedBooking.customer?._id || selectedBooking.user?._id)} />
                        <DetailRow label="Location" value={safeText(selectedBooking.customer?.address || selectedBooking.customer?.location)} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900">Provider</h3>
                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <DetailRow label="Name" value={safeText(selectedBooking.provider?.name)} />
                        <DetailRow label="Email" value={safeText(selectedBooking.provider?.email)} />
                        <DetailRow label="Phone" value={safeText(selectedBooking.provider?.phone)} />
                        <DetailRow label="Role" value={safeText(selectedBooking.provider?.role || "provider")} />
                        <DetailRow label="Account ID" value={safeText(selectedBooking.provider?._id)} />
                        <DetailRow label="Location" value={safeText(selectedBooking.provider?.address || selectedBooking.provider?.location)} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900">Service details</h3>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <DetailRow label="Service Name" value={safeText(selectedBooking.serviceName || selectedBooking.service?.name)} />
                      <DetailRow label="Category" value={safeText(selectedBooking.service?.category || selectedBooking.category)} />
                      <DetailRow label="Description" value={safeText(selectedBooking.service?.description || selectedBooking.description)} />
                      <DetailRow label="Service ID" value={safeText(selectedBooking.service?._id || selectedBooking.serviceId)} />
                      <DetailRow label="Provider Service Name" value={safeText(selectedBooking.service?.title)} />
                      <DetailRow label="Extra Metadata" value={safeText(selectedBooking.service?.metadata || selectedBooking.metadata)} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900">All booking data</h3>
                    <pre className="mt-4 overflow-x-auto rounded-2xl bg-gray-950 p-4 text-xs text-gray-100">
                      {JSON.stringify(selectedBooking, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ModalShell>
      )}

      {chatBooking && (
        <ModalShell
          title="Chat"
          subtitle={`Booking ID: ${safeText(chatBooking._id)} • ${safeText(chatBooking.serviceName || chatBooking.service?.name)} • ${formatDate(chatBookingDate)}`}
          onClose={closeChat}
          actions={
            <>
              <Button variant="outline" onClick={closeChat}>
                Close
              </Button>
            </>
          }
        >
          <div className="border-b px-6 py-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <DetailRow label="Customer" value={safeText(chatBooking.customer?.name || chatBooking.user?.name)} />
              <DetailRow label="Provider" value={safeText(chatBooking.provider?.name)} />
              <DetailRow label="Status" value={<StatusBadge status={chatBooking.status} />} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {chatLoading ? (
              <div className="rounded-2xl border bg-gray-50 p-6 text-gray-600">Loading chat...</div>
            ) : chatMessages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
                No conversation found for this booking.
              </div>
            ) : (
              <div className="space-y-3">
                {chatMessages.map((msg, idx) => (
                  <MessageBubble key={msg._id || msg.id || idx} msg={msg} />
                ))}
              </div>
            )}
          </div>

          <div className="border-t bg-gray-50 px-6 py-4 text-sm text-gray-500">
            Chat is open for viewing only.
          </div>
        </ModalShell>
      )}
    </div>
  );
}
