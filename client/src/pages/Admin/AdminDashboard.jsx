import { useEffect, useMemo, useState, useCallback, memo } from "react";
import {
  FaUsers,
  FaUserTie,
  FaClipboardList,
  FaSpinner,
  FaRedoAlt,
  FaBell,
  FaExclamationTriangle,
  FaUserFriends,
} from "react-icons/fa";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import { adminService } from "../../services/adminService";

const StatCard = memo(function StatCard({ label, value, icon }) {
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
});

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function formatChartDate(value, isMobile = false) {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(isMobile ? {} : { year: "numeric" }),
  });
}

function toDateKey(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function buildDailyMap(items = [], dateField = "createdAt") {
  const map = Object.create(null);

  for (const item of items) {
    const key = toDateKey(item?.[dateField]);
    if (!key) continue;
    map[key] = (map[key] || 0) + 1;
  }

  return map;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateKeyFromUTCDate(date) {
  return date.toISOString().slice(0, 10);
}

function getIdleCallback(fn) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    return window.requestIdleCallback(fn);
  }
  return window.setTimeout(fn, 0);
}

function cancelIdleCallbackSafe(id) {
  if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

export default function AdminDashboardPage() {
  const { user, token } = useAuth();

  const [users, setUsers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [error, setError] = useState("");

  const [attentionItems, setAttentionItems] = useState([]);
  const [showAttentionModal, setShowAttentionModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedRange, setSelectedRange] = useState(30);

  const attentionStorageKey = "admin-dashboard-attention-seen";

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth < 640);
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  const customers = useMemo(() => {
    return (users || []).filter((u) => u?.role === "customer");
  }, [users]);

  const resubmissionCount = useMemo(() => {
    return (providers || []).reduce(
      (sum, p) => sum + (Array.isArray(p?.resubmissions) ? p.resubmissions.length : 0),
      0
    );
  }, [providers]);

  const pendingReviewProviders = useMemo(() => {
    return (providers || []).filter((p) => {
      const hasResubmissions = Array.isArray(p?.resubmissions) && p.resubmissions.length > 0;
      return p?.status === "pending" && !hasResubmissions;
    }).length;
  }, [providers]);

  const buildAttentionQueue = useCallback((providersList = []) => {
    const queue = [];

    for (const provider of providersList) {
      const providerName =
        provider?.basicInfo?.providerName || provider?.name || "Unnamed provider";
      const providerEmail = provider?.basicInfo?.email || provider?.email || "-";
      const hasResubmissions =
        Array.isArray(provider?.resubmissions) && provider.resubmissions.length > 0;

      if (provider?.status === "pending" && !hasResubmissions) {
        queue.push({
          id: `${provider._id}-pending`,
          type: "new_provider",
          title: providerName,
          subtitle: providerEmail,
          detail: "New provider awaiting review",
          date: provider?.createdAt,
        });
      }

      if (hasResubmissions) {
        const latest = provider.resubmissions[provider.resubmissions.length - 1];
        queue.push({
          id: `${provider._id}-resubmission-${latest?.date || provider.updatedAt || provider.createdAt}`,
          type: "resubmission",
          title: providerName,
          subtitle: providerEmail,
          detail: latest?.note || "Provider resubmitted profile updates",
          previousReason: latest?.previousRejectionReason || "",
          date: latest?.date || provider.updatedAt || provider.createdAt,
        });
      }
    }

    return queue;
  }, []);

  const fetchSummaryInBackground = useCallback(async () => {
    if (!token || user?.role !== "admin") return;
    if (typeof adminService.getSummary !== "function") return;

    setSummaryLoading(true);
    try {
      const summaryData = await adminService.getSummary(token);
      setSummary(summaryData || null);
    } catch {
      // optional; ignore quietly so dashboard stays fast
    } finally {
      setSummaryLoading(false);
    }
  }, [token, user?.role]);

  const fetchDashboard = useCallback(async () => {
    if (!token || user?.role !== "admin") return;

    setLoading(true);
    setError("");
    setChartReady(false);

    try {
      const [usersData, providersData, bookingsData] = await Promise.all([
        adminService.getUsers(token),
        adminService.getProviders(token),
        adminService.getBookings(token),
      ]);

      setUsers(usersData || []);
      setProviders(providersData || []);
      setBookings(bookingsData || []);

      const queue = buildAttentionQueue(providersData || []);
      setAttentionItems(queue);

      const alreadySeen = sessionStorage.getItem(attentionStorageKey) === "1";
      setShowAttentionModal(queue.length > 0 && !alreadySeen);

      getIdleCallback(() => setChartReady(true));
      fetchSummaryInBackground();
    } catch (err) {
      setError(err?.message || "Failed to load admin dashboard");
    } finally {
      setLoading(false);
    }
  }, [token, user?.role, buildAttentionQueue, fetchSummaryInBackground]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const dismissAttentionModal = () => {
    setShowAttentionModal(false);
    sessionStorage.setItem(attentionStorageKey, "1");
  };

  const chartData = useMemo(() => {
    if (bookings.length === 0 && providers.length === 0 && customers.length === 0) {
      return [];
    }

    const bookingsMap = buildDailyMap(bookings, "createdAt");
    const providersMap = buildDailyMap(providers, "createdAt");
    const customersMap = buildDailyMap(customers, "createdAt");

    const allDates = Array.from(
      new Set([
        ...Object.keys(bookingsMap),
        ...Object.keys(providersMap),
        ...Object.keys(customersMap),
      ])
    ).sort();

    if (allDates.length === 0) return [];

    const start = new Date(`${allDates[0]}T00:00:00Z`);
    const end = new Date(`${allDates[allDates.length - 1]}T00:00:00Z`);

    const fullRange = [];
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const key = dateKeyFromUTCDate(d);
      fullRange.push({
        date: key,
        bookings: bookingsMap[key] || 0,
        providers: providersMap[key] || 0,
        customers: customersMap[key] || 0,
      });
    }

    if (selectedRange === 0) return fullRange;
    return fullRange.slice(-selectedRange);
  }, [bookings, providers, customers, selectedRange]);

  useEffect(() => {
    return () => {
      setChartReady(false);
    };
  }, []);

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
            Manage users, providers, bookings, and analytics.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={fetchDashboard} variant="outline">
            Refresh data
          </Button>
          <Button
            onClick={() => {
              setShowAttentionModal(true);
              sessionStorage.removeItem(attentionStorageKey);
            }}
            variant="outline"
          >
            <FaBell className="mr-2" />
            Review Queue
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Users"
          value={summary?.totalUsers ?? users.length}
          icon={<FaUsers />}
        />
        <StatCard
          label="Customers"
          value={summary?.totalCustomers ?? customers.length}
          icon={<FaUserFriends />}
        />
        <StatCard
          label="Providers"
          value={summary?.totalProviders ?? providers.length}
          icon={<FaUserTie />}
        />
        <StatCard
          label="Bookings"
          value={summary?.totalBookings ?? bookings.length}
          icon={<FaClipboardList />}
        />
        <StatCard
          label="Pending Providers"
          value={summary?.pendingProviders ?? pendingReviewProviders}
          icon={<FaExclamationTriangle />}
        />
        <StatCard label="Resubmissions" value={resubmissionCount} icon={<FaRedoAlt />} />
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Platform Trend</h2>
              <p className="text-sm text-gray-500">
                Daily bookings, providers, and customers
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedRange === 7 ? "default" : "outline"}
                onClick={() => setSelectedRange(7)}
              >
                7 Days
              </Button>
              <Button
                variant={selectedRange === 30 ? "default" : "outline"}
                onClick={() => setSelectedRange(30)}
              >
                30 Days
              </Button>
              <Button
                variant={selectedRange === 90 ? "default" : "outline"}
                onClick={() => setSelectedRange(90)}
              >
                90 Days
              </Button>
              <Button
                variant={selectedRange === 0 ? "default" : "outline"}
                onClick={() => setSelectedRange(0)}
              >
                All Time
              </Button>
            </div>
          </div>

          <div className={isMobile ? "h-[280px]" : "h-[360px]"}>
            {!chartReady ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                Preparing chart...
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                No chart data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: isMobile ? 8 : 24,
                    left: isMobile ? 0 : 8,
                    bottom: isMobile ? 38 : 28,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => formatChartDate(value, isMobile)}
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                    interval={0}
                    minTickGap={isMobile ? 20 : 8}
                    height={isMobile ? 64 : 56}
                    tickMargin={12}
                    angle={-35}
                    textAnchor="end"
                    padding={{ left: 12, right: 12 }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <Tooltip
                    labelFormatter={(value) => formatChartDate(value, false)}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 12 }} />
                  <Area
                    type="monotone"
                    dataKey="bookings"
                    stroke="#2563eb"
                    fill="#2563eb"
                    fillOpacity={0.18}
                    strokeWidth={2.5}
                    name="Bookings"
                  />
                  <Area
                    type="monotone"
                    dataKey="providers"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.18}
                    strokeWidth={2.5}
                    name="Providers"
                  />
                  <Area
                    type="monotone"
                    dataKey="customers"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.18}
                    strokeWidth={2.5}
                    name="Customers"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {showAttentionModal && attentionItems.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
          onClick={dismissAttentionModal}
        >
          <div
            className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <FaBell className="text-sky-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Review Queue</h2>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  New providers and resubmissions need your attention.
                </p>
              </div>

              <button
                onClick={dismissAttentionModal}
                className="rounded-full px-3 py-1 text-2xl leading-none text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700">
                <strong>{attentionItems.length}</strong> account(s) require review.
              </div>

              <div className="space-y-3">
                {attentionItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border bg-gray-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              item.type === "resubmission"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {item.type === "resubmission" ? "Resubmission" : "New Provider"}
                          </span>
                          <p className="font-semibold text-gray-900">{item.title}</p>
                        </div>
                        <p className="text-sm text-gray-600">{item.subtitle}</p>
                        <p className="mt-1 text-sm text-gray-700">{item.detail}</p>

                        {item.previousReason ? (
                          <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            <strong>Previous rejection:</strong> {item.previousReason}
                          </div>
                        ) : null}
                      </div>

                      <div className="text-sm text-gray-500 sm:text-right">
                        <p>{formatDateTime(item.date)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <Button variant="outline" onClick={dismissAttentionModal}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {summaryLoading ? null : null}
    </div>
  );
}