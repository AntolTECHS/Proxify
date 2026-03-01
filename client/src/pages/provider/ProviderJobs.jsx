// src/pages/provider/ProviderJobs.jsx
import { useState } from "react";
import { FaTimes } from "react-icons/fa";

export default function ProviderJobs() {
  const [modalJob, setModalJob] = useState(null);

  // Placeholder jobs
  const jobs = [
    { id: 1, title: "Plumbing Fix", customer: "John Doe", date: "2026-02-10", status: "Pending" },
    { id: 2, title: "Home Cleaning", customer: "Jane Smith", date: "2026-02-09", status: "Completed" },
    { id: 3, title: "Furniture Relocation", customer: "Mike Lee", date: "2026-02-08", status: "In Progress" },
  ];

  return (
    <div className="w-full min-h-screen bg-gray-100 p-4 md:p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Jobs</h1>

      <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Job</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Customer</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Date</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{job.title}</td>
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
                <td className="px-4 py-2">
                  <button
                    onClick={() => setModalJob(job)}
                    className="px-3 py-1 bg-sky-500 text-white rounded-md
                               hover:bg-sky-600 transition text-sm"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-lg overflow-hidden relative">
            <button
              onClick={() => setModalJob(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
            >
              <FaTimes className="w-5 h-5" />
            </button>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">{modalJob.title}</h2>
              <p><strong>Customer:</strong> {modalJob.customer}</p>
              <p><strong>Date:</strong> {modalJob.date}</p>
              <p>
                <strong>Status:</strong>{" "}
                <span className="text-sky-500 font-semibold">
                  {modalJob.status}
                </span>
              </p>
              <p className="mt-2 text-gray-600">
                Details about this job can go here.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}