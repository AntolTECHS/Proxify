import { Link } from "react-router-dom";

export default function ProviderDashboard() {
  return (
    <div className="max-w-7xl mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold text-teal-600 mb-6">
        Provider Dashboard
      </h1>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard title="Active Jobs" value="3" />
        <StatCard title="Completed Jobs" value="27" />
        <StatCard title="Rating" value="4.8 ★" />
        <StatCard title="Earnings" value="$1,240" />
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <ActionCard
          title="Manage Services"
          description="Update the services you offer"
          link="/provider/services"
        />
        <ActionCard
          title="Edit Profile"
          description="Update your provider profile"
          link="/provider/profile"
        />
      </div>

      {/* RECENT JOBS */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Recent Jobs</h2>
        </div>

        <div className="divide-y">
          <JobRow
            title="Plumbing Repair"
            customer="John Doe"
            status="In Progress"
          />
          <JobRow
            title="House Cleaning"
            customer="Sarah Smith"
            status="Completed"
          />
          <JobRow
            title="Electrical Installation"
            customer="Michael Lee"
            status="Pending"
          />
        </div>
      </div>
    </div>
  );
}

/* --------- COMPONENTS --------- */

function StatCard({ title, value }) {
  return (
    <div className="bg-white border rounded-lg p-5 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function ActionCard({ title, description, link }) {
  return (
    <Link
      to={link}
      className="block bg-teal-50 border border-teal-200 rounded-lg p-6 hover:bg-teal-100 transition"
    >
      <h3 className="font-semibold text-lg text-teal-700">{title}</h3>
      <p className="text-sm text-gray-600 mt-2">{description}</p>
    </Link>
  );
}

function JobRow({ title, customer, status }) {
  const statusColor =
    status === "Completed"
      ? "text-green-600"
      : status === "In Progress"
      ? "text-teal-600"
      : "text-yellow-600";

  return (
    <div className="px-6 py-4 flex justify-between items-center">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-gray-500">Customer: {customer}</p>
      </div>
      <span className={`font-medium ${statusColor}`}>{status}</span>
    </div>
  );
}
