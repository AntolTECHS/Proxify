// src/services/adminService.js
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
    throw new Error(data?.message || `Request failed with status ${res.status}`);
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

const normalizeResubmissions = (items) => {
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
};

const normalizeProvider = (p) => {
  if (!p) return null;

  return {
    ...p,
    services: normalizeServices(p.services),
    documents: normalizeDocuments(p.documents),
    resubmissions: normalizeResubmissions(p.resubmissions),
    basicInfo: p.basicInfo || {},
    approvalBanner:
      p.approvalBanner ||
      (p.status === "approved"
        ? "Approved"
        : p.status === "rejected"
        ? "Rejected"
        : "Pending admin approval"),
    isApproved: p.status === "approved",
    isPending: p.status === "pending",
    isRejected: p.status === "rejected",
  };
};

const normalizeProviders = (providers) => {
  if (!Array.isArray(providers)) return [];
  return providers.map(normalizeProvider).filter(Boolean);
};

const normalizeConversationMessages = (messages) => {
  if (!messages) return [];
  const list = Array.isArray(messages) ? messages : [messages];

  return list
    .map((m) => {
      if (!m) return null;
      return {
        ...m,
        senderName:
          m.senderName ||
          m.sender?.name ||
          m.author?.name ||
          m.from?.name ||
          m.user?.name ||
          "Unknown",
        senderRole:
          m.senderRole ||
          m.sender?.role ||
          m.author?.role ||
          m.from?.role ||
          m.user?.role ||
          "",
        text: m.text || m.message || m.body || m.content || "",
        createdAt: m.createdAt || m.timestamp || m.sentAt || null,
      };
    })
    .filter(Boolean);
};

const normalizeConversation = (conversation) => {
  if (!conversation) return null;

  return {
    ...conversation,
    messages: normalizeConversationMessages(
      conversation.messages ||
        conversation.conversation ||
        conversation.thread ||
        conversation.chat ||
        []
    ),
    participants: Array.isArray(conversation.participants)
      ? conversation.participants
      : [],
    booking: conversation.booking || null,
    updatedAt: conversation.updatedAt || conversation.lastMessageAt || null,
  };
};

const normalizeBooking = (booking) => {
  if (!booking) return null;

  return {
    ...booking,
    customer: booking.customer || booking.user || booking.client || null,
    provider: booking.provider || booking.vendor || null,
    messages: normalizeConversationMessages(
      booking.messages ||
        booking.conversation ||
        booking.chat ||
        booking.thread ||
        []
    ),
    serviceName:
      booking.serviceName ||
      booking.service?.name ||
      booking.service?.title ||
      booking.service?.serviceName ||
      "",
  };
};

const normalizeBookings = (bookings) => {
  if (!Array.isArray(bookings)) return [];
  return bookings.map(normalizeBooking).filter(Boolean);
};

const normalizeConversations = (conversations) => {
  if (!Array.isArray(conversations)) return [];
  return conversations.map(normalizeConversation).filter(Boolean);
};

/* =========================
   Admin Service
========================= */
export const adminService = {
  getSummary: async (token) => {
    const data = await request(`${API_URL}/admin/summary`, { token });
    return data.summary || {};
  },

  getUsers: async (token) => {
    const data = await request(`${API_URL}/admin/users`, { token });
    return data.users || [];
  },

  getProviders: async (token) => {
    const data = await request(`${API_URL}/admin/providers`, { token });
    return normalizeProviders(data.providers || []);
  },

  getProviderById: async (id, token) => {
    const data = await request(`${API_URL}/admin/providers/${id}`, { token });
    return normalizeProvider(data.provider);
  },

  getPendingProviders: async (token) => {
    const data = await request(`${API_URL}/admin/providers/pending`, { token });
    return normalizeProviders(data.providers || []);
  },

  getRejectedProviders: async (token) => {
    const data = await request(`${API_URL}/admin/providers/rejected`, { token });
    return normalizeProviders(data.providers || []);
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

  getBookings: async (token) => {
    const data = await request(`${API_URL}/admin/bookings`, { token });
    return normalizeBookings(data.bookings || []);
  },

  getBookingById: async (id, token) => {
    const data = await request(`${API_URL}/admin/bookings/${id}`, { token });
    return normalizeBooking(data.booking);
  },

  getBookingConversation: async (id, token) => {
    const data = await request(`${API_URL}/admin/bookings/${id}/conversation`, {
      token,
    });
    return normalizeConversationMessages(
      data.messages || data.conversation || data.thread || []
    );
  },

  /* New: fetch all conversations */
  getConversations: async (token) => {
    const data = await request(`${API_URL}/admin/conversations`, { token });
    return normalizeConversations(
      data.conversations || data.conversation || data.threads || []
    );
  },

  /* New: fetch one conversation by id */
  getConversationById: async (id, token) => {
    const data = await request(`${API_URL}/admin/conversations/${id}`, {
      token,
    });
    return normalizeConversation(data.conversation || data.thread || null);
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
    return normalizeBooking(data.booking || null);
  },

  deleteBooking: async (id, token) => {
    return request(`${API_URL}/admin/bookings/${id}`, {
      method: "DELETE",
      token,
    });
  },

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