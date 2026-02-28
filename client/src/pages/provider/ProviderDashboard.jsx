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
  const { user } = useAuth();

  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState([
    { title: "Total Jobs", value: 0, icon: <FaClipboardList className="text-white w-6 h-6" /> },
    { title: "Customers Served", value: 0, icon: <FaUsers className="text-white w-6 h-6" /> },
    { title: "Rating", value: 0, icon: <FaStar className="text-white w-6 h-6" /> },
    { title: "Pending Jobs", value: 0, icon: <FaClock className="text-white w-6 h-6" /> },
    { title: "Earnings", value: "$0", icon: <FaMoneyBillWave className="text-white w-6 h-6" /> },
  ]);
  const [chartView, setChartView] = useState("jobs");
  const [modal, setModal] = useState(null);

  const jobTrend = [
    { month: "Jan", jobs: 5, earnings: 500 },
    { month: "Feb", jobs: 8, earnings: 800 },
    { month: "Mar", jobs: 6, earnings: 600 },
    { month: "Apr", jobs: 10, earnings: 1000 },
    { month: "May", jobs: 7, earnings: 700 },
    { month: "Jun", jobs: 12, earnings: 1200 },
  ];

  const totalJobs = jobTrend.reduce((sum, month) => sum + month.jobs, 0);
  const totalEarnings = jobTrend.reduce((sum, month) => sum + month.earnings, 0);

  useEffect(() => {
    const fetchedJobs = [
      { id: 1, job: "Plumbing Fix", customer: "John Doe", date: "2026-02-10", status: "Pending" },
      { id: 2, job: "Home Cleaning", customer: "Jane Smith", date: "2026-02-09", status: "Completed" },
      { id: 3, job: "Furniture Relocation", customer: "Mike Lee", date: "2026-02-08", status: "In Progress" },
      { id: 4, job: "AC Repair", customer: "Alice Brown", date: "2026-02-07", status: "Pending" },
      { id: 5, job: "Window Cleaning", customer: "Bob Martin", date: "2026-02-06", status: "Completed" },
    ];
    setJobs(fetchedJobs);

    setStats((prev) =>
      prev.map((s) => {
        if (s.title === "Total Jobs") return { ...s, value: fetchedJobs.length };
        if (s.title === "Pending Jobs")
          return { ...s, value: fetchedJobs.filter((j) => j.status === "Pending").length };
        if (s.title === "Customers Served") return { ...s, value: 45 };
        if (s.title === "Rating") return { ...s, value: 4.8 };
        if (s.title === "Earnings") return { ...s, value: `$${totalEarnings}` };
        return s;
      })
    );
  }, [totalEarnings]);

  return (
    <div className="w-full min-h-screen bg-gray-100 p-4 md:p-6">
      {/* Pending Verification Banner */}
      {user?.providerStatus === "pending" && (
        <div className="mb-6 p-4 flex items-center bg-blue-100 border-l-4 border-blue-400 text-blue-700 rounded w-full">
          <FaExclamationTriangle className="w-6 h-6 mr-3" />
          <span>
            Your provider profile is under review. All features are available, but verification is pending.
          </span>
        </div>
      )}

      {/* Welcome */}
      <h1 className="text-3xl font-bold text-gray-800 mb-8 w-full">
        Welcome, {user?.name || "Provider"}!
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 w-full">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="flex items-center p-6 bg-white shadow-md rounded-lg border border-gray-200 hover:shadow-xl transition w-full"
          >
            <div className="p-4 bg-sky-500 rounded-full flex items-center justify-center mr-4">
              {stat.icon}
            </div>
            <div>
              <p className="text-gray-500">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white p-6 shadow-md rounded-lg border border-gray-200 mb-12 w-full">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-semibold text-gray-700">
            Monthly {chartView === "jobs" ? "Jobs" : "Earnings"} Trend
          </h2>
          <div className="space-x-2">
            <button
              onClick={() => setChartView("jobs")}
              className={`px-4 py-1 rounded-md border ${
                chartView === "jobs"
                  ? "bg-sky-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              } transition`}
            >
              Jobs
            </button>
            <button
              onClick={() => setChartView("earnings")}
              className={`px-4 py-1 rounded-md border ${
                chartView === "earnings"
                  ? "bg-sky-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              } transition`}
            >
              Earnings
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={jobTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey={chartView === "jobs" ? "jobs" : "earnings"}
              stroke="#0ea5e9" // light blue color
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          onClick={() => setModal("services")}
          className="p-6 bg-white shadow-md rounded-lg border border-gray-200 hover:shadow-lg transition cursor-pointer w-full"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Manage Services</h3>
          <p className="text-gray-600 text-sm">Update your offered services, pricing, and availability.</p>
        </div>
        <div
          onClick={() => setModal("jobs")}
          className="p-6 bg-white shadow-md rounded-lg border border-gray-200 hover:shadow-lg transition cursor-pointer w-full"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-2">View Jobs</h3>
          <p className="text-gray-600 text-sm">See all your assigned and completed jobs with details.</p>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-5xl rounded-lg shadow-lg overflow-hidden relative">
            <button
              onClick={() => setModal(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
            >
              <FaTimes className="w-5 h-5" />
            </button>
            <div className="p-6">
              {modal === "services" ? (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Manage Services</h2>
                  <p className="text-gray-600">Here you can update, add, or remove your services.</p>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-semibold mb-4">View Jobs</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Job</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Customer</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Date</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {jobs.map((job) => (
                          <tr key={job.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2">{job.job}</td>
                            <td className="px-4 py-2">{job.customer}</td>
                            <td className="px-4 py-2">{job.date}</td>
                            <td
                              className={`px-4 py-2 font-semibold ${
                                job.status === "Pending"
                                  ? "text-yellow-600"
                                  : job.status === "Completed"
                                  ? "text-sky-500"
                                  : "text-blue-600"
                              }`}
                            >
                              {job.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}