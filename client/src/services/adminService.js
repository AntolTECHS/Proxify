const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/* =========================
   Core request helper
========================= */
const request = async (url, { method = "GET", token, body } = {}) => {
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(body ? { "Content-Type": "application/json" } : {}),
  };

  const res = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : {};

  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }

  return data;
};

/* =========================
   Helpers
========================= */
const normalizeDocuments = (docs) => {
  if (!docs) return [];
  const list = Array.isArray(docs) ? docs : [docs];

  return list
    .map((doc, index) => {
      if (!doc) return null;

      const path =
        doc.path ||
        doc.url ||
        doc.fileUrl ||
        doc.link ||
        doc.secureUrl ||
        doc.documentUrl ||
        "";

      const type = String(
        doc.type || doc.mimeType || doc.format || doc.contentType || ""
      ).toLowerCase();

      const name =
        doc.name ||
        doc.title ||
        doc.fileName ||
        doc.originalName ||
        doc.documentName ||
        `Document ${index + 1}`;

      return {
        ...doc,
        name,
        path,
        type,
      };
    })
    .filter(Boolean);
};

const normalizeServices = (services) => {
  if (!services) return [];
  return Array.isArray(services) ? services : [services];
};

const normalizeProvider = (p) => {
  if (!p) return null;

  return {
    ...p,
    services: normalizeServices(p.services),
    documents: normalizeDocuments(p.documents),
    basicInfo: p.basicInfo || {},
  };
};

const normalizeProviders = (providers) => {
  if (!Array.isArray(providers)) return [];
  return providers.map(normalizeProvider).filter(Boolean);
};

/* =========================
   Admin Service
========================= */
export const adminService = {
  /* ================= SUMMARY ================= */
  getSummary: async (token) => {
    const data = await request(`${API_URL}/admin/summary`, { token });
    return data.summary;
  },

  /* ================= USERS ================= */
  getUsers: async (token) => {
    const data = await request(`${API_URL}/admin/users`, { token });
    return data.users || [];
  },

  /* ================= PROVIDERS ================= */
  getProviders: async (token) => {
    const data = await request(`${API_URL}/admin/providers`, { token });
    return normalizeProviders(data.providers || []);
  },

  getProviderById: async (id, token) => {
    const data = await request(`${API_URL}/admin/providers/${id}`, { token });
    return normalizeProvider(data.provider);
  },

  approveProvider: async (id, token) => {
    const data = await request(`${API_URL}/admin/providers/${id}/approve`, {
      method: "PUT",
      token,
    });
    return normalizeProvider(data.provider);
  },

  rejectProvider: async (id, notes, token) => {
    const data = await request(`${API_URL}/admin/providers/${id}/reject`, {
      method: "PUT",
      token,
      body: { notes },
    });
    return normalizeProvider(data.provider);
  },

  /* ================= BOOKINGS ================= */
  getBookings: async (token) => {
    const data = await request(`${API_URL}/admin/bookings`, { token });
    return data.bookings || [];
  },

  getBookingAnalytics: async (token) => {
    const data = await request(`${API_URL}/admin/analytics/bookings-per-day`, {
      token,
    });
    return data.data || [];
  },

  updateBookingStatus: async (id, status, token) => {
    const data = await request(`${API_URL}/admin/bookings/${id}/status`, {
      method: "PUT",
      token,
      body: { status },
    });
    return data.booking || null;
  },

  deleteBooking: async (id, token) => {
    return request(`${API_URL}/admin/bookings/${id}`, {
      method: "DELETE",
      token,
    });
  },

  /* ================= SERVICES ================= */
  getServices: async (token) => {
    const data = await request(`${API_URL}/admin/services`, { token });
    return data.services || [];
  },

  deleteService: async (id, token) => {
    return request(`${API_URL}/admin/services/${id}`, {
      method: "DELETE",
      token,
    });
  },
};