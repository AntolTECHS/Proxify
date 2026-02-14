import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

/* ---------- PUBLIC ---------- */
import Home from "./pages/Home.jsx";
import AboutUs from "./pages/AboutUs.jsx";

/* ---------- AUTH ---------- */
import Login from "./components/Auth/Login.jsx";
import Register from "./components/Auth/Register.jsx";

/* ---------- PROVIDER ---------- */
import ProviderDashboard from "./pages/provider/ProviderDashboard.jsx";
import ProviderCommunity from "./pages/provider/ProviderCommunity.jsx";
import ProviderOnboarding from "./pages/provider/ProviderOnboarding.jsx";
import BecomeProvider from "./pages/BecomeProvider.jsx";
import ProviderPending from "./pages/provider/ProviderStatus.jsx";

/* ---------- CUSTOMER ---------- */
import CustomerDashboard from "./pages/Customer/CustomerDashboard.jsx";

/* ---------- ADMIN ---------- */
import AdminPanel from "./pages/Admin/AdminDashboard.jsx";

function App() {
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
            <ProtectedRoute>
              <BecomeProvider />
            </ProtectedRoute>
          }
        />

        {/* ---------- PROVIDER ONBOARDING ---------- */}
        <Route
          path="/provider/onboarding"
          element={
            <ProtectedRoute>
              <ProviderOnboarding />
            </ProtectedRoute>
          }
        />

        {/* ---------- PROVIDER PENDING VERIFICATION ---------- */}
        <Route
          path="/provider/pending"
          element={
            <ProtectedRoute role="provider">
              <ProviderPending />
            </ProtectedRoute>
          }
        />

        {/* ---------- PROVIDER DASHBOARD ---------- */}
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

        {/* ---------- CUSTOMER DASHBOARD ---------- */}
        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute role="customer">
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />

        {/* ---------- ADMIN PANEL ---------- */}
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
