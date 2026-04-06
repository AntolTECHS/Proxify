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
} from "react-icons/fa";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

export default function ProviderDashboard() {
  const { user, token } = useAuth();

  const [jobs, setJobs] = useState([]);
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
    ],
    []
  );

  const [computedStats, setComputedStats] = useState(baseStats);

  const fetchDashboard = async () => {
    if (!token) return;

    setLoading(true);
    setDashboardError("");

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [providerRes, jobsRes] = await Promise.all([
        fetch(apiUrl("/providers/me"), { headers }),
        fetch(apiUrl("/bookings/provider"), { headers }),
      ]);

      if (!providerRes.ok) {
        const data = await providerRes.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to load provider profile");
      }

      if (!jobsRes.ok) {
        const data = await jobsRes.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to load bookings");
      }

      const providerData = await providerRes.json();
      const jobsData = await jobsRes.json();

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

      const bookings = Array.isArray(jobsData?.bookings) ? jobsData.bookings : [];
      const totalJobs = bookings.length;
      const pendingJobs = bookings.filter((j) => j.status === "pending").length;
      const completedJobs = bookings.filter((j) => j.status === "completed");
      const totalEarnings = completedJobs.reduce(
        (sum, j) => sum + (Number(j.price) || 0),
        0
      );
      const uniqueCustomers = new Set(
        bookings.map((j) => j?.customer?._id).filter(Boolean)
      ).size;
      const rating = Number(providerData?.rating || 0);

      setComputedStats(
        baseStats.map((s) => {
          if (s.title === "Total Jobs") return { ...s, value: totalJobs };
          if (s.title === "Pending Jobs") return { ...s, value: pendingJobs };
          if (s.title === "Customers Served") return { ...s, value: uniqueCustomers };
          if (s.title === "Rating") return { ...s, value: rating.toFixed(1) };
          if (s.title === "Earnings") return { ...s, value: formatKES(totalEarnings) };
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

        if (b.status === "completed") {
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

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-100 p-4 md:p-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-100 p-4 md:p-6">
      <div className={`mb-6 p-4 flex items-start border-l-4 rounded ${statusStyles}`}>
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
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {dashboardError}
        </div>
      )}

      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Welcome, {user?.name || "Provider"}!
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {computedStats.map((stat, idx) => (
          <div
            key={idx}
            className="flex items-center p-6 bg-white shadow-md rounded-lg border hover:shadow-xl transition"
          >
            <div className="p-4 bg-sky-500 rounded-full mr-4">{stat.icon}</div>
            <div>
              <p className="text-gray-500">{stat.title}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 shadow-md rounded-lg border mb-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Monthly {chartView === "jobs" ? "Jobs" : "Earnings"} Trend
          </h2>

          <div>
            <button
              onClick={() => setChartView("jobs")}
              className={`px-4 py-1 mr-2 rounded border ${
                chartView === "jobs" ? "bg-sky-500 text-white" : "bg-white"
              }`}
            >
              Jobs
            </button>

            <button
              onClick={() => setChartView("earnings")}
              className={`px-4 py-1 rounded border ${
                chartView === "earnings" ? "bg-sky-500 text-white" : "bg-white"
              }`}
            >
              Earnings
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis
              tickFormatter={(value) => (chartView === "earnings" ? formatKES(value) : value)}
            />
            <Tooltip
              formatter={(value) => (chartView === "earnings" ? formatKES(value) : value)}
            />
            <Line
              type="monotone"
              dataKey={chartView === "jobs" ? "jobs" : "earnings"}
              stroke="#0ea5e9"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          onClick={() => {
            if (canManageServices) setModal("services");
            else setDashboardError("You can only manage services after approval.");
          }}
          className={`p-6 bg-white shadow-md rounded-lg border transition ${
            canManageServices ? "hover:shadow-lg cursor-pointer" : "opacity-70 cursor-not-allowed"
          }`}
        >
          <h3 className="text-lg font-semibold mb-2">Manage Services</h3>
          <p className="text-gray-600 text-sm">Update your services and pricing.</p>
          {!canManageServices && (
            <p className="mt-2 text-sm text-red-600">Available only after admin approval.</p>
          )}
        </div>

        <div
          onClick={() => setModal("jobs")}
          className="p-6 bg-white shadow-md rounded-lg border hover:shadow-lg cursor-pointer"
        >
          <h3 className="text-lg font-semibold mb-2">View Jobs</h3>
          <p className="text-gray-600 text-sm">View all assigned jobs.</p>
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
              This section is available for approved providers. You can connect your services form
              here.
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