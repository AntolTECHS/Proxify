import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../context/AuthContext";
import { adminService } from "../../services/adminService";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:5000";

function resolveFileUrl(filePath) {
  if (!filePath) return "";
  if (/^https?:\/\//i.test(filePath)) return filePath;
  if (filePath.startsWith("//")) return `https:${filePath}`;
  return `${API_BASE_URL.replace(/\/$/, "")}${filePath.startsWith("/") ? "" : "/"}${filePath}`;
}

function formatKshPrice(value) {
  if (value === null || value === undefined || value === "") return "KSh -";

  const numericValue =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.-]/g, ""));

  if (Number.isNaN(numericValue)) {
    return `KSh ${value}`;
  }

  return `KSh ${new Intl.NumberFormat("en-KE").format(numericValue)}`;
}

function getStatusMeta(status, approvalBanner, rejectionReason) {
  if (status === "approved") {
    return {
      label: approvalBanner || "Approved",
      badgeClass: "bg-green-100 text-green-700 border-green-200",
      bannerClass: "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (status === "rejected") {
    return {
      label: approvalBanner || "Rejected",
      badgeClass: "bg-red-100 text-red-700 border-red-200",
      bannerClass: "bg-red-50 text-red-700 border-red-200",
      rejectionReason: rejectionReason || "",
    };
  }

  return {
    label: approvalBanner || "Pending admin approval",
    badgeClass: "bg-yellow-100 text-yellow-700 border-yellow-200",
    bannerClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
  };
}

function DocumentCard({ doc, onClickOpen, onPreview }) {
  const url = resolveFileUrl(doc?.path);

  return (
    <div className="rounded-2xl border bg-gray-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-gray-900">{doc?.name || "Unnamed document"}</p>
          <p className="text-sm text-gray-500">
            {doc?.type || "Unknown type"} -{" "}
            {doc?.size ? `${Math.round((doc.size / 1024) * 10) / 10} KB` : "Unknown size"}
          </p>
        </div>

        <div className="flex gap-2">
          {url && (
            <>
              <Button type="button" variant="secondary" onClick={() => onPreview(url, doc)}>
                Preview
              </Button>
              <Button type="button" variant="outline" onClick={() => onClickOpen(url)}>
                Open Document
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-2xl border bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value || "-"}</p>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="text-lg font-semibold text-gray-900">{children}</h3>;
}

export default function AdminProvidersPage() {
  const { token, user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [actionLoading, setActionLoading] = useState("");
  const [activeTab, setActiveTab] = useState("services");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);

  const loadProviders = async () => {
    if (!token || user?.role !== "admin") return;

    setLoading(true);
    setError("");

    try {
      const list = await adminService.getProviders(token);
      setProviders(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.message || "Failed to load providers");
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, [token, user?.role]);

  const filteredProviders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return providers;

    return providers.filter((p) => {
      const nameMatch = (p.basicInfo?.providerName || p.name || "").toLowerCase().includes(q);
      const emailMatch = (p.basicInfo?.email || p.email || "").toLowerCase().includes(q);
      const businessMatch = (p.basicInfo?.businessName || "").toLowerCase().includes(q);
      const categoryMatch = (p.category || "").toLowerCase().includes(q);
      const statusMatch = String(p.status || "").toLowerCase().includes(q);

      const serviceMatch = (p.services || []).some((s) =>
        String(s.name || s.title || "").toLowerCase().includes(q)
      );

      const documentMatch = (p.documents || []).some((d) =>
        [d?.name, d?.type, d?.path].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
      );

      return (
        nameMatch ||
        emailMatch ||
        businessMatch ||
        categoryMatch ||
        statusMatch ||
        serviceMatch ||
        documentMatch
      );
    });
  }, [providers, search]);

  const handleApprove = async (id) => {
    try {
      setActionLoading(id);
      await adminService.approveProvider(id, token);
      await loadProviders();

      if (selectedProvider?._id === id) {
        const fullProvider = await adminService.getProviderById(id, token);
        setSelectedProvider(fullProvider?.provider || fullProvider);
      }
    } finally {
      setActionLoading("");
    }
  };

  const handleReject = async (id) => {
    const note = window.prompt("Enter rejection reason");
    if (!note?.trim()) return;

    try {
      setActionLoading(id);
      await adminService.rejectProvider(id, note.trim(), token);
      await loadProviders();

      if (selectedProvider?._id === id) {
        const fullProvider = await adminService.getProviderById(id, token);
        setSelectedProvider(fullProvider?.provider || fullProvider);
      }
    } finally {
      setActionLoading("");
    }
  };

  const openProvider = async (provider) => {
    if (!provider?._id) return;

    setSelectedProvider(provider);
    setActiveTab("services");
    setDetailLoading(true);
    setError("");

    try {
      const fullProvider = await adminService.getProviderById(provider._id, token);
      setSelectedProvider(fullProvider?.provider || fullProvider);
    } catch (err) {
      setError(err?.message || "Failed to load provider details");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeProvider = () => {
    setSelectedProvider(null);
    setActiveTab("services");
    setDetailLoading(false);
  };

  const handleOpenDocument = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handlePreviewDocument = (url, doc) => {
    if (!url) return;
    setPreviewUrl(url);
    setPreviewDoc(doc || null);
  };

  const closePreview = () => {
    setPreviewUrl("");
    setPreviewDoc(null);
  };

  const isPreviewImage =
    previewDoc?.type?.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(previewUrl);

  const isPreviewPdf = previewDoc?.type?.includes("pdf") || /\.pdf$/i.test(previewUrl);

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
        <p className="mt-1 text-gray-600">Review providers, services, and uploaded documents.</p>
        {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <Input
            placeholder="Search provider, service, document, status, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-5"
          />

          {filteredProviders.length === 0 ? (
            <div className="rounded-2xl border bg-gray-50 p-6 text-sm text-gray-600">
              No providers matched your search.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredProviders.map((p) => {
                const providerName = p.basicInfo?.providerName || p.name || "Unnamed provider";
                const providerEmail = p.basicInfo?.email || p.email || "-";
                const providerPhoto = resolveFileUrl(
                  p.basicInfo?.photoURL || p.photoURL || p.avatar || ""
                );
                const statusMeta = getStatusMeta(p.status, p.approvalBanner, p.rejectionReason);
                const isPending = p.status === "pending";

                return (
                  <div
                    key={p._id}
                    onClick={() => openProvider(p)}
                    className="cursor-pointer rounded-3xl border bg-white p-5 shadow-sm transition hover:shadow-md"
                  >
                    <div
                      className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-medium ${statusMeta.bannerClass}`}
                    >
                      {statusMeta.label}
                      {p.status === "rejected" && p.rejectionReason ? (
                        <span className="mt-1 block text-xs font-normal text-red-600">
                          Reason: {p.rejectionReason}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="h-16 w-16 overflow-hidden rounded-2xl border bg-gray-100">
                          {providerPhoto ? (
                            <img
                              src={providerPhoto}
                              alt={providerName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-gray-500">
                              {providerName
                                .split(" ")
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((w) => w[0]?.toUpperCase())
                                .join("") || "P"}
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{providerName}</h3>
                          <p className="text-sm text-gray-500">{providerEmail}</p>
                          {p.basicInfo?.businessName ? (
                            <p className="mt-1 text-sm text-gray-500">
                              Business: {p.basicInfo.businessName}
                            </p>
                          ) : null}
                          {p.category ? (
                            <p className="mt-1 text-sm text-gray-500">Category: {p.category}</p>
                          ) : null}

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}
                            >
                              {statusMeta.label}
                            </span>
                            {p.isVerified ? (
                              <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                Verified
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {isPending && (
                        <div
                          className="flex flex-col gap-2 sm:flex-row"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            onClick={() => handleApprove(p._id)}
                            disabled={actionLoading === p._id}
                          >
                            {actionLoading === p._id ? "Working..." : "Approve"}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleReject(p._id)}
                            disabled={actionLoading === p._id}
                          >
                            Reject
                          </Button>
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

      {selectedProvider && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
          onClick={closeProvider}
        >
          <div
            className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-2xl border bg-gray-100">
                  {selectedProvider.basicInfo?.photoURL ? (
                    <img
                      src={resolveFileUrl(selectedProvider.basicInfo.photoURL)}
                      alt={selectedProvider.basicInfo.providerName || "Provider"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-gray-500">
                      {(selectedProvider.basicInfo?.providerName || selectedProvider.name || "P")
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0]?.toUpperCase())
                        .join("")}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedProvider.basicInfo?.providerName ||
                      selectedProvider.name ||
                      "Unnamed provider"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selectedProvider.basicInfo?.email || selectedProvider.email || "-"}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                        selectedProvider.status === "approved"
                          ? "border-green-200 bg-green-50 text-green-700"
                          : selectedProvider.status === "rejected"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-yellow-200 bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {selectedProvider.approvalBanner ||
                        (selectedProvider.status === "approved"
                          ? "Approved"
                          : selectedProvider.status === "rejected"
                          ? "Rejected"
                          : "Pending admin approval")}
                    </span>

                    {selectedProvider.isVerified ? (
                      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        Verified
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <button
                onClick={closeProvider}
                className="rounded-full px-3 py-1 text-2xl leading-none text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            {selectedProvider.status === "rejected" && selectedProvider.rejectionReason ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <strong>Rejection reason:</strong> {selectedProvider.rejectionReason}
              </div>
            ) : null}

            {detailLoading ? (
              <div className="mt-6 rounded-2xl border bg-gray-50 p-6 text-sm text-gray-600">
                Loading provider details...
              </div>
            ) : (
              <div className="mt-6 space-y-8">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <DetailRow label="Provider Name" value={selectedProvider.basicInfo?.providerName} />
                  <DetailRow label="Email" value={selectedProvider.basicInfo?.email} />
                  <DetailRow label="Phone" value={selectedProvider.basicInfo?.phone} />
                  <DetailRow label="Business Name" value={selectedProvider.basicInfo?.businessName} />
                  <DetailRow label="Category" value={selectedProvider.category} />
                  <DetailRow
                    label="Experience"
                    value={
                      selectedProvider.experience != null
                        ? `${selectedProvider.experience} years`
                        : "-"
                    }
                  />
                  <DetailRow
                    label="Rating"
                    value={
                      selectedProvider.rating != null
                        ? selectedProvider.rating.toFixed?.(1) ?? selectedProvider.rating
                        : "-"
                    }
                  />
                  <DetailRow
                    label="Reviews"
                    value={selectedProvider.reviewCount != null ? selectedProvider.reviewCount : "-"}
                  />
                  <DetailRow
                    label="Availability Status"
                    value={selectedProvider.availabilityStatus}
                  />
                  <DetailRow
                    label="Status"
                    value={selectedProvider.approvalBanner || selectedProvider.status}
                  />
                  <DetailRow label="Location Text" value={selectedProvider.basicInfo?.location} />
                  <DetailRow
                    label="GPS Coordinates"
                    value={
                      Array.isArray(selectedProvider.location?.coordinates)
                        ? `${selectedProvider.location.coordinates[1] ?? "-"}, ${
                            selectedProvider.location.coordinates[0] ?? "-"
                          }`
                        : "-"
                    }
                  />
                </div>

                {selectedProvider.bio ? (
                  <div className="rounded-2xl border bg-gray-50 p-4">
                    <SectionTitle>Bio</SectionTitle>
                    <p className="mt-2 text-sm text-gray-700">{selectedProvider.bio}</p>
                  </div>
                ) : null}

                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <SectionTitle>Services</SectionTitle>
                    <span className="text-sm text-gray-500">
                      {selectedProvider.services?.length || 0} service(s)
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {(selectedProvider.services?.length || 0) === 0 ? (
                      <p className="text-sm text-gray-500">No services found</p>
                    ) : (
                      selectedProvider.services.map((s, idx) => (
                        <div key={s._id || s.id || idx} className="rounded-2xl border bg-white p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium text-gray-900">
                                {s.name || s.title || "Unnamed service"}
                              </p>
                              <p className="text-sm text-gray-500">
                                {s.description || "No description"}
                              </p>
                            </div>
                            <div className="text-sm font-semibold text-gray-900">
                              {formatKshPrice(s.price ?? s.cost)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <SectionTitle>Documents</SectionTitle>
                    <span className="text-sm text-gray-500">
                      {selectedProvider.documents?.length || 0} document(s)
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {(selectedProvider.documents?.length || 0) === 0 ? (
                      <p className="text-sm text-gray-500">No documents found</p>
                    ) : (
                      selectedProvider.documents.map((doc, idx) => (
                        <DocumentCard
                          key={doc._id || doc.id || idx}
                          doc={doc}
                          onClickOpen={handleOpenDocument}
                          onPreview={handlePreviewDocument}
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border bg-gray-50 p-4">
                  <SectionTitle>Availability</SectionTitle>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <DetailRow
                      label="Days"
                      value={
                        Array.isArray(selectedProvider.availability?.days) &&
                        selectedProvider.availability.days.length > 0
                          ? selectedProvider.availability.days.join(", ")
                          : "Not set"
                      }
                    />
                    <DetailRow
                      label="Start"
                      value={selectedProvider.availability?.start || "Not set"}
                    />
                    <DetailRow
                      label="End"
                      value={selectedProvider.availability?.end || "Not set"}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border bg-gray-50 p-4">
                  <SectionTitle>Account / Metadata</SectionTitle>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailRow label="Role" value={selectedProvider.user?.role || "-"} />
                    <DetailRow label="User Name" value={selectedProvider.user?.name || "-"} />
                    <DetailRow label="User Email" value={selectedProvider.user?.email || "-"} />
                    <DetailRow
                      label="Created"
                      value={
                        selectedProvider.createdAt
                          ? new Date(selectedProvider.createdAt).toLocaleString()
                          : "-"
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-end">
                  <Button onClick={closeProvider} variant="outline">
                    Close
                  </Button>

                  {selectedProvider.status === "pending" && (
                    <>
                      <Button
                        onClick={() => handleApprove(selectedProvider._id)}
                        disabled={actionLoading === selectedProvider._id}
                      >
                        {actionLoading === selectedProvider._id ? "Working..." : "Approve Provider"}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleReject(selectedProvider._id)}
                        disabled={actionLoading === selectedProvider._id}
                      >
                        Reject Provider
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-6"
          onClick={closePreview}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {previewDoc?.name || "Document Preview"}
                </p>
                <p className="text-sm text-gray-500">{previewDoc?.type || "Unknown type"}</p>
              </div>
              <button
                onClick={closePreview}
                className="rounded-full px-3 py-1 text-2xl leading-none text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="max-h-[85vh] overflow-y-auto bg-gray-100 p-4">
              {isPreviewImage ? (
                <img
                  src={previewUrl}
                  alt={previewDoc?.name || "Document preview"}
                  className="mx-auto max-h-[80vh] w-auto rounded-2xl shadow"
                />
              ) : isPreviewPdf ? (
                <iframe
                  src={previewUrl}
                  title={previewDoc?.name || "Document preview"}
                  className="h-[80vh] w-full rounded-2xl bg-white"
                />
              ) : (
                <div className="rounded-2xl bg-white p-6 text-sm text-gray-600">
                  This file type cannot be previewed inline. Use Open Document to view it.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}