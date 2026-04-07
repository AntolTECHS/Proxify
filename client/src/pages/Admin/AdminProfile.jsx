import { useMemo } from "react";
import { FaCircle, FaEnvelope, FaIdBadge, FaShieldAlt, FaUser, FaCalendarAlt } from "react-icons/fa";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../context/AuthContext";

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function getInitials(name) {
  return (
    String(name || "A")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "A"
  );
}

function InfoBox({ label, value, icon }) {
  return (
    <div className="rounded-2xl border bg-gray-50 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="text-gray-400">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="mt-2 break-words text-base font-semibold text-gray-900">{value || "-"}</p>
    </div>
  );
}

export default function AdminProfilePage() {
  const { user } = useAuth();

  const roleLabel = useMemo(() => {
    if (!user?.role) return "Unknown";
    return String(user.role).charAt(0).toUpperCase() + String(user.role).slice(1);
  }, [user?.role]);

  const badgeClass =
    user?.role === "admin"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : "border-gray-200 bg-gray-50 text-gray-700";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-900 text-2xl font-bold text-white shadow-sm">
            {getInitials(user?.name)}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass}`}
              >
                <FaShieldAlt />
                {roleLabel}
              </span>
            </div>
            <p className="mt-1 text-gray-600">Your admin account details.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <FaCircle className={user?.isVerified ? "text-green-500" : "text-gray-400"} />
          <span>{user?.isVerified ? "Verified account" : "Active account"}</span>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <InfoBox label="Name" value={user?.name || "-"} icon={<FaUser />} />
            <InfoBox label="Email" value={user?.email || "-"} icon={<FaEnvelope />} />
            <InfoBox label="Role" value={roleLabel} icon={<FaIdBadge />} />
            <InfoBox
              label="Status"
              value={user?.isVerified ? "Verified" : "Active"}
              icon={<FaShieldAlt />}
            />
            <InfoBox
              label="Account Created"
              value={formatDateTime(user?.createdAt)}
              icon={<FaCalendarAlt />}
            />
            <InfoBox
              label="Account ID"
              value={user?._id || user?.id || "-"}
              icon={<FaIdBadge />}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Account overview</h2>
              <p className="mt-1 text-sm text-gray-500">
                This profile displays the essential information tied to your admin account.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">Permissions</p>
              <p className="mt-1 text-sm text-gray-600">
                Admin users can manage dashboard analytics, providers, bookings, and platform settings.
              </p>
            </div>

            <div className="rounded-2xl border bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">Security</p>
              <p className="mt-1 text-sm text-gray-600">
                Keep your email and login credentials secure. Sign out from shared devices when finished.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
