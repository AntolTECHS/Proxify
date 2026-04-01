// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

/* Layouts */
import ProviderLayout from "./layouts/ProviderLayout.jsx";
import CustomerLayout from "./layouts/CustomerLayout.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";

/* Public Pages */
import Home from "./pages/Home.jsx";
import AboutUs from "./pages/AboutUs.jsx";

/* Auth */
import Login from "./components/Auth/Login.jsx";
import Register from "./components/Auth/Register.jsx";

/* Provider Pages */
import ProviderDashboard from "./pages/provider/ProviderDashboard.jsx";
import ProviderJobs from "./pages/provider/ProviderJobs.jsx";
import ProviderCommunity from "./pages/provider/ProviderCommunity.jsx";
import ProviderSettings from "./pages/provider/ProviderSettings.jsx";
import ProviderOnboarding from "./pages/provider/ProviderOnboarding.jsx";
import ProviderPending from "./pages/provider/ProviderPending.jsx";

/* Customer Pages */
import CustomerDashboard from "./pages/Customer/CustomerDashboard.jsx";
import CustomerBookings from "./pages/Customer/CustomerBookings.jsx";
import CustomerProviders from "./pages/Customer/CustomerProviders.jsx";
import CustomerProfile from "./pages/Customer/CustomerProfile.jsx";

/* Admin Pages */
import AdminDashboard from "./pages/Admin/AdminDashboard.jsx";
import AdminProviders from "./pages/Admin/AdminProviders.jsx";
import AdminBookings from "./pages/Admin/AdminBookings.jsx";
import AdminProfile from "./pages/Admin/AdminProfile.jsx";

export default function App() {
  return (
    <Routes>
      {/* ---------- PUBLIC ---------- */}
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<AboutUs />} />

      {/* ---------- AUTH ---------- */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ---------- LEGACY / SAFETY REDIRECTS ---------- */}
      <Route path="/admin/panel" element={<Navigate to="/admin/dashboard" replace />} />

      {/* ---------- BECOME PROVIDER ---------- */}
      <Route
        path="/become-provider"
        element={
          <ProtectedRoute role="customer" excludeRole="provider">
            <Navigate to="/provider/onboarding" replace />
          </ProtectedRoute>
        }
      />

      {/* ---------- PROVIDER ---------- */}
      <Route
        path="/provider/onboarding"
        element={
          <ProtectedRoute role="customer">
            <ProviderOnboarding />
          </ProtectedRoute>
        }
      />

      <Route
        path="/provider"
        element={
          <ProtectedRoute role="provider">
            <ProviderLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/provider/dashboard" replace />} />
        <Route path="dashboard" element={<ProviderDashboard />} />
        <Route path="jobs" element={<ProviderJobs />} />
        <Route path="community" element={<ProviderCommunity />} />
        <Route path="settings" element={<ProviderSettings />} />
        <Route path="pending" element={<ProviderPending />} />
      </Route>

      {/* ---------- CUSTOMER ---------- */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute role="customer">
            <CustomerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/customer/dashboard" replace />} />
        <Route path="dashboard" element={<CustomerDashboard />} />
        <Route path="bookings" element={<CustomerBookings />} />
        <Route path="providers" element={<CustomerProviders />} />
        <Route path="profile" element={<CustomerProfile />} />
      </Route>

      {/* ---------- ADMIN ---------- */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="providers" element={<AdminProviders />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="profile" element={<AdminProfile />} />
      </Route>

      {/* ---------- FALLBACK ---------- */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}