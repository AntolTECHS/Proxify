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
  FaEye,
  FaDownload,
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

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:5000";

function resolveFileUrl(filePath) {
  if (!filePath) return "";
  if (/^https?:\/\//i.test(filePath)) return filePath;
  if (filePath.startsWith("//")) return `https:${filePath}`;
  return `${API_BASE_URL.replace(/\/$/, "")}${filePath.startsWith("/") ? "" : "/"}${filePath}`;
}

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

function toLocalDateKey(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDailyMap(items = [], dateField = "createdAt") {
  const map = Object.create(null);

  for (const item of items) {
    const key = toLocalDateKey(item?.[dateField]);
    if (!key) continue;
    map[key] = (map[key] || 0) + 1;
  }

  return map;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getIdleCallback(fn) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    return window.requestIdleCallback(fn);
  }
  return window.setTimeout(fn, 0);
}

function cancelIdleCallbackSafe(id) {
  if (id == null) return;
  if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

function formatKshPrice(value) {
  if (value === null || value === undefined || value === "") return "KSh -";

  const numericValue =
    typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));

  if (Number.isNaN(numericValue)) return `KSh ${value}`;
  return `KSh ${new Intl.NumberFormat("en-KE").format(numericValue)}`;
}

function getInitials(name) {
  return (
    String(name || "P")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "P"
  );
}

function getStatusMeta(status, approvalBanner, rejectionReason) {
  if (status === "approved") {
    return {
      label: approvalBanner || "Approved",
      badgeClass: "bg-green-100 text-green-700 border-green-200",
      bannerClass: "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (status === "rejected") {
    return {
      label: approvalBanner || "Rejected",
      badgeClass: "bg-red-100 text-red-700 border-red-200",
      bannerClass: "bg-red-50 text-red-700 border-red-200",
      rejectionReason: rejectionReason || "",
    };
  }

  return {
    label: approvalBanner || "Pending admin approval",
    badgeClass: "bg-yellow-100 text-yellow-700 border-yellow-200",
    bannerClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
  };
}

function EmptyState({ title, description }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-gray-500">
      <div>
        <p className="font-medium text-gray-700">{title}</p>
        <p className="mt-1 text-sm">{description}</p>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="text-lg font-semibold text-gray-900">{children}</h3>;
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-2xl border bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-gray-900">{value || "-"}</p>
    </div>
  );
}

const DocumentCard = memo(function DocumentCard({ doc, onPreview, onOpen }) {
  const url = resolveFileUrl(doc?.path);

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium text-gray-900">{doc?.name || "Unnamed document"}</p>
          <p className="text-sm text-gray-500">
            {doc?.type || "Unknown type"} ·{" "}
            {doc?.size ? `${Math.round((doc.size / 1024) * 10) / 10} KB` : "Unknown size"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => onPreview(url, doc)} disabled={!url}>
            <FaEye className="mr-2" />
            Preview
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpen(url)} disabled={!url}>
            <FaDownload className="mr-2" />
            Open
          </Button>
        </div>
      </div>
    </div>
  );
});

