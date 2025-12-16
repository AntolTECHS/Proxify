import Profile from "../../components/Provider/Profile.jsx";
import Services from "../../components/Provider/Services.jsx";

export default function ProviderDashboard() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">
        Provider Dashboard
      </h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <Profile />
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <Services />
        </div>
      </div>
    </div>
  );
}
