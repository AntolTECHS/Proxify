import { Card, CardContent } from "../../components/ui/card";
import { useAuth } from "../../context/AuthContext";

export default function AdminProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-gray-600">Your admin account details.</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <InfoBox label="Name" value={user?.name || "-"} />
            <InfoBox label="Email" value={user?.email || "-"} />
            <InfoBox label="Role" value={user?.role || "-"} />
            <InfoBox label="Status" value={user?.isVerified ? "Verified" : "Active"} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-2xl border bg-gray-50 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-gray-900">{value}</p>
    </div>
  );
}