import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../context/AuthContext";
import { adminService } from "../../services/adminService";

const STATUS_OPTIONS = ["All", "pending", "accepted", "completed", "cancelled"];

export default function AdminBookingsPage() {
  const { token, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!token || user?.role !== "admin") return;
    setLoading(true);
    try {
      const data = await adminService.getBookings(token);
      setBookings(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token, user?.role]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      const okStatus = filter === "All" || b.status === filter;
      const okSearch =
        (b.serviceName || "").toLowerCase().includes(q) ||
        (b.customer?.name || "").toLowerCase().includes(q) ||
        (b.provider?.name || "").toLowerCase().includes(q);
      return okStatus && okSearch;
    });
  }, [bookings, filter, search]);

  const updateStatus = async (id, status) => {
    await adminService.updateBookingStatus(id, status, token);
    await load();
  };

  const deleteBooking = async (id) => {
    const ok = window.confirm("Delete this booking permanently?");
    if (!ok) return;
    await adminService.deleteBooking?.(id, token);
    await load();
  };

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        Loading bookings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
        <p className="mt-1 text-gray-600">Review and manage customer bookings.</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-3 lg:flex-row">
            <Input
              placeholder="Search by service, customer, or provider..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <Button
                  key={s}
                  variant={filter === s ? "default" : "outline"}
                  onClick={() => setFilter(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full overflow-hidden rounded-2xl border bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Service</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Provider</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b._id} className="border-t">
                    <td className="px-4 py-3">{b.serviceName || "-"}</td>
                    <td className="px-4 py-3">{b.customer?.name || "-"}</td>
                    <td className="px-4 py-3">{b.provider?.name || "-"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={b.status}
                        onChange={(e) => updateStatus(b._id, e.target.value)}
                        className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900"
                      >
                        {["pending", "accepted", "completed", "cancelled"].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="destructive" size="sm" onClick={() => deleteBooking(b._id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                      No bookings found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}