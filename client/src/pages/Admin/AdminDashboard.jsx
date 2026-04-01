import { useEffect, useMemo, useState } from "react";
import { FaUsers, FaClipboardList, FaSpinner } from "react-icons/fa";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import { adminService } from "../../services/adminService";

function StatCard({ label, value, icon }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-2xl bg-gray-900 p-3 text-white shadow-sm">{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { user, token } = useAuth();

  const [users, setUsers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    if (!token || user?.role !== "admin") return;

    setLoading(true);
    setError("");

    try {
      const requests = [
        adminService.getUsers(token),
        adminService.getProviders(token),
        adminService.getBookings(token),
        typeof adminService.getBookingAnalytics === "function"
          ? adminService.getBookingAnalytics(token)
          : Promise.resolve([]),
        typeof adminService.getSummary === "function"
          ? adminService.getSummary(token)
          : Promise.resolve(null),
        typeof adminService.getServices === "function"
          ? adminService.getServices(token)
          : Promise.resolve([]),
      ];

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

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm">
          <FaSpinner className="animate-spin text-gray-700" />
          <span className="text-gray-700">Loading admin dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Manage users, providers, bookings, services, and analytics.
          </p>
        </div>

        <Button onClick={fetchDashboard} variant="outline">
          Refresh data
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Users" value={summary?.totalUsers ?? users.length} icon={<FaUsers />} />
        <StatCard label="Providers" value={summary?.totalProviders ?? providers.length} icon={<FaUsers />} />
        <StatCard label="Bookings" value={summary?.totalBookings ?? bookings.length} icon={<FaClipboardList />} />
        <StatCard label="Services" value={summary?.totalServices ?? services.length} icon={<FaClipboardList />} />
        <StatCard label="Pending Providers" value={summary?.pendingProviders ?? "-"} icon={<FaUsers />} />
        <StatCard label="Pending Bookings" value={summary?.pendingBookings ?? "-"} icon={<FaClipboardList />} />
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Bookings Trend</h2>
              <p className="text-sm text-gray-500">Daily bookings overview</p>
            </div>
          </div>

          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" dot={false} strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}