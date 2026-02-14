// src/pages/Admin/PendingProviders.jsx
import { useEffect, useState } from "react";
import axios from "axios";

export default function PendingProviders() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProviders = async () => {
    try {
      const { data } = await axios.get("/api/admin/providers/pending", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setProviders(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (id, approve = true) => {
    try {
      await axios.put(
        `/api/admin/providers/${id}/${approve ? "approve" : "reject"}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      fetchProviders(); // refresh list
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (!providers.length) return <p>No pending providers.</p>;

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-6">Pending Provider Approvals</h2>
      <table className="w-full table-auto border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 border">Name</th>
            <th className="p-3 border">Email</th>
            <th className="p-3 border">Phone</th>
            <th className="p-3 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {providers.map((p) => (
            <tr key={p._id} className="text-center">
              <td className="p-3 border">{p.name}</td>
              <td className="p-3 border">{p.email}</td>
              <td className="p-3 border">{p.phone}</td>
              <td className="p-3 border space-x-2">
                <button
                  onClick={() => handleApproval(p._id, true)}
                  className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleApproval(p._id, false)}
                  className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700"
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
