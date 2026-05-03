// src/pages/provider/ProviderJobs.jsx
import { memo, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTimes,
  FaMapMarkerAlt,
  FaExclamationTriangle,
  FaSearch,
  FaBoxOpen,
  FaFilter,
  FaClock,
  FaBriefcase,
  FaHourglassHalf,
  FaCheckCircle,
  FaTimesCircle,
  FaUser,
  FaMoneyBillWave,
  FaPhone,
  FaTag,
  FaExpand,
  FaCompress,
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.jsx";
import Chat from "../../components/Chat/Chat.jsx";
import { createDispute } from "../../api/disputeApi.js";

import {
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const DISPUTE_OPTIONS = [
  { value: "no_show", label: "Other party did not show up" },
  { value: "poor_quality", label: "Poor service quality" },
  { value: "scope_mismatch", label: "Scope mismatch" },
  { value: "payment_issue", label: "Payment issue" },
  { value: "damage", label: "Damage or loss" },
  { value: "other", label: "Other" },
];

const FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "completed", label: "Completed" },
];

const STATUS_META = {
  pending: {
    label: "Pending",
    className: "bg-yellow-50 text-yellow-700 ring-yellow-200",
    icon: FaHourglassHalf,
  },
  accepted: {
    label: "Accepted",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
    icon: FaBriefcase,
  },
  in_progress: {
    label: "In progress",
    className: "bg-purple-50 text-purple-700 ring-purple-200",
    icon: FaBriefcase,
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    icon: FaCheckCircle,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
    icon: FaTimesCircle,
  },
  rejected: {
    label: "Rejected",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
    icon: FaTimesCircle,
  },
};

/* ================= Leaflet Fix ================= */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/* ================= Utils ================= */
const formatKES = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const toFiniteNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const getBookingCoords = (job) => {
  if (Number.isFinite(job?.lat) && Number.isFinite(job?.lng)) {
    return { lat: job.lat, lng: job.lng };
  }

  const coords = job?.locationCoords?.coordinates;
  if (Array.isArray(coords) && coords.length === 2) {
    const lng = toFiniteNumber(coords[0]);
    const lat = toFiniteNumber(coords[1]);
    if (lat != null && lng != null) return { lat, lng };
  }

  return null;
};

const getProviderCoords = (provider) => {
  if (!provider) return null;

  const coords =
    provider?.location?.coordinates ||
    provider?.locationGeoJSON?.coordinates ||
    provider?.coordinates ||
    [];

  if (Array.isArray(coords) && coords.length === 2) {
    const lng = toFiniteNumber(coords[0]);
    const lat = toFiniteNumber(coords[1]);
    if (lat != null && lng != null) return { lat, lng };
  }

  if (Number.isFinite(provider?.lat) && Number.isFinite(provider?.lng)) {
    return { lat: provider.lat, lng: provider.lng };
  }

  return null;
};

const getDisputeIdFromJob = (job) =>
  job?.disputeId?._id || job?.disputeId || job?.dispute?._id || null;

export default function ProviderJobs() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [modalJob, setModalJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [error, setError] = useState("");
  const [providerCoords, setProviderCoords] = useState(null);
  const [disputeBusyId, setDisputeBusyId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const jobsPerPage = 6;

  const [disputeJob, setDisputeJob] = useState(null);
  const [disputeData, setDisputeData] = useState({
    category: "",
    issue: "",
  });

  const resetDisputeModal = () => {
    setDisputeJob(null);
    setDisputeData({
      category: "",
      issue: "",
    });
  };

  /* ================= Fetch Provider ================= */
  const fetchProviderProfile = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API}/providers/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const data = await res.json();
      setProviderCoords(getProviderCoords(data));
    } catch (err) {
      console.error("Fetch provider profile error:", err);
      setProviderCoords(null);
    }
  };

  /* ================= Fetch Jobs ================= */
  const fetchJobs = async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/bookings/provider`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load jobs");
      }

      setJobs(data.bookings || []);
    } catch (err) {
      console.error("Fetch jobs error:", err);
      setError(err?.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviderProfile();
    fetchJobs();
  }, [token]);

  /* ================= Keep modal in sync ================= */
  useEffect(() => {
    if (!modalJob?._id) return;

    const updated = jobs.find((job) => job._id === modalJob._id);
    if (updated) {
      setModalJob(updated);
    }
  }, [jobs, modalJob?._id]);

  /* ================= Status Update ================= */
  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API}/bookings/${id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to update booking status");
      }

      const updatedBooking = data.booking;

      setJobs((prev) => prev.map((j) => (j._id === id ? updatedBooking : j)));

      if (modalJob?._id === id) {
        setModalJob(updatedBooking);
      }
    } catch (err) {
      console.error("Update status error:", err);
      setError(err?.message || "Failed to update booking status");
    }
  };

  /* ================= Dispute ================= */
  const openDisputeFromJob = (job) => {
    if (!job?._id) return;

    const existingDisputeId = getDisputeIdFromJob(job);

    if (existingDisputeId) {
      navigate(`/provider/disputes/${existingDisputeId}`);
      return;
    }

    setDisputeJob(job);
    setDisputeData({
      category: "",
      issue: "",
    });
  };

  const submitDispute = async () => {
    if (!disputeJob) return;

    if (!disputeData.category) {
      alert("Please select a reason for the dispute.");
      return;
    }

    if (!disputeData.issue.trim()) {
      alert("Please describe the issue.");
      return;
    }

    const serviceName = disputeJob.serviceName || disputeJob.service?.name || "Job";
    const customerName = disputeJob.customer?.name || "Customer";
    const providerName =
      user?.name ||
      user?.basicInfo?.providerName ||
      "Provider";

    const fullDescription = `Service: ${serviceName}
