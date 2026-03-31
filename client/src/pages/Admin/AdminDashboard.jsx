import { useEffect, useMemo, useState } from "react";
import { FaUsers, FaClipboardList, FaSpinner, FaTrash } from "react-icons/fa";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

import { useAuth } from "../../context/AuthContext";
import { adminService } from "../../services/adminService";

const STATUS_OPTIONS = ["All", "pending", "accepted", "completed", "cancelled"];

export default function AdminDashboard() {
  const { user, token } = useAuth();

  const [users, setUsers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [bookingFilter, setBookingFilter] = useState("All");
  const [bookingSearch, setBookingSearch] = useState("");

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [rejectionNote, setRejectionNote] = useState("");

  const fetchDashboard = async () => {
    if (!token || user?.role !== "admin") return;

    setLoading(true);
    setError("");

    try {
      const requests = [
        adminService.getUsers(token),
        adminService.getProviders(token),
        adminService.getBookings(token),
      ];

      if (typeof adminService.getBookingAnalytics === "function") {
        requests.push(adminService.getBookingAnalytics(token));
      } else {
        requests.push(Promise.resolve([]));
      }

      if (typeof adminService.getSummary === "function") {
        requests.push(adminService.getSummary(token));
      } else {
        requests.push(Promise.resolve(null));
      }

      if (typeof adminService.getServices === "function") {
        requests.push(adminService.getServices(token));
      } else {
        requests.push(Promise.resolve([]));
      }

      const [usersData, providersData, bookingsData, analyticsData, summaryData, servicesData] =
        await Promise.all(requests);

      setUsers(usersData || []);
      setProviders(providersData || []);
      setBookings(bookingsData || []);
      setAnalytics(analyticsData || []);
      setSummary(summaryData?.summary || null);
      setServices(servicesData || []);
    } catch (err) {
      setError(err?.message || "Failed to load admin dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.role]);

  const filteredBookings = useMemo(() => {
    const search = bookingSearch.trim().toLowerCase();

    return (bookings || []).filter((b) => {
      const matchesStatus = bookingFilter === "All" || b.status === bookingFilter;
      const matchesSearch =
        (b.service?.name || "").toLowerCase().includes(search) ||
        (b.customer?.name || "").toLowerCase().includes(search) ||
        (b.provider?.name || "").toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [bookings, bookingFilter, bookingSearch]);

  const chartData = useMemo(() => {
    if (analytics?.length) return analytics;

    const map = {};
    (bookings || []).forEach((b) => {
      if (!b?.createdAt) return;
      const date = new Date(b.createdAt).toLocaleDateString();
      map[date] = (map[date] || 0) + 1;
    });

    return Object.entries(map).map(([date, count]) => ({ date, count }));
  }, [analytics, bookings]);

  const refreshAfterAction = async (successMessage) => {
    toast.success(successMessage);
    await fetchDashboard();
  };

  const handleProviderAction = async (id, action) => {
    if (!token) return;

    try {
      setActionLoading(true);

      if (action === "approve") {
        await adminService.approveProvider(id, token);
        await refreshAfterAction("Provider approved");
        return;
      }

      if (action === "reject") {
        setSelectedProvider(id);
        setRejectModalOpen(true);
      }
    } catch (err) {
      toast.error(err?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const submitRejection = async () => {
    if (!token || !selectedProvider) return;

    const note = rejectionNote.trim();
    if (!note) {
      toast.error("Rejection reason is required");
      return;
    }

    try {
      setActionLoading(true);
      await adminService.rejectProvider(selectedProvider, note, token);
      setRejectModalOpen(false);
      setSelectedProvider(null);
      setRejectionNote("");
      await refreshAfterAction("Provider rejected");
    } catch (err) {
      toast.error(err?.message || "Failed to reject provider");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBookingStatus = async (id, status) => {
    if (!token) return;

    try {
      setActionLoading(true);
      await adminService.updateBookingStatus(id, status, token);
      await refreshAfterAction("Booking updated");
    } catch (err) {
      toast.error(err?.message || "Failed to update booking");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBooking = async (id) => {
    if (!token) return;
    const confirmed = window.confirm("Delete this booking permanently?");
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await adminService.deleteBooking?.(id, token);
      await refreshAfterAction("Booking deleted");
    } catch (err) {
      toast.error(err?.message || "Failed to delete booking");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteService = async (id) => {
    if (!token) return;
    const confirmed = window.confirm("Delete this service permanently?");
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await adminService.deleteService?.(id, token);
      await refreshAfterAction("Service deleted");
    } catch (err) {
      toast.error(err?.message || "Failed to delete service");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex items-center gap-3 text-gray-700">
          <FaSpinner className="animate-spin" />
          Loading admin dashboard...
        </div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <h1 className="text-2xl font-bold mb-2">Access denied</h1>
            <p className="text-gray-600">Only admins can view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <ToastContainer position="top-right" autoClose={2500} />

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage users, providers, bookings, services, and analytics.</p>
        </div>
        <Button onClick={fetchDashboard} variant="outline" disabled={actionLoading}>
          Refresh
        </Button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-6 mb-10">
        <StatCard label="Users" value={summary?.totalUsers ?? users.length} icon={<FaUsers />} />
        <StatCard label="Providers" value={summary?.totalProviders ?? providers.length} icon={<FaUsers />} />
        <StatCard label="Bookings" value={summary?.totalBookings ?? bookings.length} icon={<FaClipboardList />} />
        <StatCard label="Services" value={summary?.totalServices ?? services.length} icon={<FaClipboardList />} />
        <StatCard label="Pending Providers" value={summary?.pendingProviders ?? "-"} icon={<FaUsers />} />
        <StatCard label="Pending Bookings" value={summary?.pendingBookings ?? "-"} icon={<FaClipboardList />} />
      </div>

      {/* Chart */}
      <Card className="mb-10">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Bookings Trend</h2>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Providers */}
      <Card className="mb-10">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Providers</h2>

          {providers.length === 0 && <p className="text-gray-500">No providers found</p>}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((p) => (
              <div key={p._id} className="border bg-white p-4 rounded-lg shadow-sm">
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-gray-500">{p.email}</p>

                <p className={`mt-2 font-semibold ${getStatusColor(p)}`}>
                  {p.isVerified ? "Verified" : p.verificationStatus}
                </p>

                {!p.isVerified && p.verificationStatus === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => handleProviderAction(p._id, "approve")}
                      disabled={actionLoading}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleProviderAction(p._id, "reject")}
                      disabled={actionLoading}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bookings */}
      <Card className="mb-10">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Bookings</h2>

          <div className="flex flex-col lg:flex-row gap-3 mb-4">
            <Input
              placeholder="Search by service, customer, or provider..."
              value={bookingSearch}
              onChange={(e) => setBookingSearch(e.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <Button
                  key={s}
                  variant={bookingFilter === s ? "default" : "outline"}
                  onClick={() => setBookingFilter(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Service</th>
                  <th className="px-4 py-2 text-left">Customer</th>
                  <th className="px-4 py-2 text-left">Provider</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={b._id} className="border-t">
                    <td className="px-4 py-2">{b.service?.name || "-"}</td>
                    <td className="px-4 py-2">{b.customer?.name || "-"}</td>
                    <td className="px-4 py-2">{b.provider?.name || "-"}</td>
                    <td className="px-4 py-2">
                      <select
                        value={b.status}
                        onChange={(e) => handleBookingStatus(b._id, e.target.value)}
                        className="border rounded px-2 py-1 bg-white"
                        disabled={actionLoading}
                      >
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteBooking(b._id)}
                        disabled={actionLoading}
                      >
                        <FaTrash className="mr-2" /> Delete
                      </Button>
                    </td>
                  </tr>
                ))}

                {filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center p-4 text-gray-500">
                      No bookings found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card className="mb-10">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Services</h2>

          {services.length === 0 && <p className="text-gray-500">No services found</p>}

          <div className="overflow-x-auto">
            <table className="min-w-full border bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Provider</th>
                  <th className="px-4 py-2 text-left">Price</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s._id} className="border-t">
                    <td className="px-4 py-2">{s.name || "-"}</td>
                    <td className="px-4 py-2">{s.provider?.name || "-"}</td>
                    <td className="px-4 py-2">{s.price ?? s.cost ?? "-"}</td>
                    <td className="px-4 py-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteService(s._id)}
                        disabled={actionLoading}
                      >
                        <FaTrash className="mr-2" /> Delete
                      </Button>
                    </td>
                  </tr>
                ))}

                {services.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center p-4 text-gray-500">
                      No services found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Provider</DialogTitle>
          </DialogHeader>

          <Textarea
            placeholder="Enter rejection reason"
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setRejectModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={submitRejection} disabled={actionLoading}>
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getStatusColor(p) {
  if (p.isVerified) return "text-green-600";
  if (p.verificationStatus === "pending") return "text-yellow-600";
  return "text-red-600";
}

function StatCard({ label, value, icon }) {
  return (
    <Card>
      <CardContent className="flex items-center p-6">
        <div className="mr-4 text-xl">{icon}</div>
        <div>
          <p className="text-gray-500">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
