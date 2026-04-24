import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createDispute, getMyDisputes } from "../api/disputeApi";

const CATEGORY_OPTIONS = [
  { value: "no_show", label: "No show" },
  { value: "poor_quality", label: "Poor quality" },
  { value: "scope_mismatch", label: "Scope mismatch" },
  { value: "payment_issue", label: "Payment issue" },
  { value: "damage", label: "Damage" },
  { value: "other", label: "Other" },
];

const STATUS_STYLES = {
  open: "bg-amber-50 text-amber-700 border-amber-200",
  responded: "bg-blue-50 text-blue-700 border-blue-200",
  under_review: "bg-purple-50 text-purple-700 border-purple-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
  closed: "bg-slate-50 text-slate-700 border-slate-200",
};

const CATEGORY_LABELS = CATEGORY_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

export default function Disputes() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    jobId: "",
    category: "other",
    reason: "",
    description: "",
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await getMyDisputes();
      setData(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Load disputes failed:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load disputes"
      );
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();

    const jobId = form.jobId.trim();
    const reason = form.reason.trim();
    const description = form.description.trim();

    if (!jobId || !reason || !description || saving) return;

    setSaving(true);
    setError("");

    try {
      await createDispute({
        jobId,
        category: form.category,
        reason,
        description,
      });

      setForm({
        jobId: "",
        category: "other",
        reason: "",
        description: "",
      });

      await load();
    } catch (err) {
      console.error("Create dispute failed:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to open dispute"
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredDisputes = useMemo(() => {
    const q = search.trim().toLowerCase();

    return data.filter((d) => {
      const matchesSearch =
        !q ||
        d?.reason?.toLowerCase?.().includes(q) ||
        d?.category?.toLowerCase?.().includes(q) ||
        d?.description?.toLowerCase?.().includes(q) ||
        d?.status?.toLowerCase?.().includes(q) ||
        d?._id?.toLowerCase?.().includes(q) ||
        d?.jobId?._id?.toLowerCase?.().includes(q);

      const matchesStatus =
        statusFilter === "all" || d?.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [data, search, statusFilter]);

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-2">
        <h2 className="text-3xl font-bold text-gray-900">My Disputes</h2>
        <p className="text-sm text-gray-600">
          Open a dispute for a booking, or review disputes you already created.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={submit}
        className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Open a dispute</h3>
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={loading || saving}
          >
            Refresh
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-1">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Booking ID
            </label>
            <input
              value={form.jobId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, jobId: e.target.value }))
              }
              placeholder="Paste booking ID here"
              required
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 outline-none transition focus:border-sky-500"
            />
          </div>

          <div className="md:col-span-1">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, category: e.target.value }))
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 outline-none transition focus:border-sky-500"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Reason
            </label>
            <input
              value={form.reason}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder="Short summary of the issue..."
              maxLength={500}
              required
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 outline-none transition focus:border-sky-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Describe the issue clearly..."
              rows={5}
              required
              className="w-full resize-y rounded-xl border border-gray-300 bg-white px-3 py-3 outline-none transition focus:border-sky-500"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Creating..." : "Open dispute"}
          </button>

          <div className="text-sm text-gray-500">
            You can open a dispute only for a booking you are part of.
          </div>
        </div>
      </form>

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Search
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reason, category, status, booking ID..."
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 outline-none transition focus:border-sky-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Filter by status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 outline-none transition focus:border-sky-500"
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="responded">Responded</option>
              <option value="under_review">Under review</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-600 shadow-sm">
          Loading...
        </div>
      ) : filteredDisputes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600 shadow-sm">
          No disputes found.
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredDisputes.map((d) => (
            <Link
              key={d._id}
              to={`/disputes/${d._id}`}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {d.reason || CATEGORY_LABELS[d.category] || "Dispute"}
                    </h3>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        STATUS_STYLES[d.status] || STATUS_STYLES.closed
                      }`}
                    >
                      {d.status || "unknown"}
                    </span>
                  </div>

                  <p className="mb-2 text-sm text-gray-500">
                    {CATEGORY_LABELS[d.category] || d.category || "Unknown category"}
                  </p>

                  <p className="line-clamp-2 text-sm text-gray-600">
                    {d.description || "No description provided."}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>
                      Booking:{" "}
                      {d.jobId?._id ? d.jobId._id : d.jobId || "Unknown"}
                    </span>
                    <span>
                      Created:{" "}
                      {d.createdAt
                        ? new Date(d.createdAt).toLocaleString()
                        : "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="text-sm font-medium text-sky-600">
                  View details →
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}