Provider: ${providerName}
Customer: ${customerName}

Issue: ${disputeData.issue.trim()}`;

    setDisputeBusyId(disputeJob._id);

    try {
      const disputeResult = await createDispute({
        jobId: disputeJob._id,
        category: disputeData.category,
        description: fullDescription,
      });

      const dispute = disputeResult?.data || disputeResult;
      const disputeId = dispute?._id || dispute?.id;

      if (!disputeId) {
        throw new Error("Invalid dispute response");
      }

      setJobs((prev) =>
        prev.map((j) =>
          j._id === disputeJob._id
            ? {
                ...j,
                disputeId,
                hasDispute: true,
                disputeStatus: dispute?.status || j.disputeStatus || "open",
              }
            : j
        )
      );

      if (modalJob?._id === disputeJob._id) {
        setModalJob((prev) =>
          prev
            ? {
                ...prev,
                disputeId,
                hasDispute: true,
                disputeStatus: dispute?.status || prev.disputeStatus || "open",
              }
            : prev
        );
      }

      resetDisputeModal();
      navigate(`/provider/disputes/${disputeId}`);
    } catch (err) {
      console.error("Open dispute error:", err);
      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to open dispute"
      );
    } finally {
      setDisputeBusyId(null);
    }
  };

  const modalCoords = getBookingCoords(modalJob);

  const closeModal = () => {
    setModalJob(null);
    setShowChat(false);
  };

  const renderDisputeButtonLabel = (job) => {
    const disputeId = getDisputeIdFromJob(job);
    if (disputeId) return "View Dispute";
    if (disputeBusyId === job._id) return "Opening...";
    return "Raise Dispute";
  };

  const disputeServiceName =
    disputeJob?.serviceName || disputeJob?.service?.name || "Job";
  const disputeCustomerName = disputeJob?.customer?.name || "Customer";
  const disputeProviderName =
    user?.name || user?.basicInfo?.providerName || "Provider";

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  useEffect(() => {
    if (!modalJob) {
      setDetailsLoading(false);
      return;
    }

    setDetailsLoading(true);
    const timer = setTimeout(() => {
      setDetailsLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [modalJob]);

  useEffect(() => {
    if (!modalJob) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalJob]);

  const filteredJobs = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return jobs.filter((job) => {
      const statusMatch =
        activeTab === "all" ? true : job.status === activeTab;

      if (!statusMatch) return false;

      if (!normalizedQuery) return true;

      const searchTarget = [
        job.serviceName,
        job.service?.name,
        job.customer?.name,
        job.location,
        job.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchTarget.includes(normalizedQuery);
    });
  }, [jobs, activeTab, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / jobsPerPage));
  const pagedJobs = useMemo(() => {
    const start = (currentPage - 1) * jobsPerPage;
    return filteredJobs.slice(start, start + jobsPerPage);
  }, [filteredJobs, currentPage, jobsPerPage]);

  const statusCounts = useMemo(() => {
    return jobs.reduce(
      (acc, job) => {
        const status = job.status || "unknown";
        acc[status] = (acc[status] || 0) + 1;
        acc.all += 1;
        return acc;
      },
      { all: 0 }
    );
  }, [jobs]);

  /* ================= UI ================= */
  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-amber-50 p-4 text-slate-900 md:p-6">
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-slate-200/60 bg-white/80 px-4 py-4 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Provider Dashboard
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              My Jobs
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track active work, respond quickly, and keep everything on schedule.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
            <div className="relative w-full sm:w-72">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search jobs, customers, locations..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:flex">
              <FaFilter className="text-slate-400" />
              Quick Filters
            </div>
          </div>
        </div>

        <JobFilters
          tabs={FILTER_TABS}
          activeTab={activeTab}
          counts={statusCounts}
          onTabChange={setActiveTab}
        />
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <JobSkeletonGrid />
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          description="New requests will show up here as soon as customers book you."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pagedJobs.map((job) => (
            <JobCard
              key={job._id}
              job={job}
              onView={() => {
                setModalJob(job);
                setShowChat(false);
              }}
              onAccept={() => updateStatus(job._id, "accepted")}
              onReject={() => updateStatus(job._id, "cancelled")}
              onComplete={() => updateStatus(job._id, "completed")}
            />
          ))}
        </div>
      )}

      {!loading && filteredJobs.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {modalJob && (
        <JobDetailsModal
          job={modalJob}
          isLoading={detailsLoading}
          providerLocation={providerCoords}
          customerLocation={modalCoords}
          onClose={closeModal}
          onAccept={() => updateStatus(modalJob._id, "accepted")}
          onReject={() => updateStatus(modalJob._id, "cancelled")}
          onComplete={() => updateStatus(modalJob._id, "completed")}
          onChat={() => setShowChat(true)}
          onDispute={() => openDisputeFromJob(modalJob)}
          disputeBusy={disputeBusyId === modalJob._id}
          showChat={showChat}
          token={token}
        />
      )}

      {disputeJob && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <button
              className="absolute right-4 top-4 text-gray-400 transition hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={resetDisputeModal}
              disabled={disputeBusyId === disputeJob._id}
            >
              <FaTimes />
            </button>

            <h2 className="text-xl font-bold text-gray-900">Raise a Dispute</h2>
            <p className="mt-1 text-sm text-gray-500">
              Select the category and describe the issue clearly.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <FieldLabel label="Category" />
                <select
                  value={disputeData.category}
                  onChange={(e) =>
                    setDisputeData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  disabled={disputeBusyId === disputeJob._id}
                >
                  <option value="">Select category</option>
                  {DISPUTE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel label="Description" />
                <textarea
                  value={disputeData.issue}
                  onChange={(e) =>
                    setDisputeData((prev) => ({
                      ...prev,
                      issue: e.target.value,
                    }))
                  }
                  placeholder="Describe what happened..."
                  rows={5}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none transition placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  disabled={disputeBusyId === disputeJob._id}
                />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-900">
                  Service and parties involved
                </p>
                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="font-medium text-gray-900">Service:</span>{" "}
                    {disputeServiceName}
                  </p>
                  <p>
                    <span className="font-medium text-gray-900">Provider:</span>{" "}
                    {disputeProviderName}
                  </p>
                  <p>
                    <span className="font-medium text-gray-900">Customer:</span>{" "}
                    {disputeCustomerName}
                  </p>
                </div>
              </div>

              <button
                className="w-full rounded-xl bg-amber-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={submitDispute}
                disabled={disputeBusyId === disputeJob._id}
              >
                {disputeBusyId === disputeJob._id
                  ? "Submitting..."
                  : "Submit Dispute"}
              </button>

              <button
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={resetDisputeModal}
                disabled={disputeBusyId === disputeJob._id}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- UI HELPERS ---------- */

const FieldLabel = ({ label }) => (
  <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
);

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 text-slate-400">
      <Icon />
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  </div>
);

const RouteLayer = ({ providerLocation, customerLocation, onStateChange }) => {
  const map = useMap();

  useEffect(() => {
    if (!providerLocation || !customerLocation) return undefined;

    const providerIcon = L.icon({
      iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
    const customerIcon = L.icon({
      iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    const control = L.Routing.control({
      waypoints: [
        L.latLng(providerLocation.lat, providerLocation.lng),
        L.latLng(customerLocation.lat, customerLocation.lng),
      ],
      router: L.Routing.osrmv1({ serviceUrl: "https://router.project-osrm.org/route/v1" }),
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      show: false,
      lineOptions: {
        styles: [{ color: "#2563eb", weight: 6, opacity: 0.9 }],
      },
      createMarker: (index, waypoint) =>
        L.marker(waypoint.latLng, {
          icon: index === 0 ? providerIcon : customerIcon,
        }),
    });

    control.on("routingstart", () => onStateChange?.({ loading: true, error: "" }));
    control.on("routesfound", (event) => {
      const summary = event?.routes?.[0]?.summary;
      const distanceKm = summary?.totalDistance
        ? summary.totalDistance / 1000
        : null;
      const durationMin = summary?.totalTime
        ? Math.round(summary.totalTime / 60)
        : null;
      onStateChange?.({
        loading: false,
        error: "",
        distanceKm,
        durationMin,
      });
    });
    control.on("routingerror", () =>
      onStateChange?.({ loading: false, error: "No route found for this job." })
    );

    control.addTo(map);

    const bounds = L.latLngBounds([
      [providerLocation.lat, providerLocation.lng],
      [customerLocation.lat, customerLocation.lng],
    ]);
    map.fitBounds(bounds, { padding: [30, 30] });

    return () => {
      map.removeControl(control);
    };
  }, [map, providerLocation, customerLocation, onStateChange]);

  return null;
};

const JobRouteMap = ({ providerLocation, customerLocation }) => {
  const [routeState, setRouteState] = useState({
    loading: false,
    error: "",
    distanceKm: null,
    durationMin: null,
  });
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapRef, setMapRef] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsMapReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Resize map when expanded
  useEffect(() => {
    if (!mapRef || !isMapExpanded) return;
    const timer = setTimeout(() => {
      mapRef.invalidateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [isMapExpanded, mapRef]);


  // Prevent background scroll when expanded
  useEffect(() => {
    if (isMapExpanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMapExpanded]);

  // Handle ESC key to close expanded map
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && isMapExpanded) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => undefined);
        }
        setIsMapExpanded(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isMapExpanded]);

  const handleMapToggle = async () => {
    try {
      const mapElement = document.querySelector("[data-map-element]");
      if (!isMapExpanded && mapElement?.requestFullscreen) {
        await mapElement.requestFullscreen();
        setIsMapExpanded(true);
        return;
      }

      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      setIsMapExpanded(false);
    } catch (err) {
      console.error("Map fullscreen toggle error:", err);
      setIsMapExpanded((prev) => !prev);
    }
  };

  if (!providerLocation || !customerLocation) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500 shadow-sm">
        Provider or customer coordinates are missing.
      </div>
    );
  }

  const mapContainer = (
    <div
      data-map-element
      className={`relative overflow-hidden bg-white transition-all duration-300 ease-in-out ${
        isMapExpanded
          ? "fixed inset-0 z-[100] w-screen h-screen rounded-none"
          : "relative w-full h-[300px] rounded-2xl"
      }`}
    >
      {/* Control Buttons */}
      <div className="absolute top-4 right-4 z-[1100] flex flex-col items-end gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={handleMapToggle}
          className="flex items-center gap-2 rounded-xl bg-white/95 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-800 border border-slate-200 shadow-xl transition-all duration-200 hover:bg-white hover:shadow-2xl"
          title={isMapExpanded ? "Exit full screen" : "Full screen"}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            {isMapExpanded ? (
              <path d="M5 3h6v2H5v6H3V3h2zm8 0h6v8h-2V5h-4V3zm-8 8h2v6H3v-6zm16 0h2v6h-6v-2h4v-4z" />
            ) : (
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
            )}
          </svg>
          <span>{isMapExpanded ? "Minimize" : "Full screen"}</span>
        </button>
      </div>

      {/* Loading State */}
      {!isMapReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100 text-sm text-slate-500">
          Loading map...
        </div>
      )}

      {/* Route Calculating State */}
      {routeState.loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-slate-500">
          Calculating route...
        </div>
      )}

      {/* Route Error State */}
      {routeState.error && !routeState.loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-slate-500">
          {routeState.error}
        </div>
      )}

      {/* Map Container */}
      {isMapReady && (
        <MapContainer
          center={[providerLocation.lat, providerLocation.lng]}
          zoom={13}
          scrollWheelZoom={false}
          className="h-full w-full"
          whenCreated={setMapRef}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <RouteLayer
            providerLocation={providerLocation}
            customerLocation={customerLocation}
            onStateChange={setRouteState}
          />
        </MapContainer>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {mapContainer}

      {/* Route Information Display */}
      {(routeState.distanceKm || routeState.durationMin) && !isMapExpanded && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {routeState.distanceKm != null && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {routeState.distanceKm.toFixed(1)} km
            </span>
          )}
          {routeState.durationMin != null && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {routeState.durationMin} min ETA
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const JobDetailsSkeleton = () => (
  <div className="space-y-6">
    <div className="h-6 w-2/3 rounded-full bg-slate-200" />
    <div className="grid gap-4 md:grid-cols-2">
      <div className="h-20 rounded-2xl bg-slate-200" />
      <div className="h-20 rounded-2xl bg-slate-200" />
      <div className="h-20 rounded-2xl bg-slate-200" />
      <div className="h-20 rounded-2xl bg-slate-200" />
    </div>
    <div className="h-64 rounded-2xl bg-slate-200" />
  </div>
);

const JobDetailsModal = memo(
  ({
    job,
    isLoading,
    providerLocation,
    customerLocation,
    onClose,
    onAccept,
    onReject,
    onComplete,
    onChat,
    onDispute,
    disputeBusy,
    showChat,
    token,
  }) => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl transition-all duration-300"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-full flex-col">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Job Details
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                {job.serviceName || job.service?.name || "Job Details"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-2xl text-gray-500 hover:bg-gray-100 rounded-full px-3 py-1"
              aria-label="Close job details"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {showChat ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <FaClock />
                  <span>
                    {job.scheduledAt
                      ? new Date(job.scheduledAt).toLocaleString()
                      : "Schedule pending"}
                  </span>
                </div>
                <div className="flex flex-col min-h-[420px] md:min-h-[500px] lg:min-h-[560px] border rounded-2xl bg-white">
                  <div className="flex-1 min-h-0 overflow-y-auto p-3">
                    <Chat bookingId={job._id} token={token} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-4 h-full">
                <div className="lg:w-1/2 min-w-0 flex flex-col gap-4 overflow-y-auto">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <FaClock />
                    <span>
                      {job.scheduledAt
                        ? new Date(job.scheduledAt).toLocaleString()
                        : "Schedule pending"}
                    </span>
                  </div>
                  <StatusBadge status={job.status} />

                  {isLoading ? (
                    <JobDetailsSkeleton />
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 p-4 shadow-sm">
                          <InfoRow
                            icon={FaUser}
                            label="Customer"
                            value={job.customer?.name || "Customer"}
                          />
                          {job.customer?.phone && (
                            <div className="mt-4">
                              <InfoRow
                                icon={FaPhone}
                                label="Phone"
                                value={job.customer?.phone}
                              />
                            </div>
                          )}
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 shadow-sm">
                          <InfoRow
                            icon={FaMapMarkerAlt}
                            label="Location"
                            value={job.location || "Location not provided"}
                          />
                          <div className="mt-4">
                            <InfoRow
                              icon={FaTag}
                              label="Category"
                              value={job.service?.category || job.category || "General"}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Description
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-700">
                          {job.notes || job.description || "No additional details provided."}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4 shadow-sm">
                        <InfoRow
                          icon={FaMoneyBillWave}
                          label="Price"
                          value={formatKES(job.price)}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="lg:w-1/2 min-w-0 flex flex-col gap-4">
                  <div className="rounded-2xl bg-white p-4 shadow-md">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Map Overview
                    </p>
                    <div className="mt-3 w-full">
                      <JobRouteMap
                        providerLocation={providerLocation}
                        customerLocation={customerLocation}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4 shadow-md">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Quick Summary
                    </p>
                    <div className="mt-4 space-y-3 text-sm text-slate-700">
                      <InfoRow
                        icon={FaMoneyBillWave}
                        label="Price"
                        value={formatKES(job.price)}
                      />
                      <InfoRow
                        icon={FaBriefcase}
                        label="Status"
                        value={STATUS_META[job.status]?.label || "Unknown"}
                      />
                      {job.distance && (
                        <InfoRow
                          icon={FaMapMarkerAlt}
                          label="Distance"
                          value={`${job.distance} km`}
                        />
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4 shadow-md">
                    {job.status !== "rejected" && (
                      <div className="flex flex-wrap gap-3 mt-4">
                        {job.status === "pending" && (
                          <>
                            <button
                              onClick={onAccept}
                              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-blue-700"
                            >
                              Accept Job
                            </button>
                            <button
                              onClick={onReject}
                              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition-all duration-300 hover:border-rose-300"
                            >
                              Reject Job
                            </button>
                            <button
                              onClick={onChat}
                              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-slate-800"
                            >
                              Open Chat
                            </button>
                          </>
                        )}

                        {job.status === "accepted" && (
                          <>
                            <button
                              onClick={onComplete}
                              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-emerald-700"
                            >
                              Mark as Completed
                            </button>
                            <button
                              onClick={onChat}
                              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-slate-800"
                            >
                              Open Chat
                            </button>
                            <button
                              onClick={onReject}
                              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition-all duration-300 hover:border-rose-300"
                            >
                              Reject Job
                            </button>
                          </>
                        )}

                        {job.status === "completed" && (
                          <>
                            <button
                              onClick={onChat}
                              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-blue-700"
                            >
                              Open Chat
                            </button>
                            <button
                              onClick={onDispute}
                              disabled={disputeBusy}
                              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {disputeBusy ? "Opening..." : "Raise Dispute"}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
);

const JobFilters = memo(({ tabs, activeTab, counts, onTabChange }) => (
  <div className="mt-4 flex flex-wrap gap-2">
    {tabs.map((tab) => {
      const isActive = activeTab === tab.value;
      const count = counts?.[tab.value] ?? 0;

      return (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
            isActive
              ? "border-sky-200 bg-sky-50 text-sky-700"
              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
          }`}
        >
          <span>{tab.label}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isActive
                ? "bg-sky-100 text-sky-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {count}
          </span>
        </button>
      );
    })}
  </div>
));

