import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

const unwrap = (res) => res.data;

const authConfig = (token) => {
  if (!token) return undefined;

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getMyDisputes = () => api.get("/disputes/my").then(unwrap);

export const getDispute = (id) => api.get(`/disputes/${id}`).then(unwrap);

export const createDispute = (data, token = null) => {
  return api.post("/disputes", data, authConfig(token)).then(unwrap);
};

export const sendMessage = (id, data) =>
  api.post(`/disputes/${id}/messages`, data).then(unwrap);

export const uploadEvidence = (id, formData) =>
  api
    .post(`/disputes/${id}/evidence`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    .then(unwrap);

export const closeDispute = (id) =>
  api.patch(`/disputes/${id}/close`).then(unwrap);

export const getAdminDisputes = () =>
  api.get("/admin/disputes").then(unwrap);

export const resolveDispute = (id, data) =>
  api.patch(`/admin/disputes/${id}/resolve`, data).then(unwrap);

export default api;