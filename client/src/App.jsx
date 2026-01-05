import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useSelector } from "react-redux";

/* PUBLIC */
import Home from "./pages/Home.jsx";

/* AUTH */
import Login from "./components/Auth/Login.jsx";
import Register from "./components/Auth/Register.jsx";

/* DASHBOARDS */
import ProviderDashboard from "./pages/provider/ProviderDashboard.jsx";
import ProviderCommunity from "./pages/provider/ProviderCommunity.jsx";
import ProviderOnboarding from "./pages/provider/ProviderOnboarding.jsx";

import CustomerDashboard from "./pages/Customer/Dashboard.jsx";
import AdminPanel from "./pages/Admin/AdminPanel.jsx";

function App() {
  const { user } = useSelector((state) => state.auth);

  /* ---------- PROTECTED ROUTE ---------- */
  const ProtectedRoute = ({ role, children }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (role && user.role !== role) return <Navigate to="/" replace />;
    return children;
  };

  return (
    <Router>
      <Routes>
        {/* ---------- PUBLIC ---------- */}
        <Route path="/" element={<Home />} />

        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/" replace /> : <Register />}
        />

        {/* ---------- PROVIDER ONBOARDING ---------- */}
        <Route
          path="/become-provider"
          element={
            user?.role === "provider" ? (
              <Navigate to="/provider/dashboard" replace />
            ) : (
              <ProviderOnboarding user={user} />
            )
          }
        />

        {/* ---------- PROVIDER ---------- */}
        <Route
          path="/provider/dashboard"
          element={
            <ProtectedRoute role="provider">
              <ProviderDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provider/community"
          element={
            <ProtectedRoute role="provider">
              <ProviderCommunity />
            </ProtectedRoute>
          }
        />

        {/* ---------- CUSTOMER ---------- */}
        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute role="customer">
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />

        {/* ---------- ADMIN ---------- */}
        <Route
          path="/admin/panel"
          element={
            <ProtectedRoute role="admin">
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* ---------- FALLBACK ---------- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
