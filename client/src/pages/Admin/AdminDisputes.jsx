// src/pages/admin/AdminDisputes.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaCheck,
  FaClock,
  FaFilter,
  FaSearch,
  FaSyncAlt,
  FaTimes,
  FaShieldAlt,
} from "react-icons/fa";
import {
  getAdminDisputes,
  resolveDispute,
  closeDispute,
} from "../../api/disputeApi";

const STATUS_FILTERS = ["all", "open", "responded", "in_review", "resolved", "closed", "rejected"];

const CATEGORY_LABELS = {
  no_show: "No Show",
  poor_quality: "Poor Quality",
  scope_mismatch: "Scope Mismatch",
  payment_issue: "Payment Issue",
  damage: "Damage / Loss",
  other: "Other",
};

const STATUS_STYLES = {
  open: "bg-amber-50 text-amber-700 border-amber-200",
  responded: "bg-indigo-50 text-indigo-700 border-indigo-200",
  in_review: "bg-sky-50 text-sky-700 border-sky-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-slate-100 text-slate-700 border-slate-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

const OUTCOMES = [
  { value: "customer_favored", label: "Customer Favored" },
  { value: "provider_favored", label: "Provider Favored" },
  { value: "neutral", label: "Neutral" },
];

const normalize = (value) => String(value || "").trim().toLowerCase();

const formatDate = (value, withTime = false) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return withTime ? date.toLocaleString() : date.toLocaleDateString();
};

const getCategoryLabel = (category) =>
  CATEGORY_LABELS[normalize(category)] || category || "Unspecified";

const getStatusLabel = (status) => {
  const s = normalize(status);
  if (s === "in_review") return "In Review";
  if (s === "responded") return "Responded";
  if (s === "customer_favored") return "Customer Favored";
  if (s === "provider_favored") return "Provider Favored";
  if (s === "neutral") return "Neutral";
  return status || "Unknown";
};

const getDescription = (d) =>
  d?.description || d?.issue || d?.message || d?.reason || "No description provided";

const StatPill = ({ label, value }) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-[#d7e2ea] bg-white/90 px-4 py-2 text-sm text-[#334155] shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
    <span className="font-semibold text-[#64748b]">{label}</span>
    <span className="font-bold text-[#0f172a]">{value}</span>
  </div>
);

const StatusBadge = ({ status }) => {
  const key = normalize(status);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
        STATUS_STYLES[key] || "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
      {getStatusLabel(status)}
    </span>
  );
};

const FieldLabel = ({ children }) => (
  <label className="mb-1 block text-sm font-medium text-slate-700">{children}</label>
);

const Th = ({ children, align = "left" }) => {
  const alignClass = align === "right" ? "text-right" : "text-left";
  return (
    <th
      className={`px-5 py-4 ${alignClass} text-xs font-semibold uppercase tracking-wider text-slate-500`}
    >
      {children}
    </th>
  );
};

