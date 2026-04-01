import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../context/AuthContext";
import { adminService } from "../../services/adminService";

export default function AdminProvidersPage() {
  const { token, user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const normalizeList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.providers)) return data.providers;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  };

  const load = async () => {
    if (!token || user?.role !== "admin") return;

    setLoading(true);
    setError("");

    try {
      const providersData = await adminService.getProviders(token);
      const list = normalizeList(providersData).map((p) => ({
        ...p,
        services: Array.isArray(p.services) ? p.services : [],
      }));

      setProviders(list);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to load data");
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.role]);

  const filteredProviders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return providers;

    return providers.filter((p) => {
      const providerName = p.basicInfo?.providerName || p.name || "";
      const providerEmail = p.basicInfo?.email || p.email || "";
      const providerServices = Array.isArray(p.services) ? p.services : [];

      const providerMatch =
        providerName.toLowerCase().includes(q) || providerEmail.toLowerCase().includes(q);

      const serviceMatch = providerServices.some((s) =>
        (s.name || "").toLowerCase().includes(q)
      );

      return providerMatch || serviceMatch;
    });
  }, [providers, search]);

  const handleApprove = async (id) => {
    await adminService.approveProvider(id, token);
    await load();
  };

  const handleReject = async (id) => {
    const note = window.prompt("Enter rejection reason");
    if (!note?.trim()) return;

    await adminService.rejectProvider(id, note.trim(), token);
    await load();
  };

  if (!token || user?.role !== "admin") {
    return <div className="rounded-3xl bg-white p-6 shadow-sm">Access denied.</div>;
  }

  if (loading) {
    return <div className="rounded-3xl bg-white p-6 shadow-sm">Loading providers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">Providers & Services</h1>
        <p className="mt-1 text-gray-600">Review providers and manage their services.</p>
        {error ? (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="mb-5">
            <Input
              placeholder="Search provider or service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filteredProviders.length === 0 ? (
            <div className="rounded-2xl border bg-gray-50 p-6 text-sm text-gray-600">
              No providers matched your search.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredProviders.map((p) => {
                const providerName = p.basicInfo?.providerName || p.name || "Unnamed provider";
                const providerEmail = p.basicInfo?.email || p.email || "-";
                const providerServices = Array.isArray(p.services) ? p.services : [];
                const isPending = p.status !== "approved";

                return (
                  <div key={p._id} className="rounded-3xl border bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{providerName}</h3>
                        <p className="text-sm text-gray-500">{providerEmail}</p>
                        <p className="mt-2 text-sm font-medium">
                          Status:{" "}
                          <span className={p.status === "approved" ? "text-green-600" : "text-yellow-600"}>
                            {p.status || "Pending"}
                          </span>
                        </p>
                      </div>

                      {isPending && (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button onClick={() => handleApprove(p._id)}>Approve</Button>
                          <Button variant="destructive" onClick={() => handleReject(p._id)}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="mt-5">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">Services</h4>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                          {providerServices.length}
                        </span>
                      </div>

                      {providerServices.length === 0 ? (
                        <p className="text-sm text-gray-500">No services found</p>
                      ) : (
                        <div className="space-y-3">
                          {providerServices.map((s, index) => {
                            const serviceId = s._id || s.id || `${p._id}-${index}`;

                            return (
                              <div
                                key={serviceId}
                                className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {s.name || "Unnamed service"}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {s.description || "No description"}
                                    </p>
                                  </div>

                                  <div className="text-right text-sm font-semibold text-gray-900">
                                    {s.price ?? s.cost ?? "-"}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
