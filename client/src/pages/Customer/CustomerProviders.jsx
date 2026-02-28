// src/pages/customer/CustomerProviders.jsx
import { useState, useEffect } from "react";
import { FaStar } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.jsx";

const API_URL = "http://localhost:5000/api";

export default function CustomerProviders() {
  const { token } = useAuth();
  const [providers, setProviders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchProviders = async () => {
      try {
        const res = await fetch(`${API_URL}/providers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setProviders(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setProviders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, [token]);

  const filteredProviders = providers.filter((p) =>
    (p?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p?.service || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 font-medium" style={{ color: "#0ea5e9" }}>
        Loading providers…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="border rounded-lg p-6" style={{ backgroundColor: "#e0f2fe", borderColor: "#0ea5e9" }}>
        <h1 className="text-2xl font-bold" style={{ color: "#0ea5e9" }}>
          Available Providers
        </h1>
        <p className="mt-1" style={{ color: "#0ea5e9" }}>
          Browse and search for providers
        </p>
      </div>

      {/* SEARCH */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search providers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border rounded-md p-3 focus:outline-none"
          style={{
            borderColor: "#0ea5e9",
            boxShadow: "0 0 0 2px rgba(14, 165, 233, 0.3)",
          }}
        />
      </div>

      {/* PROVIDER CARDS */}
      {filteredProviders.length === 0 ? (
        <div className="bg-white border rounded-lg py-16 text-center text-gray-500">
          No providers found.
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {filteredProviders.map((p) => (
            <div
              key={p._id}
              className="bg-white border rounded-lg p-5 hover:shadow-md transition"
              style={{ borderColor: "#0ea5e933" }}
            >
              <h3 className="font-semibold text-lg" style={{ color: "#0ea5e9" }}>
                {p.name}
              </h3>
              <p className="text-gray-500 mt-1">{p.service}</p>
              <p className="flex items-center mt-2 gap-2" style={{ color: "#0ea5e9" }}>
                <FaStar /> {p.rating?.toFixed(1) || "N/A"}
              </p>
              <button
                className="mt-4 w-full px-4 py-2 rounded-md font-medium transition"
                style={{
                  backgroundColor: "#e0f2fe",
                  color: "#0ea5e9",
                  border: "1px solid #0ea5e9",
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#bae6fd")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#e0f2fe")}
              >
                Book Now
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}