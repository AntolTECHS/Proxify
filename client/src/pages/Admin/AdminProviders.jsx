// src/pages/admin/AdminProvidersPage.jsx
import { useCallback, useEffect, useMemo, useState, memo } from "react";
import {
  FaCheck,
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaEye,
  FaSearch,
  FaSpinner,
  FaTimes,
} from "react-icons/fa";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../context/AuthContext";
import { adminService } from "../../services/adminService";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:5000";

const PAGE_SIZE = 8;

function resolveFileUrl(filePath) {
  if (!filePath) return "";
  if (/^https?:\/\//i.test(filePath)) return filePath;
  if (filePath.startsWith("//")) return `https:${filePath}`;
  return `${API_BASE_URL.replace(/\/$/, "")}${filePath.startsWith("/") ? "" : "/"}${filePath}`;
}

function formatKshPrice(value) {
  if (value === null || value === undefined || value === "") return "KSh -";

  const numericValue =
    typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]/g, ""));

  if (Number.isNaN(numericValue)) return `KSh ${value}`;
  return `KSh ${new Intl.NumberFormat("en-KE").format(numericValue)}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
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

function getInitials(name) {
  return (
    String(name || "P")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "P"
  );
}

function matchesSearch(provider, q) {
  if (!q) return true;

  const providerName = provider?.basicInfo?.providerName || provider?.name || "";
  const email = provider?.basicInfo?.email || provider?.email || "";
  const business = provider?.basicInfo?.businessName || "";
  const category = provider?.category || "";
  const status = String(provider?.status || "");
  const approvalBanner = String(provider?.approvalBanner || "");
  const rejectionReason = String(provider?.rejectionReason || "");

  const haystackFields = [providerName, email, business, category, status, approvalBanner, rejectionReason];

  const baseMatch = haystackFields.some((v) => String(v).toLowerCase().includes(q));

  const serviceMatch = (provider?.services || []).some((s) =>
    [s?.name, s?.title, s?.description].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
  );

  const documentMatch = (provider?.documents || []).some((d) =>
    [d?.name, d?.type, d?.path].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
  );

  const resubmissionMatch = (provider?.resubmissions || []).some((r) =>
    [r?.note, r?.previousRejectionReason, r?.date].filter(Boolean).some((v) =>
      String(v).toLowerCase().includes(q)
    )
  );

  return baseMatch || serviceMatch || documentMatch || resubmissionMatch;
}

function sortProviders(list, sortBy) {
  const arr = [...list];

  arr.sort((a, b) => {
    if (sortBy === "name-asc") {
      return String(a?.basicInfo?.providerName || a?.name || "").localeCompare(
        String(b?.basicInfo?.providerName || b?.name || "")
      );
    }

    const aTime = new Date(a?.createdAt || 0).getTime();
    const bTime = new Date(b?.createdAt || 0).getTime();

    if (sortBy === "oldest") return aTime - bTime;
    return bTime - aTime; // newest default
  });

  return arr;
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-2xl border bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900 break-words">{value || "-"}</p>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="text-lg font-semibold text-gray-900">{children}</h3>;
}

const DocumentCard = memo(function DocumentCard({ doc, onPreview, onOpen }) {
  const url = resolveFileUrl(doc?.path);

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium text-gray-900">{doc?.name || "Unnamed document"}</p>
          <p className="text-sm text-gray-500">
            {doc?.type || "Unknown type"} · {doc?.size ? `${Math.round((doc.size / 1024) * 10) / 10} KB` : "Unknown size"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => onPreview(url, doc)} disabled={!url}>
            <FaEye className="mr-2" />
            Preview
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpen(url)} disabled={!url}>
            <FaDownload className="mr-2" />
            Open
          </Button>
        </div>
      </div>
    </div>
  );
});

const ProviderCard = memo(function ProviderCard({
  provider,
  onOpen,
  onApprove,
  onReject,
  actionLoading,
}) {
  const providerName = provider?.basicInfo?.providerName || provider?.name || "Unnamed provider";
  const providerEmail = provider?.basicInfo?.email || provider?.email || "-";
  const providerPhoto = resolveFileUrl(provider?.basicInfo?.photoURL || provider?.photoURL || provider?.avatar || "");
  const statusMeta = getStatusMeta(provider?.status, provider?.approvalBanner, provider?.rejectionReason);
  const isPending = provider?.status === "pending";

  return (
    <div
      onClick={() => onOpen(provider)}
      className="cursor-pointer rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-medium ${statusMeta.bannerClass}`}>
        {statusMeta.label}
        {provider?.status === "rejected" && provider?.rejectionReason ? (
          <span className="mt-1 block text-xs font-normal text-red-600">Reason: {provider.rejectionReason}</span>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border bg-gray-100">
            {providerPhoto ? (
              <img src={providerPhoto} alt={providerName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-gray-500">
                {getInitials(providerName)}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-gray-900">{providerName}</h3>
            <p className="truncate text-sm text-gray-500">{providerEmail}</p>
            {provider?.basicInfo?.businessName ? (
              <p className="mt-1 truncate text-sm text-gray-500">Business: {provider.basicInfo.businessName}</p>
            ) : null}
            {provider?.category ? <p className="mt-1 text-sm text-gray-500">Category: {provider.category}</p> : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}>
                {statusMeta.label}
              </span>
              {provider?.isVerified ? (
                <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  Verified
                </span>
              ) : null}
              {(provider?.resubmissions?.length || 0) > 0 ? (
                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  {provider.resubmissions.length} resubmission(s)
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          {isPending ? (
            <>
              <Button onClick={() => onApprove(provider)} disabled={actionLoading === provider?._id}>
                {actionLoading === provider?._id ? "Working..." : "Approve"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => onReject(provider)}
                disabled={actionLoading === provider?._id}
              >
                Reject
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpen(provider)}>
              View details
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const [previewUrl, setPreviewUrl] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectTarget, setRejectTarget] = useState(null);

  const canAccess = token && user?.role === "admin";

  const loadProviders = useCallback(async () => {
    if (!canAccess) return;

    setLoading(true);
    setError("");

    try {
      const list = await adminService.getProviders(token);
      setProviders(Array.isArray(list) ? list : []);
    } catch (err) {
      setProviders([]);
      setError(err?.message || "Failed to load providers");
    } finally {
      setLoading(false);
    }
  }, [canAccess, token]);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!canAccess) {
        setLoading(false);
        return;
      }
      if (!active) return;
      await loadProviders();
    })();

    return () => {
      active = false;
    };
  }, [canAccess, loadProviders]);

  const refreshSelectedProvider = useCallback(
    async (id) => {
      if (!id || !token) return;
      const fullProvider = await adminService.getProviderById(id, token);
      setSelectedProvider(fullProvider?.provider || fullProvider || null);
    },
    [token]
  );

  const handleOpenProvider = useCallback(
    async (provider) => {
      if (!provider?._id) return;

      setSelectedProvider(provider);
      setActiveTab("services");
      setDetailLoading(true);
      setError("");

      try {
        const fullProvider = await adminService.getProviderById(provider._id, token);
        setSelectedProvider(fullProvider?.provider || fullProvider || provider);
      } catch (err) {
        setError(err?.message || "Failed to load provider details");
      } finally {
        setDetailLoading(false);
      }
    },
    [token]
  );

  const handleApprove = useCallback(
    async (provider) => {
      const id = provider?._id;
      if (!id) return;

      try {
        setActionLoading(id);
        await adminService.approveProvider(id, token);
        await loadProviders();
        if (selectedProvider?._id === id) await refreshSelectedProvider(id);
      } catch (err) {
        setError(err?.message || "Failed to approve provider");
      } finally {
        setActionLoading("");
      }
    },
    [token, loadProviders, refreshSelectedProvider, selectedProvider?._id]
  );

  const openRejectDialog = useCallback((provider) => {
    if (!provider?._id) return;
    setRejectTarget(provider);
    setRejectReason("");
    setRejectOpen(true);
  }, []);

  const handleReject = useCallback(async () => {
    const id = rejectTarget?._id;
    const reason = rejectReason.trim();
    if (!id || !reason) return;

    try {
      setActionLoading(id);
      await adminService.rejectProvider(id, reason, token);
      setRejectOpen(false);
      setRejectReason("");
      setRejectTarget(null);
      await loadProviders();
      if (selectedProvider?._id === id) await refreshSelectedProvider(id);
    } catch (err) {
      setError(err?.message || "Failed to reject provider");
    } finally {
      setActionLoading("");
    }
  }, [rejectTarget, rejectReason, token, loadProviders, refreshSelectedProvider, selectedProvider?._id]);

  const closeProvider = useCallback(() => {
    setSelectedProvider(null);
    setActiveTab("services");
    setDetailLoading(false);
    setRejectOpen(false);
    setRejectReason("");
    setRejectTarget(null);
  }, []);

  const handleOpenDocument = useCallback((url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handlePreviewDocument = useCallback((url, doc) => {
    if (!url) return;
    setPreviewUrl(url);
    setPreviewDoc(doc || null);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewUrl("");
    setPreviewDoc(null);
  }, []);

  const filteredProviders = useMemo(() => {
    const q = search.trim().toLowerCase();

    const baseList = providers.filter((p) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "resubmissions") return (p?.resubmissions?.length || 0) > 0;
      return String(p?.status || "").toLowerCase() === statusFilter;
    });

    const searched = baseList.filter((p) => matchesSearch(p, q));
    return sortProviders(searched, sortBy);
  }, [providers, search, statusFilter, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredProviders.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sortBy]);

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount);
  }, [currentPage, pageCount]);

  const paginatedProviders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProviders.slice(start, start + PAGE_SIZE);
  }, [filteredProviders, currentPage]);

  const previewMeta = useMemo(() => {
    const isImage =
      previewDoc?.type?.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(previewUrl);
    const isPdf = previewDoc?.type?.includes("pdf") || /\.pdf$/i.test(previewUrl);
    return { isImage, isPdf };
  }, [previewDoc, previewUrl]);

  const downloadPreview = useCallback(() => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = previewDoc?.name || "document";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [previewUrl, previewDoc]);

  if (!canAccess) {
    return <div className="rounded-3xl bg-white p-6 shadow-sm">Access denied.</div>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm">
          <FaSpinner className="animate-spin text-gray-700" />
          <span className="text-gray-700">Loading providers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">Providers & Services</h1>
        <p className="mt-1 text-gray-600">
          Review providers, services, documents, approvals, rejections, and resubmissions.
        </p>
        {error ? <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xl">
              <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search provider, service, document, status, category, or resubmission..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm outline-none focus:border-sky-500"
              >
                <option value="all">All providers</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="resubmissions">Resubmissions</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm outline-none focus:border-sky-500"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name-asc">Name A-Z</option>
              </select>

              <Button variant="outline" onClick={loadProviders}>
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <TabButton active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
              All
            </TabButton>
            <TabButton active={statusFilter === "pending"} onClick={() => setStatusFilter("pending")}>
              Pending
            </TabButton>
            <TabButton active={statusFilter === "approved"} onClick={() => setStatusFilter("approved")}>
              Approved
            </TabButton>
            <TabButton active={statusFilter === "rejected"} onClick={() => setStatusFilter("rejected")}>
              Rejected
            </TabButton>
            <TabButton
              active={statusFilter === "resubmissions"}
              onClick={() => setStatusFilter("resubmissions")}
            >
              Resubmissions
            </TabButton>
          </div>

          <div className="mt-5 flex items-center justify-between text-sm text-gray-500">
            <p>
              Showing <strong className="text-gray-900">{filteredProviders.length}</strong> provider(s)
            </p>
            <p>
              Page <strong className="text-gray-900">{currentPage}</strong> of{" "}
              <strong className="text-gray-900">{pageCount}</strong>
            </p>
          </div>

          {filteredProviders.length === 0 ? (
            <div className="mt-6 rounded-2xl border bg-gray-50 p-6 text-sm text-gray-600">
              No providers matched your search and filters.
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {paginatedProviders.map((provider) => (
                  <ProviderCard
                    key={provider._id}
                    provider={provider}
                    onOpen={handleOpenProvider}
                    onApprove={handleApprove}
                    onReject={openRejectDialog}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredProviders.length)}-
                  {Math.min(currentPage * PAGE_SIZE, filteredProviders.length)} of {filteredProviders.length}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <FaChevronLeft className="mr-2" />
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                    disabled={currentPage === pageCount}
                  >
                    Next
                    <FaChevronRight className="ml-2" />
                  </Button>
                </div>
              </div>
            </>
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
              <div className="flex min-w-0 items-start gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-2xl border bg-gray-100">
                  {selectedProvider.basicInfo?.photoURL ? (
                    <img
                      src={resolveFileUrl(selectedProvider.basicInfo.photoURL)}
                      alt={selectedProvider.basicInfo.providerName || "Provider"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-gray-500">
                      {getInitials(selectedProvider.basicInfo?.providerName || selectedProvider.name)}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-bold text-gray-900">
                    {selectedProvider.basicInfo?.providerName || selectedProvider.name || "Unnamed provider"}
                  </h2>
                  <p className="truncate text-sm text-gray-500">
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
                aria-label="Close provider details"
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
              <div className="mt-6 space-y-6">
                <div className="flex flex-wrap gap-2 border-b pb-4">
                  <TabButton active={activeTab === "services"} onClick={() => setActiveTab("services")}>
                    Services
                  </TabButton>
                  <TabButton active={activeTab === "documents"} onClick={() => setActiveTab("documents")}>
                    Documents
                  </TabButton>
                  <TabButton active={activeTab === "availability"} onClick={() => setActiveTab("availability")}>
                    Availability
                  </TabButton>
                  <TabButton active={activeTab === "metadata"} onClick={() => setActiveTab("metadata")}>
                    Metadata
                  </TabButton>
                  <TabButton active={activeTab === "history"} onClick={() => setActiveTab("history")}>
                    Resubmissions
                  </TabButton>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <DetailRow label="Provider Name" value={selectedProvider.basicInfo?.providerName} />
                  <DetailRow label="Email" value={selectedProvider.basicInfo?.email} />
                  <DetailRow label="Phone" value={selectedProvider.basicInfo?.phone} />
                  <DetailRow label="Business Name" value={selectedProvider.basicInfo?.businessName} />
                  <DetailRow label="Category" value={selectedProvider.category} />
                  <DetailRow
                    label="Experience"
                    value={selectedProvider.experience != null ? `${selectedProvider.experience} years` : "-"}
                  />
                  <DetailRow
                    label="Rating"
                    value={selectedProvider.rating != null ? (selectedProvider.rating.toFixed?.(1) ?? selectedProvider.rating) : "-"}
                  />
                  <DetailRow label="Reviews" value={selectedProvider.reviewCount != null ? selectedProvider.reviewCount : "-"} />
                  <DetailRow label="Availability Status" value={selectedProvider.availabilityStatus} />
                  <DetailRow label="Status" value={selectedProvider.approvalBanner || selectedProvider.status} />
                  <DetailRow label="Location Text" value={selectedProvider.basicInfo?.location} />
                  <DetailRow
                    label="GPS Coordinates"
                    value={
                      Array.isArray(selectedProvider.location?.coordinates)
                        ? `${selectedProvider.location.coordinates[1] ?? "-"}, ${selectedProvider.location.coordinates[0] ?? "-"}`
                        : "-"
                    }
                  />
                </div>

                {activeTab === "services" && (
                  <div className="rounded-2xl border bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <SectionTitle>Services</SectionTitle>
                      <span className="text-sm text-gray-500">{selectedProvider.services?.length || 0} service(s)</span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {(selectedProvider.services?.length || 0) === 0 ? (
                        <p className="text-sm text-gray-500">No services found</p>
                      ) : (
                        selectedProvider.services.map((s, idx) => (
                          <div key={s._id || s.id || idx} className="rounded-2xl border bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium text-gray-900">{s.name || s.title || "Unnamed service"}</p>
                                <p className="text-sm text-gray-500">{s.description || "No description"}</p>
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
                )}

                {activeTab === "documents" && (
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
                            onOpen={handleOpenDocument}
                            onPreview={handlePreviewDocument}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "availability" && (
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
                      <DetailRow label="Start" value={selectedProvider.availability?.start || "Not set"} />
                      <DetailRow label="End" value={selectedProvider.availability?.end || "Not set"} />
                    </div>
                  </div>
                )}

                {activeTab === "metadata" && (
                  <div className="rounded-2xl border bg-gray-50 p-4">
                    <SectionTitle>Account / Metadata</SectionTitle>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <DetailRow label="Role" value={selectedProvider.user?.role || "-"} />
                      <DetailRow label="User Name" value={selectedProvider.user?.name || "-"} />
                      <DetailRow label="User Email" value={selectedProvider.user?.email || "-"} />
                      <DetailRow label="Created" value={formatDateTime(selectedProvider.createdAt)} />
                    </div>
                  </div>
                )}

                {activeTab === "history" && (
                  <div className="rounded-2xl border bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <SectionTitle>Resubmissions</SectionTitle>
                      <span className="text-sm text-gray-500">
                        {selectedProvider.resubmissions?.length || 0} item(s)
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {(selectedProvider.resubmissions?.length || 0) === 0 ? (
                        <p className="text-sm text-gray-500">No resubmission history yet.</p>
                      ) : (
                        selectedProvider.resubmissions.map((item, idx) => (
                          <div key={item?._id || idx} className="rounded-2xl border bg-white p-4 shadow-sm">
                            <p className="text-sm font-semibold text-gray-900">
                              Resubmission #{selectedProvider.resubmissions.length - idx}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              <strong>Date:</strong> {formatDateTime(item?.date)}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              <strong>Note:</strong> {item?.note || "-"}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              <strong>Previous rejection reason:</strong> {item?.previousRejectionReason || "-"}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {selectedProvider.bio ? (
                  <div className="rounded-2xl border bg-gray-50 p-4">
                    <SectionTitle>Bio</SectionTitle>
                    <p className="mt-2 text-sm text-gray-700">{selectedProvider.bio}</p>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-end">
                  <Button onClick={closeProvider} variant="outline">
                    Close
                  </Button>

                  {selectedProvider.status === "pending" && (
                    <>
                      <Button
                        onClick={() => handleApprove(selectedProvider)}
                        disabled={actionLoading === selectedProvider._id}
                      >
                        <FaCheck className="mr-2" />
                        {actionLoading === selectedProvider._id ? "Working..." : "Approve Provider"}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => openRejectDialog(selectedProvider)}
                        disabled={actionLoading === selectedProvider._id}
                      >
                        <FaTimes className="mr-2" />
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

      {rejectOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-6"
          onClick={() => {
            setRejectOpen(false);
            setRejectReason("");
            setRejectTarget(null);
          }}
        >
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-gray-900">Reject Provider</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add a clear reason so the provider knows what to fix before resubmitting.
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-gray-700">Rejection reason</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={5}
                className="w-full rounded-2xl border border-gray-300 p-3 outline-none focus:border-sky-500"
                placeholder="Example: Please upload a clearer business registration document and correct your phone number."
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setRejectOpen(false);
                  setRejectReason("");
                  setRejectTarget(null);
                }}
                disabled={actionLoading === rejectTarget?._id}
              >
                Cancel
              </button>

              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading === rejectTarget?._id}
              >
                {actionLoading === rejectTarget?._id ? "Rejecting..." : "Reject Provider"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 py-6"
          onClick={closePreview}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-gray-900">
                  {previewDoc?.name || "Document Preview"}
                </p>
                <p className="truncate text-sm text-gray-500">{previewDoc?.type || "Unknown type"}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={downloadPreview}>
                  <FaDownload className="mr-2" />
                  Download
                </Button>
                <button
                  onClick={closePreview}
                  className="rounded-full px-3 py-1 text-2xl leading-none text-gray-500 hover:bg-gray-100"
                  aria-label="Close preview"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="max-h-[85vh] overflow-y-auto bg-gray-100 p-4">
              {previewMeta.isImage ? (
                <img
                  src={previewUrl}
                  alt={previewDoc?.name || "Document preview"}
                  className="mx-auto max-h-[80vh] w-auto rounded-2xl shadow"
                />
              ) : previewMeta.isPdf ? (
                <iframe
                  src={previewUrl}
                  title={previewDoc?.name || "Document preview"}
                  className="h-[80vh] w-full rounded-2xl bg-white"
                />
              ) : (
                <div className="rounded-2xl bg-white p-6 text-sm text-gray-600">
                  This file type cannot be previewed inline. Use Open or Download to view it.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
