// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

/* Layouts */
import ProviderLayout from "./layouts/ProviderLayout.jsx";
import CustomerLayout from "./layouts/CustomerLayout.jsx";

/* Public */
import Home from "./pages/Home.jsx";
import AboutUs from "./pages/AboutUs.jsx";

/* Auth */
import Login from "./components/Auth/Login.jsx";
import Register from "./components/Auth/Register.jsx";

/* Provider */
import ProviderDashboard from "./pages/provider/ProviderDashboard.jsx";
import ProviderCommunity from "./pages/provider/ProviderCommunity.jsx";
import ProviderOnboarding from "./pages/provider/ProviderOnboarding.jsx";
import ProviderPending from "./pages/provider/ProviderPending.jsx";

/* Customer */
import CustomerDashboard from "./pages/Customer/CustomerDashboard.jsx";
import CustomerBookings from "./pages/Customer/CustomerBookings.jsx";
import CustomerProviders from "./pages/Customer/CustomerProviders.jsx";
import CustomerProfile from "./pages/Customer/CustomerProfile.jsx";

/* Admin */
import AdminPanel from "./pages/Admin/AdminDashboard.jsx";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* ---------- PUBLIC ---------- */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutUs />} />

        {/* ---------- AUTH ---------- */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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
          path="/provider/dashboard"
          element={
            <ProtectedRoute role="provider">
              <ProviderLayout>
                <ProviderDashboard />
              </ProviderLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider/community"
          element={
            <ProtectedRoute role="provider">
              <ProviderLayout>
                <ProviderCommunity />
              </ProviderLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/provider/pending"
          element={
            <ProtectedRoute role="provider">
              <ProviderLayout>
                <ProviderPending />
              </ProviderLayout>
            </ProtectedRoute>
          }
        />

        {/* ---------- CUSTOMER ---------- */}
        <Route
          path="/customer"
          element={
            <ProtectedRoute role="customer">
              <CustomerLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="bookings" element={<CustomerBookings />} />
          <Route path="providers" element={<CustomerProviders />} />
          <Route path="profile" element={<CustomerProfile />} />
        </Route>

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