const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/* =========================
   Helper
========================= */
const handleResponse = async (res) => {
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : {};

  if (!res.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
};

const authHeaders = (token, json = false) => ({
  Authorization: `Bearer ${token}`,
  ...(json ? { "Content-Type": "application/json" } : {}),
});

/* =========================
   Admin Service
========================= */
export const adminService = {
  /* ================= SUMMARY ================= */
  getSummary: async (token) => {
    const res = await fetch(`${API_URL}/admin/summary`, {
      headers: authHeaders(token),
    });

    const data = await handleResponse(res);
    return data.summary;
  },

  /* ================= USERS ================= */
  getUsers: async (token) => {
    const res = await fetch(`${API_URL}/admin/users`, {
      headers: authHeaders(token),
    });

    const data = await handleResponse(res);
    return data.users;
  },

  /* ================= PROVIDERS ================= */
  getProviders: async (token) => {
    const res = await fetch(`${API_URL}/admin/providers`, {
      headers: authHeaders(token),
    });

    const data = await handleResponse(res);
    return data.providers;
  },

  getPendingProviders: async (token) => {
    const res = await fetch(`${API_URL}/admin/providers/pending`, {
      headers: authHeaders(token),
    });

    const data = await handleResponse(res);
    return data.providers;
  },

  approveProvider: async (id, token) => {
    const res = await fetch(`${API_URL}/admin/providers/${id}/approve`, {
      method: "PUT",
      headers: authHeaders(token),
    });

    const data = await handleResponse(res);
    return data.provider;
  },

  rejectProvider: async (id, notes, token) => {
    const res = await fetch(`${API_URL}/admin/providers/${id}/reject`, {
      method: "PUT",
      headers: authHeaders(token, true),
      body: JSON.stringify({ notes }),
    });

    const data = await handleResponse(res);
    return data.provider;
  },

  /* ================= BOOKINGS ================= */
  getBookings: async (token) => {
    const res = await fetch(`${API_URL}/admin/bookings`, {
      headers: authHeaders(token),
    });

    const data = await handleResponse(res);
    return data.bookings;
  },

  getBookingAnalytics: async (token) => {
    const res = await fetch(`${API_URL}/admin/analytics/bookings-per-day`, {
      headers: authHeaders(token),
    });

    const data = await handleResponse(res);
    return data.data;
  },

  updateBookingStatus: async (id, status, token) => {
    const res = await fetch(`${API_URL}/admin/bookings/${id}/status`, {
      method: "PUT",
      headers: authHeaders(token, true),
      body: JSON.stringify({ status }),
    });

    const data = await handleResponse(res);
    return data.booking;
  },

  deleteBooking: async (id, token) => {
    const res = await fetch(`${API_URL}/admin/bookings/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });

    const data = await handleResponse(res);
    return data;
  },

  /* ================= SERVICES ================= */
  getServices: async (token) => {
    const res = await fetch(`${API_URL}/admin/services`, {
      headers: authHeaders(token),
    });

    const data = await handleResponse(res);
    return data.services;
  },

  deleteService: async (id, token) => {
    const res = await fetch(`${API_URL}/admin/services/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });

    const data = await handleResponse(res);
    return data;
  },
};