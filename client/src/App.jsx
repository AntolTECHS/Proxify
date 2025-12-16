import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

// Pages
import Home from "./pages/Home.jsx";
import ProviderDashboard from "./pages/Provider/Dashboard.jsx";
import CustomerDashboard from "./pages/Customer/Dashboard.jsx";
import AdminPanel from "./pages/Admin/AdminPanel.jsx";

// Auth Components
import Login from "./components/Auth/Login.jsx";
import Register from "./components/Auth/Register.jsx";

function App() {
  // Get current logged-in user from Redux
  const { user } = useSelector((state) => state.auth);

  // Protected Route Component
  const ProtectedRoute = ({ role, children }) => {
    // Redirect to login if not authenticated
    if (!user) return <Navigate to="/login" replace />;

    // Redirect to home if user role doesn't match
    if (role && user.role !== role) return <Navigate to="/" replace />;

    return children;
  };

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

        {/* Provider Dashboard */}
        <Route
          path="/provider/dashboard"
          element={
            <ProtectedRoute role="provider">
              <ProviderDashboard />
            </ProtectedRoute>
          }
        />

        {/* Customer Dashboard */}
        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute role="customer">
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin Panel */}
        <Route
          path="/admin/panel"
          element={
            <ProtectedRoute role="admin">
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* Fallback: Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
