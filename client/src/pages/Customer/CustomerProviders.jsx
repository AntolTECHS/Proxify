// src/pages/Customer/CustomerProviders.jsx
import { useSelector } from "react-redux";

export default function CustomerProviders() {
  const providers = useSelector((state) => state.providers.list || []);

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        Available Providers
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.length === 0 && (
          <p className="text-gray-500 col-span-full">
            No providers available at the moment.
          </p>
        )}

        {providers.map((provider) => (
          <div
            key={provider.id}
            className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-gray-800">
                {provider.businessName || provider.name}
              </h2>

              {/* Verified / Unverified Tag */}
              <span
                className={`px-2 py-1 text-sm font-medium rounded-full ${
                  provider.providerStatus === "approved"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {provider.providerStatus === "approved" ? "Verified" : "Unverified"}
              </span>
            </div>

            <p className="text-gray-600 mb-2">{provider.services}</p>

            <p className="text-gray-500 text-sm mb-4">
              Rating: {provider.rating || "N/A"} ⭐
            </p>

            <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md transition">
              View Profile
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
