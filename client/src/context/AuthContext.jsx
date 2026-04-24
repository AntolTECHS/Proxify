// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const safeParseJSON = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return String(value);

  return String(
    value._id ||
      value.id ||
      value.userId ||
      value.uid ||
      value?.data?._id ||
      value?.data?.id ||
      ""
  ) || null;
};

const getUserId = (user) => {
  if (!user) return null;
  return normalizeId(user);
};

const readStoredAuth = () => {
  const storedToken = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  const parsedUser = storedUser ? safeParseJSON(storedUser) : null;

  if (!storedToken || !parsedUser) return { token: null, user: null };
  return { token: storedToken, user: parsedUser };
};

const handleResponse = async (res) => {
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : {};

  if (!res.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  const [{ token, user }, setAuth] = useState(() => readStoredAuth());
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const saveAuth = (userData, authToken) => {
    setAuth({ user: userData, token: authToken });
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", authToken);
  };

  const clearAuth = () => {
    setAuth({ user: null, token: null });
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  const updateUser = (updatedUser) => {
    setAuth((prev) => {
      const next = { ...prev, user: updatedUser };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return next;
    });
  };

  const register = async ({ name, email, password, role, phone }) => {
    setStatus("loading");
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name?.trim(),
          email: email?.trim(),
          password,
          role,
          phone,
        }),
      });

      const data = await handleResponse(res);

      if (!data.user || !data.token) {
        throw new Error("Invalid registration response");
      }

      saveAuth(data.user, data.token);
      setStatus("success");
      return { success: true, user: data.user, token: data.token };
    } catch (err) {
      setStatus("error");
      setError(err);
      return { success: false, error: err };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async ({ email, password }) => {
    setStatus("loading");
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email?.trim(),
          password,
        }),
      });

      const data = await handleResponse(res);

      if (!data.user || !data.token) {
        throw new Error("Invalid login response");
      }

      saveAuth(data.user, data.token);
      setStatus("success");
      return { success: true, user: data.user, token: data.token };
    } catch (err) {
      setStatus("error");
      setError(err);
      return { success: false, error: err };
    } finally {
      setIsLoading(false);
    }
  };

  const upgradeToProvider = async (formData) => {
    setStatus("loading");
    setIsLoading(true);
    setError(null);

    if (!token) {
      const err = new Error("You are not logged in. Please log in again.");
      setStatus("error");
      setError(err);
      setIsLoading(false);
      return { success: false, error: err };
    }

    try {
      const isFormData = typeof FormData !== "undefined" && formData instanceof FormData;

      const res = await fetch(`${API_URL}/providers/onboard`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
        },
        body: isFormData ? formData : JSON.stringify(formData),
      });

      const data = await handleResponse(res);

      const newToken = data.token || token;
      const updatedUser = data.user
        ? data.user
        : {
            ...user,
            role: "provider",
          };

      saveAuth(updatedUser, newToken);
      setStatus("success");

      navigate("/provider/dashboard", { replace: true });

      return { success: true, user: updatedUser, token: newToken };
    } catch (err) {
      setStatus("error");
      setError(err);
      return { success: false, error: err };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearAuth();
    setStatus("idle");
    setError(null);
    navigate("/login", { replace: true });
  };

  const isAuthenticated = useMemo(() => Boolean(user && token), [user, token]);

  const currentUserId = useMemo(() => getUserId(user), [user]);

  const value = {
    user,
    token,
    currentUserId,
    currentUser: user,
    userId: currentUserId,
    status,
    error,
    isLoading,
    hasHydrated,
    isAuthenticated,
    register,
    login,
    logout,
    updateUser,
    upgradeToProvider,
    clearAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};