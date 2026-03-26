// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Save user and token to state + localStorage
  const saveAuth = (userData, token) => {
    setUser(userData);
    setToken(token);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
  };

  // Update user without affecting token
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
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
      const err = new Error("You are not logged in. Please log in again.");
      setStatus("error");
      setError(err);
      return { success: false, error: err };
    }

    try {
      const res = await fetch(`${API_URL}/providers/onboard`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Onboarding failed");

      const newToken = data.token || token;

      const updatedUser = { ...user, role: "provider" };
      saveAuth(updatedUser, newToken);

      setStatus("success");

      // redirect to provider dashboard
      navigate("/provider/dashboard", { replace: true });

      return { success: true, user: updatedUser };
    } catch (err) {
      setStatus("error");
      setError(err);
      return { success: false, error: err };
    }
  };

  // ---------------- LOGOUT ----------------
  const logout = () => {
    setUser(null);
    setToken(null);
    setStatus("idle");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
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
    updateUser, // <-- added
    upgradeToProvider,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};