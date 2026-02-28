import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function Login() {
  const { login, user, status, error } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Redirect logged-in users to their dashboard
  useEffect(() => {
    if (!user) return;

    if (user.role === "provider") navigate("/provider/dashboard", { replace: true });
    else if (user.role === "customer") navigate("/customer/dashboard", { replace: true });
    else if (user.role === "admin") navigate("/admin/panel", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login({ email, password });
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md relative overflow-hidden"
        autoComplete="on"
      >
        {/* System Name */}
        <h1 className="text-4xl font-bold mb-6 text-center text-teal-600">Proxify</h1>

        {/* Email */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-4 border p-3 w-full rounded-lg"
          autoComplete="email"
        />

        {/* Password with show/hide toggle */}
        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border p-3 w-full rounded-lg pr-10"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-teal-600 hover:bg-teal-700 text-white p-3 w-full rounded-lg mb-4"
        >
          {status === "loading" ? "Logging in..." : "Login"}
        </button>

        {/* Error */}
        {error && (
          <p className="text-red-500 mt-2 text-center">{error.message || error}</p>
        )}

        {/* Register link */}
        <p className="text-center text-gray-500 mt-4">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-teal-600 hover:underline font-medium"
          >
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}