const ProviderCard = memo(function ProviderCard({ provider, onOpen }) {
  const providerName = provider?.basicInfo?.providerName || provider?.name || "Unnamed provider";
  const providerEmail = provider?.basicInfo?.email || provider?.email || "-";
  const providerPhoto = resolveFileUrl(
    provider?.basicInfo?.photoURL || provider?.photoURL || provider?.avatar || ""
  );
  const statusMeta = getStatusMeta(provider?.status, provider?.approvalBanner, provider?.rejectionReason);

  return (
    <div
      onClick={() => onOpen(provider)}
      className="cursor-pointer rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-medium ${statusMeta.bannerClass}`}>
        {statusMeta.label}
        {provider?.status === "rejected" && provider?.rejectionReason ? (
          <span className="mt-1 block text-xs font-normal text-red-600">
            Reason: {provider.rejectionReason}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border bg-gray-100">
            {providerPhoto ? (
              <img src={providerPhoto} alt={providerName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-gray-500">
                {getInitials(providerName)}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-gray-900">{providerName}</h3>
            <p className="truncate text-sm text-gray-500">{providerEmail}</p>
            {provider?.basicInfo?.businessName ? (
              <p className="mt-1 truncate text-sm text-gray-500">
                Business: {provider.basicInfo.businessName}
              </p>
            ) : null}
            {provider?.category ? <p className="mt-1 text-sm text-gray-500">Category: {provider.category}</p> : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}
              >
                {statusMeta.label}
              </span>
              {provider?.isVerified ? (
                <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  Verified
                </span>
              ) : null}
              {(provider?.resubmissions?.length || 0) > 0 ? (
                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  {provider.resubmissions.length} resubmission(s)
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpen(provider)}>
            <FaEye className="mr-2" />
            View
          </Button>
        </div>
      </div>
    </div>
  );
});

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

  const [selectedProvider, setSelectedProvider] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("services");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);

  const attentionStorageKey = "admin-dashboard-attention-seen";
  const canAccess = token && user?.role === "admin";

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
      const providerName = provider?.basicInfo?.providerName || provider?.name || "Unnamed provider";
      const providerEmail = provider?.basicInfo?.email || provider?.email || "-";
      const hasResubmissions = Array.isArray(provider?.resubmissions) && provider.resubmissions.length > 0;

      if (provider?.status === "pending" && !hasResubmissions) {
        queue.push({
          id: `${provider._id}-pending`,
          providerId: provider._id,
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
          providerId: provider._id,
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
      // Dashboard can still work without summary data.
    } finally {
      setSummaryLoading(false);
    }
  }, [token, user?.role]);

  const syncDashboardData = useCallback(
    async ({ showLoader = false } = {}) => {
      if (!token || user?.role !== "admin") return;

      if (showLoader) setLoading(true);
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
        if (showLoader) setLoading(false);
      }
    },
    [token, user?.role, buildAttentionQueue, fetchSummaryInBackground]
  );

  useEffect(() => {
    syncDashboardData({ showLoader: true });
  }, [syncDashboardData]);

  useEffect(() => {
    let idleId;

    if (bookings.length || providers.length || customers.length) {
      idleId = getIdleCallback(() => setChartReady(true));
    }

    return () => cancelIdleCallbackSafe(idleId);
  }, [bookings.length, providers.length, customers.length]);

  useEffect(() => {
    return () => {
      setChartReady(false);
    };
  }, []);

  const dismissAttentionModal = useCallback(() => {
    setShowAttentionModal(false);
    try {
      sessionStorage.setItem(attentionStorageKey, "1");
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const openProviderDetails = useCallback(
    async (providerLike, tab = "services") => {
      const providerId = providerLike?.providerId || providerLike?._id;
      if (!providerId) return;

      setDetailLoading(true);
      setActiveTab(tab);
      setSelectedProvider(providerLike?._id ? providerLike : null);
      setError("");

      try {
        const fullProvider = await adminService.getProviderById(providerId, token);
        setSelectedProvider(fullProvider?.provider || fullProvider || providerLike || null);
      } catch (err) {
        setError(err?.message || "Failed to load provider details");
      } finally {
        setDetailLoading(false);
      }
    },
    [token]
  );

  const closeProviderDetails = useCallback(() => {
    setSelectedProvider(null);
    setActiveTab("services");
    setDetailLoading(false);
  }, []);

  const handleOpenDocument = useCallback((url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handlePreviewDocument = useCallback((url, doc) => {
    if (!url) return;
    setPreviewUrl(url);
    setPreviewDoc(doc || null);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewUrl("");
    setPreviewDoc(null);
  }, []);

  const previewMeta = useMemo(() => {
    const isImage =
      previewDoc?.type?.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(previewUrl);
    const isPdf = previewDoc?.type?.includes("pdf") || /\.pdf$/i.test(previewUrl);
    return { isImage, isPdf };
  }, [previewDoc, previewUrl]);

  const downloadPreview = useCallback(() => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = previewDoc?.name || "document";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [previewUrl, previewDoc]);

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

    const start = new Date(`${allDates[0]}T00:00:00`);
    const end = new Date(`${allDates[allDates.length - 1]}T00:00:00`);

    const fullRange = [];
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const key = `${year}-${month}-${day}`;

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

  const visibleAttentionItems = useMemo(() => attentionItems || [], [attentionItems]);

  const providerForActions = selectedProvider;

  if (!canAccess) {
    return <div className="rounded-3xl bg-white p-6 shadow-sm">Access denied.</div>;
  }

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
          <p className="mt-1 text-gray-600">Manage users, providers, bookings, and analytics.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => syncDashboardData({ showLoader: true })} variant="outline">
            Refresh data
          </Button>
          <Button
            onClick={() => {
              setShowAttentionModal(true);
              try {
                sessionStorage.removeItem(attentionStorageKey);
              } catch {
                // Ignore storage errors.
              }
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
        <StatCard label="Users" value={summary?.totalUsers ?? users.length} icon={<FaUsers />} />
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
              <p className="text-sm text-gray-500">Daily bookings, providers, and customers</p>
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
              <EmptyState title="Preparing chart..." description="Loading analytics data." />
            ) : chartData.length === 0 ? (
              <EmptyState
                title="No chart data available"
                description="There is not enough activity yet to build the trend chart."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: isMobile ? 8 : 24,
                    left: isMobile ? 0 : 8,
                    bottom: isMobile ? 36 : 28,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => formatChartDate(value, isMobile)}
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                    interval="preserveStartEnd"
                    minTickGap={isMobile ? 28 : 16}
                    height={isMobile ? 62 : 56}
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

      {showAttentionModal && visibleAttentionItems.length > 0 && (
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
                aria-label="Close review queue"
              >
                ×
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700">
                <strong>{visibleAttentionItems.length}</strong> account(s) require review.
              </div>

              <div className="space-y-3">
                {visibleAttentionItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border bg-gray-50 p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
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

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => openProviderDetails(item, item.type === "resubmission" ? "history" : "services")}
                        >
                          <FaEye className="mr-2" />
                          View
                        </Button>
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

      {providerForActions && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-6"
          onClick={closeProviderDetails}
        >
          <div
            className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div className="flex min-w-0 items-start gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-2xl border bg-gray-100">
                  {providerForActions.basicInfo?.photoURL ? (
                    <img
                      src={resolveFileUrl(providerForActions.basicInfo.photoURL)}
                      alt={providerForActions.basicInfo.providerName || "Provider"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-gray-500">
                      {getInitials(providerForActions.basicInfo?.providerName || providerForActions.name)}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-bold text-gray-900">
                    {providerForActions.basicInfo?.providerName || providerForActions.name || "Unnamed provider"}
                  </h2>
                  <p className="truncate text-sm text-gray-500">
                    {providerForActions.basicInfo?.email || providerForActions.email || "-"}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                        providerForActions.status === "approved"
                          ? "border-green-200 bg-green-50 text-green-700"
                          : providerForActions.status === "rejected"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-yellow-200 bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {providerForActions.approvalBanner ||
                        (providerForActions.status === "approved"
                          ? "Approved"
                          : providerForActions.status === "rejected"
                          ? "Rejected"
                          : "Pending admin approval")}
                    </span>

                    {providerForActions.isVerified ? (
                      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        Verified
                      </span>
                    ) : null}

                    {(providerForActions.resubmissions?.length || 0) > 0 ? (
                      <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                        {providerForActions.resubmissions.length} resubmission(s)
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <button
                onClick={closeProviderDetails}
                className="rounded-full px-3 py-1 text-2xl leading-none text-gray-500 hover:bg-gray-100"
                aria-label="Close provider details"
              >
                ×
              </button>
            </div>

            {providerForActions.status === "rejected" && providerForActions.rejectionReason ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <strong>Rejection reason:</strong> {providerForActions.rejectionReason}
              </div>
            ) : null}

            {detailLoading ? (
              <div className="mt-6 rounded-2xl border bg-gray-50 p-6 text-sm text-gray-600">
                Loading provider details...
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="flex flex-wrap gap-2 border-b pb-4">
                  <TabButton active={activeTab === "services"} onClick={() => setActiveTab("services")}>
                    Services
                  </TabButton>
                  <TabButton active={activeTab === "documents"} onClick={() => setActiveTab("documents")}>
                    Documents
                  </TabButton>
                  <TabButton active={activeTab === "availability"} onClick={() => setActiveTab("availability")}>
                    Availability
                  </TabButton>
                  <TabButton active={activeTab === "metadata"} onClick={() => setActiveTab("metadata")}>
                    Metadata
                  </TabButton>
                  <TabButton active={activeTab === "history"} onClick={() => setActiveTab("history")}>
                    Resubmissions
                  </TabButton>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <DetailRow label="Provider Name" value={providerForActions.basicInfo?.providerName} />
                  <DetailRow label="Email" value={providerForActions.basicInfo?.email} />
                  <DetailRow label="Phone" value={providerForActions.basicInfo?.phone} />
                  <DetailRow label="Business Name" value={providerForActions.basicInfo?.businessName} />
                  <DetailRow label="Category" value={providerForActions.category} />
                  <DetailRow
                    label="Experience"
                    value={providerForActions.experience != null ? `${providerForActions.experience} years` : "-"}
                  />
                  <DetailRow
                    label="Rating"
                    value={providerForActions.rating != null ? (providerForActions.rating.toFixed?.(1) ?? providerForActions.rating) : "-"}
                  />
                  <DetailRow
                    label="Reviews"
                    value={providerForActions.reviewCount != null ? providerForActions.reviewCount : "-"}
                  />
                  <DetailRow label="Availability Status" value={providerForActions.availabilityStatus} />
                  <DetailRow label="Status" value={providerForActions.approvalBanner || providerForActions.status} />
                  <DetailRow label="Location Text" value={providerForActions.basicInfo?.location} />
                  <DetailRow
                    label="GPS Coordinates"
                    value={
                      Array.isArray(providerForActions.location?.coordinates)
                        ? `${providerForActions.location.coordinates[1] ?? "-"}, ${providerForActions.location.coordinates[0] ?? "-"}`
                        : "-"
                    }
                  />
                </div>

                {activeTab === "services" && (
                  <div className="rounded-2xl border bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <SectionTitle>Services</SectionTitle>
                      <span className="text-sm text-gray-500">{providerForActions.services?.length || 0} service(s)</span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {(providerForActions.services?.length || 0) === 0 ? (
                        <p className="text-sm text-gray-500">No services found</p>
                      ) : (
                        providerForActions.services.map((s, idx) => (
                          <div key={s._id || s.id || idx} className="rounded-2xl border bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium text-gray-900">{s.name || s.title || "Unnamed service"}</p>
                                <p className="text-sm text-gray-500">{s.description || "No description"}</p>
                              </div>
                              <div className="text-sm font-semibold text-gray-900">
                                {formatKshPrice(s.price ?? s.cost)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "documents" && (
                  <div className="rounded-2xl border bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <SectionTitle>Documents</SectionTitle>
                      <span className="text-sm text-gray-500">{providerForActions.documents?.length || 0} document(s)</span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {(providerForActions.documents?.length || 0) === 0 ? (
                        <p className="text-sm text-gray-500">No documents found</p>
                      ) : (
                        providerForActions.documents.map((doc, idx) => (
                          <DocumentCard
                            key={doc._id || doc.id || idx}
                            doc={doc}
                            onOpen={handleOpenDocument}
                            onPreview={handlePreviewDocument}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "availability" && (
                  <div className="rounded-2xl border bg-gray-50 p-4">
                    <SectionTitle>Availability</SectionTitle>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <DetailRow
                        label="Days"
                        value={
                          Array.isArray(providerForActions.availability?.days) &&
                          providerForActions.availability.days.length > 0
                            ? providerForActions.availability.days.join(", ")
                            : "Not set"
                        }
                      />
                      <DetailRow label="Start" value={providerForActions.availability?.start || "Not set"} />
                      <DetailRow label="End" value={providerForActions.availability?.end || "Not set"} />
                    </div>
                  </div>
                )}

                {activeTab === "metadata" && (
                  <div className="rounded-2xl border bg-gray-50 p-4">
                    <SectionTitle>Account / Metadata</SectionTitle>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <DetailRow label="Role" value={providerForActions.user?.role || "-"} />
                      <DetailRow label="User Name" value={providerForActions.user?.name || "-"} />
                      <DetailRow label="User Email" value={providerForActions.user?.email || "-"} />
                      <DetailRow label="Created" value={formatDateTime(providerForActions.createdAt)} />
                    </div>
                  </div>
                )}

                {activeTab === "history" && (
                  <div className="rounded-2xl border bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <SectionTitle>Resubmissions</SectionTitle>
                      <span className="text-sm text-gray-500">{providerForActions.resubmissions?.length || 0} item(s)</span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {(providerForActions.resubmissions?.length || 0) === 0 ? (
                        <p className="text-sm text-gray-500">No resubmission history yet.</p>
                      ) : (
                        providerForActions.resubmissions.map((item, idx) => (
                          <div key={item?._id || idx} className="rounded-2xl border bg-white p-4 shadow-sm">
                            <p className="text-sm font-semibold text-gray-900">
                              Resubmission #{providerForActions.resubmissions.length - idx}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              <strong>Date:</strong> {formatDateTime(item?.date)}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              <strong>Note:</strong> {item?.note || "-"}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              <strong>Previous rejection reason:</strong> {item?.previousRejectionReason || "-"}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {providerForActions.bio ? (
                  <div className="rounded-2xl border bg-gray-50 p-4">
                    <SectionTitle>Bio</SectionTitle>
                    <p className="mt-2 text-sm text-gray-700">{providerForActions.bio}</p>
                  </div>
                ) : null}

                <div className="flex justify-end border-t pt-4">
                  <Button onClick={closeProviderDetails} variant="outline">
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4 py-6"
          onClick={closePreview}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-gray-900">
                  {previewDoc?.name || "Document Preview"}
                </p>
                <p className="truncate text-sm text-gray-500">{previewDoc?.type || "Unknown type"}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={downloadPreview}>
                  <FaDownload className="mr-2" />
                  Download
                </Button>
                <button
                  onClick={closePreview}
                  className="rounded-full px-3 py-1 text-2xl leading-none text-gray-500 hover:bg-gray-100"
                  aria-label="Close preview"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="max-h-[85vh] overflow-y-auto bg-gray-100 p-4">
              {previewMeta.isImage ? (
                <img
                  src={previewUrl}
                  alt={previewDoc?.name || "Document preview"}
                  className="mx-auto max-h-[80vh] w-auto rounded-2xl shadow"
                />
              ) : previewMeta.isPdf ? (
                <iframe
                  src={previewUrl}
                  title={previewDoc?.name || "Document preview"}
                  className="h-[80vh] w-full rounded-2xl bg-white"
                />
              ) : (
                <div className="rounded-2xl bg-white p-6 text-sm text-gray-600">
                  This file type cannot be previewed inline. Use Open or Download to view it.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {summaryLoading ? null : null}
    </div>
  );
}
