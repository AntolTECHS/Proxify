import SearchProviders from "../../components/Customer/SearchProviders.jsx";
import Bookings from "../../components/Customer/Bookings.jsx";

export default function CustomerDashboard() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">
        Customer Dashboard
      </h1>

      <div className="grid gap-6">
        {/* Search Providers */}
        <div className="bg-white p-6 rounded-lg shadow">
          <SearchProviders />
        </div>

     
        <div className="bg-white p-6 rounded-lg shadow">
          <Bookings />
        </div>
      </div>
    </div>
  );
}
