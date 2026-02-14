import { useState } from "react";
import { useSelector } from "react-redux";
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
  const { user } = useSelector((state) => state.auth);

  // Example stats
  const stats = [
    { title: "Total Jobs", value: 12, icon: <FaClipboardList className="text-white w-6 h-6" /> },
    { title: "Customers Served", value: 45, icon: <FaUsers className="text-white w-6 h-6" /> },
    { title: "Rating", value: 4.8, icon: <FaStar className="text-white w-6 h-6" /> },
    { title: "Pending Jobs", value: 3, icon: <FaClock className="text-white w-6 h-6" /> },
    { title: "Earnings", value: "$1,250", icon: <FaMoneyBillWave className="text-white w-6 h-6" /> },
  ];

  const jobTrend = [
    { month: "Jan", jobs: 5, earnings: 500 },
    { month: "Feb", jobs: 8, earnings: 800 },
    { month: "Mar", jobs: 6, earnings: 600 },
    { month: "Apr", jobs: 10, earnings: 1000 },
    { month: "May", jobs: 7, earnings: 700 },
    { month: "Jun", jobs: 12, earnings: 1200 },
  ];

  const allJobs = [
    { id: 1, job: "Plumbing Fix", customer: "John Doe", date: "2026-02-10", status: "Pending" },
    { id: 2, job: "Home Cleaning", customer: "Jane Smith", date: "2026-02-09", status: "Completed" },
    { id: 3, job: "Furniture Relocation", customer: "Mike Lee", date: "2026-02-08", status: "In Progress" },
    { id: 4, job: "AC Repair", customer: "Alice Brown", date: "2026-02-07", status: "Pending" },
    { id: 5, job: "Window Cleaning", customer: "Bob Martin", date: "2026-02-06", status: "Completed" },
  ];

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [chartView, setChartView] = useState("jobs"); // jobs or earnings
  const [modal, setModal] = useState(null); // null | "services" | "jobs"
  const jobsPerPage = 3;

  const filteredJobs = allJobs.filter(
    (job) =>
      (statusFilter === "All" || job.status === statusFilter) &&
      (job.job.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.status.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const totalJobs = jobTrend.reduce((sum, month) => sum + month.jobs, 0);
  const totalEarnings = jobTrend.reduce((sum, month) => sum + month.earnings, 0);

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      {/* Pending Verification */}
      {user?.providerStatus !== "approved" && (
        <div className="mb-6 p-4 flex items-center bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
          <FaExclamationTriangle className="w-6 h-6 mr-3" />
          <span>
            Your provider profile is under review. Please wait for document approval to get verified.
          </span>
        </div>
      )}

      <h1 className="text-3xl font-bold text-gray-800 mb-8">
        Welcome, {user?.name || "Provider"}!
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="flex items-center p-6 bg-white shadow-md rounded-lg border border-gray-200 hover:shadow-xl transition"
          >
            <div className="p-4 bg-teal-600 rounded-full flex items-center justify-center mr-4">
              {stat.icon}
            </div>
            <div>
              <p className="text-gray-500">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Summary */}
      <div className="mb-4 flex justify-end gap-4">
        <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
          <p className="text-gray-500 text-sm">Total {chartView === "jobs" ? "Jobs" : "Earnings"}</p>
          <p className="text-xl font-bold text-gray-800">
            {chartView === "jobs" ? totalJobs : `$${totalEarnings}`}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-12 p-6 bg-white shadow-md rounded-lg border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700">
            Monthly {chartView === "jobs" ? "Jobs" : "Earnings"} Trend
          </h2>
          <div className="space-x-2">
            <button
              onClick={() => setChartView("jobs")}
              className={`px-4 py-1 rounded-md border ${
                chartView === "jobs"
                  ? "bg-teal-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              } transition`}
            >
              Jobs
            </button>
            <button
              onClick={() => setChartView("earnings")}
              className={`px-4 py-1 rounded-md border ${
                chartView === "earnings"
                  ? "bg-teal-600 text-white"
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
              stroke={chartView === "jobs" ? "#14B8A6" : "#F59E0B"}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div
          onClick={() => setModal("services")}
          className="p-6 bg-white shadow-md rounded-lg border border-gray-200 hover:shadow-lg transition cursor-pointer"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Manage Services</h3>
          <p className="text-gray-600 text-sm">
            Update your offered services, pricing, and availability.
          </p>
        </div>
        <div
          onClick={() => setModal("jobs")}
          className="p-6 bg-white shadow-md rounded-lg border border-gray-200 hover:shadow-lg transition cursor-pointer"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-2">View Jobs</h3>
          <p className="text-gray-600 text-sm">
            See all your assigned and completed jobs with details.
          </p>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white w-11/12 md:w-3/4 lg:w-1/2 rounded-lg shadow-lg overflow-hidden relative">
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
                  <p className="text-gray-600">
                    Here you can update, add, or remove your services.
                  </p>
                  {/* Add your services management UI here */}
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
                        {allJobs.map((job) => (
                          <tr key={job.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2">{job.job}</td>
                            <td className="px-4 py-2">{job.customer}</td>
                            <td className="px-4 py-2">{job.date}</td>
                            <td
                              className={`px-4 py-2 font-semibold ${
                                job.status === "Pending"
                                  ? "text-yellow-600"
                                  : job.status === "Completed"
                                  ? "text-green-600"
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
