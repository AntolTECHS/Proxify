
// src/pages/provider/ProviderDashboard.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  FaClipboardList,
  FaUsers,
  FaStar,
  FaClock,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaTimes,
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

export default function ProviderDashboard() {
  const { user, token } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [chartView, setChartView] = useState("jobs");
  const [modal, setModal] = useState(null);

  const [stats, setStats] = useState([
    { title: "Total Jobs", value: 0, icon: <FaClipboardList className="text-white w-6 h-6" /> },
    { title: "Customers Served", value: 0, icon: <FaUsers className="text-white w-6 h-6" /> },
    { title: "Rating", value: 0, icon: <FaStar className="text-white w-6 h-6" /> },
    { title: "Pending Jobs", value: 0, icon: <FaClock className="text-white w-6 h-6" /> },
    { title: "Earnings", value: "$0", icon: <FaMoneyBillWave className="text-white w-6 h-6" /> },
  ]);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      /* -----------------------------
         Fetch Provider Profile
      ----------------------------- */
      const providerRes = await fetch(
        "http://localhost:5000/api/providers/me",
        { headers }
      );

      const providerData = await providerRes.json();

      /* -----------------------------
         Fetch Bookings (Jobs)
      ----------------------------- */
      const jobsRes = await fetch(
        "http://localhost:5000/api/bookings/provider",
        { headers }
      );

      const jobsData = await jobsRes.json();
      const bookings = jobsData.bookings || [];

      setJobs(bookings);

      /* -----------------------------
         Compute Stats
      ----------------------------- */

      const totalJobs = bookings.length;

      const pendingJobs = bookings.filter(
        (j) => j.status === "pending"
      ).length;

      const completedJobs = bookings.filter(
        (j) => j.status === "completed"
      );

      const totalEarnings = completedJobs.reduce(
        (sum, j) => sum + (j.price || 0),
        0
      );

      const uniqueCustomers = new Set(
        bookings.map((j) => j.customer?._id)
      ).size;

      const rating = providerData?.provider?.rating || 0;

      setStats((prev) =>
        prev.map((s) => {
          if (s.title === "Total Jobs") return { ...s, value: totalJobs };
          if (s.title === "Pending Jobs") return { ...s, value: pendingJobs };
          if (s.title === "Customers Served")
            return { ...s, value: uniqueCustomers };
          if (s.title === "Rating")
            return { ...s, value: rating.toFixed(1) };
          if (s.title === "Earnings")
            return { ...s, value: `$${totalEarnings}` };
          return s;
        })
      );

      /* -----------------------------
         Build Monthly Chart
      ----------------------------- */

      const monthly = {};

      bookings.forEach((b) => {
        const date = new Date(b.createdAt);
        const month = date.toLocaleString("default", { month: "short" });

        if (!monthly[month]) {
          monthly[month] = { month, jobs: 0, earnings: 0 };
        }

        monthly[month].jobs += 1;

        if (b.status === "completed") {
          monthly[month].earnings += b.price || 0;
        }
      });

      setChartData(Object.values(monthly));
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-100 p-4 md:p-6">
      {/* Pending Verification */}
      {user?.providerStatus === "pending" && (
        <div className="mb-6 p-4 flex items-center bg-blue-100 border-l-4 border-blue-400 text-blue-700 rounded">
          <FaExclamationTriangle className="w-6 h-6 mr-3" />
          <span>
            Your provider profile is under review. Verification pending.
          </span>
        </div>
      )}

      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Welcome, {user?.name || "Provider"}!
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="flex items-center p-6 bg-white shadow-md rounded-lg border hover:shadow-xl transition"
          >
            <div className="p-4 bg-sky-500 rounded-full mr-4">
              {stat.icon}
            </div>
            <div>
              <p className="text-gray-500">{stat.title}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white p-6 shadow-md rounded-lg border mb-12">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Monthly {chartView === "jobs" ? "Jobs" : "Earnings"} Trend
          </h2>

          <div>
            <button
              onClick={() => setChartView("jobs")}
              className={`px-4 py-1 mr-2 rounded border ${
                chartView === "jobs"
                  ? "bg-sky-500 text-white"
                  : "bg-white"
              }`}
            >
              Jobs
            </button>

            <button
              onClick={() => setChartView("earnings")}
              className={`px-4 py-1 rounded border ${
                chartView === "earnings"
                  ? "bg-sky-500 text-white"
                  : "bg-white"
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
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey={chartView === "jobs" ? "jobs" : "earnings"}
              stroke="#0ea5e9"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          onClick={() => setModal("services")}
          className="p-6 bg-white shadow-md rounded-lg border hover:shadow-lg cursor-pointer"
        >
          <h3 className="text-lg font-semibold mb-2">Manage Services</h3>
          <p className="text-gray-600 text-sm">
            Update your services and pricing.
          </p>
        </div>

        <div
          onClick={() => setModal("jobs")}
          className="p-6 bg-white shadow-md rounded-lg border hover:shadow-lg cursor-pointer"
        >
          <h3 className="text-lg font-semibold mb-2">View Jobs</h3>
          <p className="text-gray-600 text-sm">
            View all assigned jobs.
          </p>
        </div>
      </div>

      {/* Jobs Modal */}
      {modal === "jobs" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white w-full max-w-4xl rounded-lg shadow-lg p-6 relative">
            <button
              onClick={() => setModal(null)}
              className="absolute top-4 right-4"
            >
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
                  {jobs.map((job) => (
                    <tr key={job._id} className="border-b">
                      <td className="py-2">{job.service?.name}</td>
                      <td className="py-2">{job.customer?.name}</td>
                      <td className="py-2">{job.status}</td>
                      <td className="py-2">${job.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

