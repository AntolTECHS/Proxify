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
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [actionLoading, setActionLoading] = useState("");

  const normalizeList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.providers)) return data.providers;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  };

  const getProviderName = (p) => p?.basicInfo?.providerName || p?.name || "Unnamed provider";
  const getProviderEmail = (p) => p?.basicInfo?.email || p?.email || "-";

  const getProviderPhoto = (provider) =>
    provider?.basicInfo?.photoURL ||
    provider?.photoURL ||
    provider?.avatar ||
    provider?.profilePhoto ||
    provider?.image ||
    "";

  const getDocumentUrl = (doc) =>
    doc?.path || doc?.url || doc?.fileUrl || doc?.link || doc?.secureUrl || "";

  const getDocumentType = (doc) => String(doc?.type || doc?.mimeType || "").toLowerCase();

  const normalizeDocuments = (provider) => {
    const arrays = [
      provider?.documents,
      provider?.docs,
      provider?.files,
      provider?.attachments,
      provider?.verificationDocuments,
      provider?.basicInfo?.documents,
      provider?.basicInfo?.files,
      provider?.basicInfo?.attachments,
    ];

    return arrays
      .filter(Array.isArray)
      .flat()
      .filter((doc) => doc && getDocumentUrl(doc));
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
        documents: normalizeDocuments(p),
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
      const providerName = getProviderName(p);
      const providerEmail = getProviderEmail(p);
      const providerServices = Array.isArray(p.services) ? p.services : [];
      const providerDocuments = Array.isArray(p.documents) ? p.documents : [];

      const providerMatch =
        providerName.toLowerCase().includes(q) || providerEmail.toLowerCase().includes(q);

      const serviceMatch = providerServices.some((s) =>
        (s.name || "").toLowerCase().includes(q)
      );

      const documentMatch = providerDocuments.some((d) =>
        [d.name, d.title, d.fileName, d.type, d.category, d.status]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );

      return providerMatch || serviceMatch || documentMatch;
    });
  }, [providers, search]);

  const handleApprove = async (id) => {
    try {
      setActionLoading(id);
      await adminService.approveProvider(id, token);
      await load();

      if (selectedProvider?._id === id) {
        const updated = providers.find((p) => p._id === id);
        setSelectedProvider(updated ? { ...updated, status: "approved" } : null);
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
      await load();

      if (selectedProvider?._id === id) {
        const updated = providers.find((p) => p._id === id);
        setSelectedProvider(updated ? { ...updated, status: "rejected" } : null);
      }
    } finally {
      setActionLoading("");
    }
  };

  const openProvider = (provider) => {
    setSelectedProvider({
      ...provider,
      services: Array.isArray(provider.services) ? provider.services : [],
      documents: normalizeDocuments(provider),
    });
  };

  const closeProvider = () => setSelectedProvider(null);

  const renderField = (label, value) => (
    <div className="rounded-2xl border bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm text-gray-900">{value || "N/A"}</p>
    </div>
  );

  const renderDocumentLink = (doc) => {
    const url = getDocumentUrl(doc);
    if (!url) return null;

    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-block text-sm font-medium text-sky-600 hover:underline"
      >
        Open document
      </a>
    );
  };

  const renderDocumentPreview = (doc) => {
    const url = getDocumentUrl(doc);
    const type = getDocumentType(doc);

    if (!url) return null;

    if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url)) {
      return (
        <a href={url} target="_blank" rel="noreferrer">
          <img
            src={url}
            alt={doc?.name || doc?.title || "Document"}
            className="mt-3 h-40 w-full rounded-2xl object-cover"
          />
        </a>
      );
    }

    if (type.includes("pdf") || /\.pdf$/i.test(url)) {
      return (
        <div className="mt-3 overflow-hidden rounded-2xl border bg-white">
          <iframe
            src={url}
            title={doc?.name || "PDF Preview"}
            className="h-64 w-full"
          />
        </div>
      );
    }

    return (
      <div className="mt-3 rounded-2xl border bg-white p-3">
        <p className="text-sm text-gray-600">Preview not available.</p>
        <div className="mt-2">{renderDocumentLink(doc)}</div>
      </div>
    );
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
        <p className="mt-1 text-gray-600">
          Review providers, their services, uploaded documents, and profile photos.
        </p>
        {error ? (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="mb-5">
            <Input
              placeholder="Search provider, service, or document..."
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
                const providerName = getProviderName(p);
                const providerEmail = getProviderEmail(p);
                const providerPhoto = getProviderPhoto(p);
                const providerServices = Array.isArray(p.services) ? p.services : [];
                const providerDocuments = Array.isArray(p.documents) ? p.documents : [];
                const isPending = p.status !== "approved";

                return (
                  <div
                    key={p._id}
                    onClick={() => openProvider(p)}
                    className="cursor-pointer rounded-3xl border bg-white p-5 shadow-sm transition hover:shadow-md"
                  >
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
                          <p className="mt-2 text-sm font-medium">
                            Status:{" "}
                            <span
                              className={
                                p.status === "approved" ? "text-green-600" : "text-yellow-600"
                              }
                            >
                              {p.status || "Pending"}
                            </span>
                          </p>
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
                          {providerServices.slice(0, 3).map((s, index) => {
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

                          {providerServices.length > 3 && (
                            <p className="text-sm text-gray-500">
                              +{providerServices.length - 3} more services
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-5">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">Documents</h4>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                          {providerDocuments.length}
                        </span>
                      </div>

                      {providerDocuments.length === 0 ? (
                        <p className="text-sm text-gray-500">No documents found</p>
                      ) : (
                        <div className="space-y-3">
                          {providerDocuments.slice(0, 2).map((d, index) => {
                            const documentId = d._id || d.id || `${p._id}-doc-${index}`;
                            return (
                              <div
                                key={documentId}
                                className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {d.name || d.title || d.fileName || "Unnamed document"}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {d.type || d.category || d.mimeType || "Document"}
                                    </p>
                                  </div>

                                  <div className="text-right text-sm text-gray-600">
                                    {renderDocumentLink(d)}
                                  </div>
                                </div>

                                {renderDocumentPreview(d)}
                              </div>
                            );
                          })}

                          {providerDocuments.length > 2 && (
                            <p className="text-sm text-gray-500">
                              +{providerDocuments.length - 2} more documents
                            </p>
                          )}
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
            className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-2xl border bg-gray-100">
                  {getProviderPhoto(selectedProvider) ? (
                    <img
                      src={getProviderPhoto(selectedProvider)}
                      alt={getProviderName(selectedProvider)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-gray-500">
                      {getProviderName(selectedProvider)
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0]?.toUpperCase())
                        .join("") || "P"}
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {getProviderName(selectedProvider)}
                  </h2>
                  <p className="text-sm text-gray-500">{getProviderEmail(selectedProvider)}</p>
                </div>
              </div>

              <button
                onClick={closeProvider}
                className="rounded-full px-3 py-1 text-2xl leading-none text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {renderField("Provider ID", selectedProvider._id)}
              {renderField("Status", selectedProvider.status || "Pending")}
              {renderField("Phone", selectedProvider.basicInfo?.phone || selectedProvider.phone)}
              {renderField("Location", selectedProvider.basicInfo?.location || selectedProvider.location)}
              {renderField("Category", selectedProvider.basicInfo?.category || selectedProvider.category)}
              {renderField(
                "Created At",
                selectedProvider.createdAt
                  ? new Date(selectedProvider.createdAt).toLocaleString()
                  : selectedProvider.basicInfo?.createdAt
              )}
              {renderField(
                "Updated At",
                selectedProvider.updatedAt
                  ? new Date(selectedProvider.updatedAt).toLocaleString()
                  : selectedProvider.basicInfo?.updatedAt
              )}
              {renderField("Role", selectedProvider.role || "provider")}
            </div>

            {selectedProvider.basicInfo && (
              <div className="mt-6">
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Basic Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {renderField("Full Name", selectedProvider.basicInfo.fullName)}
                  {renderField("Business Name", selectedProvider.basicInfo.businessName)}
                  {renderField("Provider Name", selectedProvider.basicInfo.providerName)}
                  {renderField("Email", selectedProvider.basicInfo.email)}
                  {renderField("Phone", selectedProvider.basicInfo.phone)}
                  {renderField("Address", selectedProvider.basicInfo.address)}
                  {renderField("City", selectedProvider.basicInfo.city)}
                  {renderField("State", selectedProvider.basicInfo.state)}
                  {renderField("Country", selectedProvider.basicInfo.country)}
                  {renderField("Website", selectedProvider.basicInfo.website)}
                  {renderField("Bio / Description", selectedProvider.basicInfo.bio)}
                </div>
              </div>
            )}

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Services</h3>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  {Array.isArray(selectedProvider.services) ? selectedProvider.services.length : 0}
                </span>
              </div>

              {Array.isArray(selectedProvider.services) && selectedProvider.services.length > 0 ? (
                <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                  {selectedProvider.services.map((s, index) => {
                    const serviceId = s._id || s.id || `${selectedProvider._id}-${index}`;
                    return (
                      <div
                        key={serviceId}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900">{s.name || "Unnamed service"}</p>
                            <p className="text-sm text-gray-500">
                              {s.description || "No description"}
                            </p>
                          </div>
                          <div className="text-right text-sm font-semibold text-gray-900">
                            {s.price ?? s.cost ?? "-"}
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {s.duration && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium text-gray-900">Duration:</span>{" "}
                              {s.duration}
                            </div>
                          )}
                          {s.category && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium text-gray-900">Category:</span>{" "}
                              {s.category}
                            </div>
                          )}
                          {s.location && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium text-gray-900">Location:</span>{" "}
                              {s.location}
                            </div>
                          )}
                          {s.status && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium text-gray-900">Status:</span> {s.status}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No services found.</p>
              )}
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  {Array.isArray(selectedProvider.documents) ? selectedProvider.documents.length : 0}
                </span>
              </div>

              {Array.isArray(selectedProvider.documents) && selectedProvider.documents.length > 0 ? (
                <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                  {selectedProvider.documents.map((doc, index) => {
                    const documentId = doc._id || doc.id || `${selectedProvider._id}-doc-${index}`;

                    return (
                      <div
                        key={documentId}
                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {doc.name || doc.title || doc.fileName || "Unnamed document"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {doc.type || doc.category || doc.mimeType || "Document"}
                            </p>
                          </div>

                          <div className="text-right text-sm text-gray-600">
                            {renderDocumentLink(doc)}
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {doc.size !== undefined && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium text-gray-900">Size:</span>{" "}
                              {Math.round((doc.size / 1024) * 10) / 10} KB
                            </div>
                          )}
                        </div>

                        {renderDocumentPreview(doc)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No documents found.</p>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-end">
              <Button onClick={closeProvider} variant="outline">
                Close
              </Button>
              {selectedProvider.status !== "approved" && (
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
        </div>
      )}
    </div>
  );
}