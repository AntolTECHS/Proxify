// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // Load user & token from localStorage on app start
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const saveAuth = (userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setToken(token);
  };

  // ---------------- REGISTER ----------------
  const register = async ({ name, email, password, role, phone }) => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");

      saveAuth(data.user, data.token);
      setStatus("success");
      return { success: true, user: data.user };
    } catch (err) {
      setStatus("error");
      setError(err);
      return { success: false, error: err };
    }
  };

  // ---------------- LOGIN ----------------
  const login = async ({ email, password }) => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      saveAuth(data.user, data.token);
      setStatus("success");
      return { success: true, user: data.user };
    } catch (err) {
      setStatus("error");
      setError(err);
      return { success: false, error: err };
    }
  };

  // ---------------- UPGRADE TO PROVIDER ----------------
  const upgradeToProvider = async (formData) => {
    setStatus("loading");
    setError(null);

    if (!token) {
      setError(new Error("You are not logged in. Please log in again."));
      setStatus("error");
      return { success: false, error: new Error("No token") };
    }

    try {
      const res = await fetch(`${API_URL}/providers/onboard`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, // ✅ important
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Onboarding failed");

      // Update local user role
      const updatedUser = {
        ...user,
        role: "provider",
        providerStatus: "pending",
      };
      saveAuth(updatedUser, token);

      setStatus("success");
      return { success: true, user: updatedUser };
    } catch (err) {
      setStatus("error");
      setError(err);
      return { success: false, error: err };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
    setStatus("idle");
  };

  const value = {
    user,
    token,
    status,
    error,
    isLoading,
    register,
    login,
    logout,
    upgradeToProvider,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};