// src/pages/provider/ProviderDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  FaClipboardList,
  FaUsers,
  FaStar,
  FaClock,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaTimes,
  FaRedoAlt,
  FaCheckCircle,
  FaEye,
} from "react-icons/fa";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import "../../styles/providerDashboard.css";

const RAW_API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:5000";

/**
 * Supports both:
 * - http://localhost:5000
 * - http://localhost:5000/api
 * without creating /api/api
 */
const API_ORIGIN = RAW_API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");
const apiUrl = (path) =>
  `${API_ORIGIN}/api${path.startsWith("/") ? path : `/${path}`}`;

const formatKES = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

function formatMonthLabel(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString("default", { month: "short" });
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getDisputeCategoryLabel(category) {
  const map = {
    no_show: "No show",
    poor_quality: "Poor quality",
    scope_mismatch: "Scope mismatch",
    payment_issue: "Payment issue",
    damage: "Damage",
    other: "Other",
  };
  return map[normalize(category)] || category || "Unspecified";
}

function getDisputeStatusLabel(status) {
  const s = normalize(status);
  if (s === "responded") return "Responded";
  if (s === "in_review") return "In review";
  if (s === "under_review") return "Under review";
  if (s === "resolved") return "Resolved";
  if (s === "closed") return "Closed";
  if (s === "rejected") return "Rejected";
  return "Open";
}

function getDisputeText(dispute) {
  return (
    dispute?.description ||
    dispute?.issue ||
    dispute?.message ||
    dispute?.reason ||
    "No description provided"
  );
}

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#0f766e"];

export default function ProviderDashboard() {
  const { user, token } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [chartView, setChartView] = useState("jobs");
  const [modal, setModal] = useState(null);
  const [providerStatus, setProviderStatus] = useState("pending");
  const [providerBanner, setProviderBanner] = useState("Pending admin approval");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [resubmitNote, setResubmitNote] = useState("");

  const baseStats = useMemo(
    () => [
      { title: "Total Jobs", value: 0, icon: <FaClipboardList className="text-white w-6 h-6" /> },
      { title: "Customers Served", value: 0, icon: <FaUsers className="text-white w-6 h-6" /> },
      { title: "Rating", value: 0, icon: <FaStar className="text-white w-6 h-6" /> },
      { title: "Pending Jobs", value: 0, icon: <FaClock className="text-white w-6 h-6" /> },
      {
        title: "Earnings",
        value: "KSh 0",
        icon: <FaMoneyBillWave className="text-white w-6 h-6" />,
      },
      {
        title: "Disputes",
        value: 0,
        icon: <FaExclamationTriangle className="text-white w-6 h-6" />,
      },
    ],
    []
  );

  const [computedStats, setComputedStats] = useState(baseStats);
  const statStyles = useMemo(
    () => [
      {
        bg: "bg-blue-50",
        borderAccent: "border-blue-100",
        icon: "bg-blue-600",
        text: "text-blue-700",
        title: "text-slate-600",
      },
      {
        bg: "bg-emerald-50",
        borderAccent: "border-emerald-100",
        icon: "bg-emerald-600",
        text: "text-emerald-700",
        title: "text-slate-600",
      },
      {
        bg: "bg-amber-50",
        borderAccent: "border-amber-100",
        icon: "bg-amber-600",
        text: "text-amber-700",
        title: "text-slate-600",
      },
      {
        bg: "bg-yellow-50",
        borderAccent: "border-yellow-100",
        icon: "bg-yellow-600",
        text: "text-yellow-700",
        title: "text-slate-600",
      },
      {
        bg: "bg-purple-50",
        borderAccent: "border-purple-100",
        icon: "bg-purple-600",
        text: "text-purple-700",
        title: "text-slate-600",
      },
      {
        bg: "bg-red-50",
        borderAccent: "border-red-100",
        icon: "bg-red-600",
        text: "text-red-700",
        title: "text-slate-600",
      },
    ],
    []
  );
  const chartStroke = chartView === "earnings" ? "#0f766e" : "#2563eb";

  const pieData = useMemo(() => {
    const totalJobs = jobs.length;
    const pendingJobs = jobs.filter((j) => normalize(j.status) === "pending").length;
    const completedJobs = jobs.filter((j) => normalize(j.status) === "completed").length;
    const totalDisputes = disputes.length;

    return [
      { name: "Jobs", value: totalJobs },
      { name: "Pending", value: pendingJobs },
      { name: "Completed", value: completedJobs },
      { name: "Disputes", value: totalDisputes },
    ].filter((item) => item.value > 0);
  }, [jobs, disputes]);

  const fetchDashboard = async () => {
    if (!token) return;

    setLoading(true);
    setDashboardError("");

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [providerRes, jobsRes, disputesRes] = await Promise.all([
        fetch(apiUrl("/providers/me"), { headers }),
        fetch(apiUrl("/bookings/provider"), { headers }),
        fetch(apiUrl("/disputes/my"), { headers }),
      ]);

      if (!providerRes.ok) {
        const data = await providerRes.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to load provider profile");
      }

      if (!jobsRes.ok) {
        const data = await jobsRes.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to load bookings");
      }

      if (!disputesRes.ok) {
        const data = await disputesRes.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to load disputes");
      }

      const providerData = await providerRes.json();
      const jobsData = await jobsRes.json();
      const disputesData = await disputesRes.json();

      const status = providerData?.status || "pending";
      const banner =
        status === "approved"
          ? providerData?.approvalBanner || "Approved"
          : status === "rejected"
          ? providerData?.approvalBanner || "Rejected"
          : providerData?.approvalBanner || "Pending admin approval";

      setProviderStatus(status);
      setProviderBanner(banner);
      setRejectionReason(providerData?.rejectionReason || "");
      setJobs(Array.isArray(jobsData?.bookings) ? jobsData.bookings : []);
      setDisputes(Array.isArray(disputesData) ? disputesData : []);

      const bookings = Array.isArray(jobsData?.bookings) ? jobsData.bookings : [];
      const totalJobs = bookings.length;
      const pendingJobs = bookings.filter((j) => normalize(j.status) === "pending").length;
      const completedJobs = bookings.filter((j) => normalize(j.status) === "completed");
      const totalEarnings = completedJobs.reduce((sum, j) => sum + (Number(j.price) || 0), 0);
      const uniqueCustomers = new Set(
        bookings.map((j) => j?.customer?._id).filter(Boolean)
      ).size;
      const rating = Number(providerData?.rating || 0);
      const activeDisputes = (Array.isArray(disputesData) ? disputesData : []).filter((d) => {
        const s = normalize(d?.status);
        return ["open", "responded", "in_review", "under_review"].includes(s);
      }).length;

      setComputedStats(
        baseStats.map((s) => {
          if (s.title === "Total Jobs") return { ...s, value: totalJobs };
          if (s.title === "Pending Jobs") return { ...s, value: pendingJobs };
          if (s.title === "Customers Served") return { ...s, value: uniqueCustomers };
          if (s.title === "Rating") return { ...s, value: rating.toFixed(1) };
          if (s.title === "Earnings") return { ...s, value: formatKES(totalEarnings) };
          if (s.title === "Disputes") return { ...s, value: activeDisputes };
          return s;
        })
      );

      const monthlyMap = {};
      bookings.forEach((b) => {
        const month = formatMonthLabel(b.createdAt);
        if (!monthlyMap[month]) {
          monthlyMap[month] = { month, jobs: 0, earnings: 0 };
        }

        monthlyMap[month].jobs += 1;

        if (normalize(b.status) === "completed") {
          monthlyMap[month].earnings += Number(b.price) || 0;
        }
      });

      setChartData(Object.values(monthlyMap));
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setDashboardError(err?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleResubmit = async () => {
    if (!token) return;

    try {
      setActionLoading(true);

      const res = await fetch(apiUrl("/providers/resubmit"), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          note: resubmitNote.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to resubmit provider profile");
      }

      setResubmitNote("");
      setModal(null);
      await fetchDashboard();
    } catch (err) {
      console.error("Resubmit error:", err);
      setDashboardError(err?.message || "Failed to resubmit");
    } finally {
      setActionLoading(false);
    }
  };

  const statusStyles =
    providerStatus === "approved"
      ? "bg-green-100 border-green-400 text-green-700"
      : providerStatus === "rejected"
      ? "bg-red-100 border-red-400 text-red-700"
      : "bg-blue-100 border-blue-400 text-blue-700";

  const canManageServices = providerStatus === "approved";

  const unresolvedDisputes = disputes.filter((d) => {
    const s = normalize(d?.status);
    return ["open", "responded", "in_review", "under_review"].includes(s);
  });

  if (loading) {
    return (
      <div className="provider-dashboard-page min-h-screen w-full px-4 py-6 md:px-6">
        <div className="provider-panel rounded-2xl p-6">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="provider-dashboard-page min-h-screen w-full px-4 py-6 md:px-6">
      <div className="provider-dashboard-shell">
        <div className={`provider-status-card mb-6 flex items-start gap-3 ${statusStyles}`}>
        <FaExclamationTriangle className="w-6 h-6 mr-3 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold">Provider Status: {providerBanner}</p>

          {providerStatus === "pending" && (
            <p className="text-sm mt-1">
              Your provider profile is under review. Please wait for admin approval.
            </p>
          )}

          {providerStatus === "rejected" && (
            <div className="text-sm mt-1 space-y-2">
              <p>Your provider profile was rejected. Please fix the issue(s) and resubmit.</p>

              {rejectionReason ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
                  <strong>Reason:</strong> {rejectionReason}
                </div>
              ) : null}

              <button
                onClick={() => setModal("resubmit")}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
              >
                <FaRedoAlt />
                Resubmit for Approval
              </button>
            </div>
          )}

          {providerStatus === "approved" && (
            <p className="text-sm mt-1">Your provider profile is active and approved.</p>
          )}
        </div>
      </div>

      {dashboardError && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {dashboardError}
        </div>
      )}

        <div className="provider-hero mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
              Provider Dashboard
            </p>
            <h1 className="mt-2 text-4xl font-black text-slate-900 sm:text-5xl">
              Welcome, {user?.name || "Provider"}!
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-600">
              Track your jobs, earnings, and disputes—all in one place.
            </p>
          </div>
          <div className="provider-hero-chip">
            <span className="provider-hero-dot" />
            <span className="text-sm font-semibold text-slate-700">Status: {providerBanner}</span>
          </div>
        </div>

        <div className="provider-section">
          <div className="provider-section-head">
            <h2 className="text-2xl font-bold text-slate-900">Performance snapshot</h2>
            <p className="text-sm text-slate-500">Your operational stats at a glance.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {computedStats.map((stat, idx) => {
              const style = statStyles[idx % statStyles.length];
              return (
                <div
                  key={idx}
                  className={`provider-stat-card ${style.bg} border ${style.borderAccent} rounded-lg p-3 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300`}
                >
                  <div className={`provider-stat-icon ${style.icon} w-10 h-10 rounded-lg flex items-center justify-center mb-2 shadow-md`}>
                    {stat.icon}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold uppercase tracking-wide ${style.title}`}>
                      {stat.title}
                    </p>
                    <p className={`mt-1 text-lg font-black ${style.text}`}>{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="provider-panel provider-chart-panel rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="provider-section-head mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Analytics Mix</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Jobs, disputes, and workload distribution.
                </p>
              </div>
            </div>

            <div className="provider-chart-shell rounded-xl">
              {pieData.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                  No data available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value, name) =>
                        name === "Earnings" ? [formatKES(value), name] : [value, name]
                      }
                    />
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`provider-pie-${entry.name}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="provider-panel provider-chart-panel lg:col-span-2 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="provider-section-head mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Monthly {chartView === "jobs" ? "Jobs" : "Earnings"} Trend
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Monitor your workload and revenue evolution.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setChartView("jobs")}
                  className={`provider-chip ${
                    chartView === "jobs" ? "provider-chip-active" : ""}
                  `}
                >
                  Jobs
                </button>

                <button
                  onClick={() => setChartView("earnings")}
                  className={`provider-chip ${
                    chartView === "earnings" ? "provider-chip-active" : ""}
                  `}
                >
                  Earnings
                </button>
              </div>
            </div>

            <div className="provider-chart-shell rounded-xl">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="providerChartLine" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={chartStroke} stopOpacity={0.2} />
                      <stop offset="50%" stopColor={chartStroke} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={chartStroke} stopOpacity={0.35} />
                    </linearGradient>
                    <linearGradient id="providerChartFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartStroke} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={chartStroke} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 6" stroke="#dbe7e1" />
                  <XAxis dataKey="month" tick={{ fill: "#4f6b68", fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: "#4f6b68", fontSize: 12 }}
                    tickFormatter={(value) =>
                      chartView === "earnings" ? formatKES(value) : value
                    }
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const value = payload[0].value;
                      return (
                        <div className="provider-chart-tooltip">
                          <p className="provider-chart-tooltip-label">{label}</p>
                          <p className="provider-chart-tooltip-value">
                            {chartView === "earnings" ? formatKES(value) : value}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={chartView === "jobs" ? "jobs" : "earnings"}
                    stroke="url(#providerChartLine)"
                    strokeWidth={3}
                    fill="url(#providerChartFill)"
                    dot={{ stroke: chartStroke, strokeWidth: 2, r: 4, fill: "#ffffff" }}
                    activeDot={{ r: 6, stroke: chartStroke, strokeWidth: 2, fill: "#ffffff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="provider-section mt-8">
          <div className="provider-section-head">
            <h2 className="text-2xl font-bold text-slate-900">Quick actions</h2>
            <p className="text-sm text-slate-500">Jump into your most-used workflows.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div
              onClick={() => {
                if (canManageServices) setModal("services");
                else setDashboardError("You can only manage services after approval.");
              }}
              className={`provider-action-card ${
                canManageServices ? "provider-action-active" : "provider-action-disabled"
              }`}
            >
              <div className="provider-action-kicker">SERVICES</div>
              <h3 className="text-lg font-bold text-slate-900">Manage Services</h3>
              <p className="mt-1 text-sm text-slate-600">Update your services and pricing.</p>
              {!canManageServices && (
                <p className="mt-2 text-xs font-medium text-red-600">
                  Available only after admin approval.
                </p>
              )}
            </div>

            <div
              onClick={() => setModal("jobs")}
              className="provider-action-card provider-action-active"
            >
              <div className="provider-action-kicker">JOBS</div>
              <h3 className="text-lg font-bold text-slate-900">View Jobs</h3>
              <p className="mt-1 text-sm text-slate-600">View all assigned jobs.</p>
            </div>

            <div
              onClick={() => setModal("disputes")}
              className="provider-action-card provider-action-active"
            >
              <div className="provider-action-kicker">DISPUTES</div>
              <h3 className="text-lg font-bold text-slate-900">View Disputes</h3>
              <p className="mt-1 text-sm text-slate-600">Review unresolved disputes and follow up.</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                <FaExclamationTriangle />
                {unresolvedDisputes.length} open dispute(s)
              </div>
            </div>
          </div>
        </div>
      </div>

      {modal === "jobs" && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setModal(null)} className="absolute top-4 right-4">
              <FaTimes />
            </button>

            <h2 className="text-xl font-semibold mb-4">Your Jobs</h2>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Service</th>
                    <th className="text-left py-2">Customer</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Price</th>
                  </tr>
                </thead>

                <tbody>
                  {jobs.length === 0 ? (
                    <tr>
                      <td className="py-4 text-sm text-gray-500" colSpan={4}>
                        No jobs found.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job._id} className="border-b">
                        <td className="py-2">{job.service?.name || "-"}</td>
                        <td className="py-2">{job.customer?.name || "-"}</td>
                        <td className="py-2">{job.status || "-"}</td>
                        <td className="py-2">{formatKES(job.price)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {modal === "disputes" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setModal(null)} className="absolute top-4 right-4">
              <FaTimes />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-rose-100 p-3 text-rose-600">
                <FaExclamationTriangle />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Your Disputes</h2>
                <p className="text-sm text-gray-500">Open and in-review disputes need attention.</p>
              </div>
            </div>

            <div className="space-y-3">
              {disputes.length === 0 ? (
                <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-500">
                  No disputes found.
                </div>
              ) : (
                disputes.map((item) => {
                  const isActive = ["open", "responded", "in_review", "under_review"].includes(
                    normalize(item?.status)
                  );

                  return (
                    <div key={item._id} className="rounded-2xl border bg-gray-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                              Dispute
                            </span>
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                              {getDisputeStatusLabel(item?.status)}
                            </span>
                          </div>

                          <p className="mt-2 font-semibold text-gray-900">
                            {getDisputeCategoryLabel(item?.category)}
                          </p>
                          <p className="mt-1 text-sm text-gray-600">{getDisputeText(item)}</p>
                          <p className="mt-2 text-xs text-gray-500">
                            {item?.openedByName || item?.openedBy?.name || "Customer"} vs {" "}
                            {item?.againstName || item?.against?.name || "Provider"}
                          </p>
                        </div>

                        <div className="shrink-0 text-sm text-gray-500 sm:text-right">
                          <p>{item?.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {isActive ? "Requires review" : "Closed"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {modal === "resubmit" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative">
            <button onClick={() => setModal(null)} className="absolute top-4 right-4">
              <FaTimes />
            </button>

            <div className="flex items-center gap-3">
              <div className="rounded-full bg-sky-100 p-3 text-sky-600">
                <FaCheckCircle />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Resubmit for Approval</h2>
                <p className="text-sm text-gray-500">
                  Tell the admin what you fixed before submitting again.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes for admin
              </label>
              <textarea
                value={resubmitNote}
                onChange={(e) => setResubmitNote(e.target.value)}
                rows={5}
                className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-sky-500"
                placeholder="Example: I uploaded the missing ID document and updated my business details."
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => setModal(null)}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={actionLoading}
              >
                Cancel
              </button>

              <button
                onClick={handleResubmit}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
              >
                <FaRedoAlt />
                {actionLoading ? "Resubmitting..." : "Submit Again"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "services" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative">
            <button onClick={() => setModal(null)} className="absolute top-4 right-4">
              <FaTimes />
            </button>

            <h2 className="text-xl font-semibold text-gray-900">Manage Services</h2>
            <p className="mt-2 text-sm text-gray-600">
              This section is available for approved providers. You can connect your services form here.
            </p>

            {!canManageServices && (
              <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                You need approval before managing services.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