export default function AdminDisputes() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [resolveData, setResolveData] = useState({
    outcome: "",
    note: "",
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAdminDisputes();
      setData(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Load admin disputes error:", err?.response?.data || err);
      setError(err?.response?.data?.message || err?.message || "Failed to load disputes");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const d of data) {
      const key = normalize(d.category) || "other";
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [data]);

  const categoryFilters = useMemo(() => {
    const keys = Object.keys(categoryCounts).sort();
    return ["all", ...keys];
  }, [categoryCounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return data.filter((d) => {
      const status = normalize(d.status);
      const category = normalize(d.category);

      const matchesStatus =
        statusFilter === "all" || status === normalize(statusFilter);

      const matchesCategory =
        categoryFilter === "all" || category === normalize(categoryFilter);

      const haystack = [
        d._id,
        d.category,
        d.status,
        d.description,
        d.issue,
        d.message,
        d.reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !q || haystack.includes(q);

      return matchesStatus && matchesCategory && matchesQuery;
    });
  }, [data, statusFilter, categoryFilter, query]);

  const stats = useMemo(() => {
    const total = data.length;
    const open = data.filter((d) => normalize(d.status) === "open").length;
    const responded = data.filter((d) => normalize(d.status) === "responded").length;
    const review = data.filter((d) => normalize(d.status) === "in_review").length;
    const resolved = data.filter((d) => normalize(d.status) === "resolved").length;
    const closed = data.filter((d) => normalize(d.status) === "closed").length;
    return { total, open, responded, review, resolved, closed };
  }, [data]);

  const clearSelection = () => {
    setSelected(null);
    setResolveData({ outcome: "", note: "" });
  };

  const handleResolve = async () => {
    if (!selected) return;

    if (!resolveData.outcome) {
      alert("Please select an outcome.");
      return;
    }

    setBusyId(selected._id);

    try {
      const updated = await resolveDispute(selected._id, resolveData);

      setData((prev) =>
        prev.map((d) => (d._id === selected._id ? updated : d))
      );
      setSelected(updated);
      setResolveData({ outcome: "", note: "" });
    } catch (err) {
      console.error("Resolve dispute error:", err?.response?.data || err);
      alert(err?.response?.data?.message || err?.message || "Failed to resolve dispute");
    } finally {
      setBusyId(null);
    }
  };

  const handleClose = async (id) => {
    if (!window.confirm("Close this dispute?")) return;

    setBusyId(id);

    try {
      const updated = await closeDispute(id);

      setData((prev) => prev.map((d) => (d._id === id ? updated : d)));
      if (selected?._id === id) setSelected(updated);
    } catch (err) {
      console.error("Close dispute error:", err?.response?.data || err);
      alert(err?.response?.data?.message || err?.message || "Failed to close dispute");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f4f7fb] via-[#f8fafc] to-[#fff4e8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-24 top-10 h-56 w-56 rounded-full bg-[#0f172a]/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-32 h-64 w-64 rounded-full bg-[#0ea5e9]/15 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-[#f59e0b]/20 blur-[140px]" />

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[28px] border border-[#dde6ee] bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                <FaShieldAlt />
                Admin Panel
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f172a] sm:text-4xl">
                Disputes
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Review disputes by category, inspect the case, resolve outcomes, and close cases cleanly.
              </p>
            </div>

            <button
              onClick={load}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition hover:bg-slate-50"
            >
              <FaSyncAlt className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <StatPill label="Total" value={stats.total} />
          <StatPill label="Open" value={stats.open} />
          <StatPill label="Responded" value={stats.responded} />
          <StatPill label="Review" value={stats.review} />
          <StatPill label="Resolved" value={stats.resolved} />
          <StatPill label="Closed" value={stats.closed} />
        </div>

        <div className="rounded-[28px] border border-[#dde6ee] bg-white/90 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search dispute text..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    statusFilter === f
                      ? "bg-slate-900 text-white shadow-[0_10px_25px_rgba(15,23,42,0.16)]"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <FaFilter className="text-[11px]" />
                  {f === "all" ? "All Statuses" : getStatusLabel(f)}
                </button>
              ))}

              <button
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {categoryFilters.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  categoryFilter === cat
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{cat === "all" ? "All Categories" : getCategoryLabel(cat)}</span>
                {cat !== "all" ? (
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px]">
                    {categoryCounts[normalize(cat)] || 0}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <div className="flex items-center justify-between gap-3">
              <span>{error}</span>
              <button
                onClick={load}
                className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                Retry
              </button>
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-[24px] border border-[#dde6ee] bg-white/90 p-10 text-center shadow-[0_16px_45px_rgba(15,23,42,0.1)]">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
              <FaSyncAlt className="animate-spin" />
              Loading disputes...
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-12 text-center shadow-[0_16px_45px_rgba(15,23,42,0.1)]">
            <p className="text-lg font-semibold text-slate-800">No disputes found</p>
            <p className="mt-1 text-sm text-slate-500">
              Try another search or category.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-[#dde6ee] bg-white/90 shadow-[0_16px_45px_rgba(15,23,42,0.12)]">
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-50/80">
                  <tr className="border-b border-slate-200/80">
                    <Th>Category</Th>
                    <Th>Description</Th>
                    <Th>Created</Th>
                    <Th>Status</Th>
                    <Th align="right">Action</Th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((d) => (
                    <tr
                      key={d._id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4 align-top">
                        <button
                          onClick={() => setSelected(d)}
                          className="text-left"
                        >
                          <div className="font-semibold text-slate-900">
                            {getCategoryLabel(d.category)}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">ID: {d._id}</div>
                        </button>
                      </td>

                      <td className="px-5 py-4 align-top text-sm text-slate-700">
                        <div className="max-w-[520px] line-clamp-2">
                          {getDescription(d)}
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top text-sm text-slate-700">
                        <div>{formatDate(d.createdAt)}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatDate(d.createdAt, true)}
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <StatusBadge status={d.status} />
                      </td>

                      <td className="px-5 py-4 align-top text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setSelected(d)}
                            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Review
                          </button>
                          <Link
                            to={`/admin/disputes/${d._id}`}
                            className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            Open
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 lg:hidden">
              {filtered.map((d) => (
                <div
                  key={d._id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => setSelected(d)} className="text-left">
                      <div className="text-base font-semibold text-slate-900">
                        {getCategoryLabel(d.category)}
                      </div>
                      <div className="mt-1 text-sm text-slate-500 line-clamp-2">
                        {getDescription(d)}
                      </div>
                    </button>
                    <StatusBadge status={d.status} />
                  </div>

                  <div className="mt-3 text-sm text-slate-700">
                    <div>{formatDate(d.createdAt, true)}</div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelected(d)}
                      className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Review
                    </button>
                    <Link
                      to={`/admin/disputes/${d._id}`}
                      className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[28px] border border-[#e2e8f0] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.35)]">
              <button
                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
                onClick={clearSelection}
                disabled={busyId === selected._id}
                aria-label="Close"
              >
                <FaTimes />
              </button>

            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-4 pr-12">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Dispute review
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">
                    Dispute Details
                  </h2>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Focused on the category, description, and resolution.
              </p>
            </div>

            <div className="mt-5 max-h-[calc(90vh-150px)] space-y-4 overflow-y-auto pr-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <FieldLabel>Category</FieldLabel>
                  <div className="text-lg font-semibold text-slate-900">
                    {getCategoryLabel(selected.category)}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <FieldLabel>Created</FieldLabel>
                  <div className="text-sm text-slate-700">
                    {formatDate(selected.createdAt, true)}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <FieldLabel>Description</FieldLabel>
                <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {getDescription(selected)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-lg font-bold text-slate-900">Resolve dispute</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Choose an outcome and add an admin note if needed.
                </p>

                <div className="mt-4 space-y-4">
                  <div>
                    <FieldLabel>Outcome</FieldLabel>
                    <select
                      value={resolveData.outcome}
                      onChange={(e) =>
                        setResolveData((prev) => ({
                          ...prev,
                          outcome: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                      disabled={busyId === selected._id}
                    >
                      <option value="">Select outcome</option>
                      {OUTCOMES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <FieldLabel>Admin note</FieldLabel>
                    <textarea
                      value={resolveData.note}
                      onChange={(e) =>
                        setResolveData((prev) => ({
                          ...prev,
                          note: e.target.value,
                        }))
                      }
                      rows={4}
                      placeholder="Optional note for the resolution..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                      disabled={busyId === selected._id}
                    />
                  </div>

                  <button
                    onClick={handleResolve}
                    disabled={busyId === selected._id}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FaCheck />
                    {busyId === selected._id ? "Resolving..." : "Resolve Dispute"}
                  </button>
                </div>
              </div>

              {normalize(selected.status) !== "closed" && (
                <button
                  onClick={() => handleClose(selected._id)}
                  disabled={busyId === selected._id}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FaTimes />
                  {busyId === selected._id ? "Closing..." : "Close Dispute"}
                </button>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={clearSelection}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Close Window
                </button>
                <Link
                  to={`/admin/disputes/${selected._id}`}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Open full dispute page
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}