const StatusBadge = memo(({ status }) => {
  const meta = STATUS_META[status] || {
    label: status || "Unknown",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
    icon: FaBriefcase,
  };

  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
        meta.className
      }`}
    >
      <Icon className="text-[11px]" />
      {meta.label}
    </span>
  );
});

const JobCard = memo(({ job, onView, onAccept, onReject, onComplete }) => {
  return (
    <div className="group flex h-full flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition duration-200 hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {job.serviceName || job.service?.name || "Job"}
          </h3>
          <p className="text-sm text-slate-500">
            {job.customer?.name || "Customer"}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="mt-3 space-y-2 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <FaMapMarkerAlt className="text-slate-400" />
          <span>{job.location || "Location unavailable"}</span>
        </div>
        <div className="flex items-center gap-2">
          <FaClock className="text-slate-400" />
          <span>
            {job.scheduledAt
              ? new Date(job.scheduledAt).toLocaleString()
              : "Date pending"}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-lg font-bold text-emerald-700">
          {formatKES(job.price)}
        </span>
        {job.disputeId || job.hasDispute ? (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
            Dispute
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onView}
          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800"
        >
          View Details
        </button>

        {job.status === "pending" && (
          <>
            <button
              onClick={onAccept}
              className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-blue-700"
            >
              Accept
            </button>
            <button
              onClick={onReject}
              className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-300"
            >
              Reject
            </button>
          </>
        )}

        {job.status === "accepted" && (
          <button
            onClick={onView}
            className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-700"
          >
            Mark Complete
          </button>
        )}
      </div>
    </div>
  );
});

const JobSkeletonGrid = () => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {Array.from({ length: 8 }).map((_, index) => (
      <div
        key={`job-skeleton-${index}`}
        className="flex h-full flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
      >
        <div className="h-4 w-2/3 rounded-full bg-slate-200" />
        <div className="h-3 w-1/3 rounded-full bg-slate-200" />
        <div className="mt-2 h-3 w-full rounded-full bg-slate-200" />
        <div className="h-3 w-5/6 rounded-full bg-slate-200" />
        <div className="mt-3 h-4 w-1/2 rounded-full bg-slate-200" />
        <div className="mt-4 h-9 w-full rounded-full bg-slate-200" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ title, description }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white/70 px-6 py-12 text-center shadow-sm">
    <div className="rounded-full bg-slate-100 p-4 text-slate-500">
      <FaBoxOpen className="text-2xl" />
    </div>
    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    <p className="max-w-sm text-sm text-slate-500">{description}</p>
  </div>
);

const Pagination = ({ currentPage, totalPages, onPageChange }) => (
  <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
    <span>
      Page <span className="font-semibold text-slate-900">{currentPage}</span> of{" "}
      <span className="font-semibold text-slate-900">{totalPages}</span>
    </span>

    <div className="flex items-center gap-2">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  </div>
);