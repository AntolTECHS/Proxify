import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function Register() {
  const { register, status, error, isLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); // optional inside placeholder
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    const result = await register({ name, email, password, role: "customer", phone });
    if (result.success) {
      navigate("/customer/dashboard", { replace: true });
    }
  };

  if (isLoading) return <div className="text-center mt-20">Loading...</div>;

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md relative overflow-hidden"
        autoComplete="on"
      >
        {/* System Name */}
        <h1 className="text-4xl font-bold mb-6 text-center text-teal-600">Proxify</h1>

        {/* Name */}
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 mb-2 font-medium cursor-pointer">
            Name
          </label>
          <input
            id="name"
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            required
          />
        </div>

        {/* Email */}
        <div className="mb-4">
          <label htmlFor="email" className="block text-gray-700 mb-2 font-medium cursor-pointer">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            required
            autoComplete="email"
          />
        </div>

        {/* Phone (optional) */}
        <div className="mb-4">
          <label htmlFor="phone" className="block text-gray-700 mb-2 font-medium cursor-pointer">
            Phone
          </label>
          <input
            id="phone"
            type="text"
            placeholder="optional"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            autoComplete="tel"
          />
        </div>

        {/* Password */}
        <div className="mb-4 relative">
          <label htmlFor="password" className="block text-gray-700 mb-2 font-medium cursor-pointer">
            Password
          </label>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition pr-10"
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute top-9 right-3 text-gray-500 hover:text-gray-800"
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        {/* Confirm Password */}
        <div className="mb-4 relative">
          <label htmlFor="confirmPassword" className="block text-gray-700 mb-2 font-medium cursor-pointer">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition pr-10"
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute top-9 right-3 text-gray-500 hover:text-gray-800"
          >
            {showConfirm ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        {/* Register Button */}
        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-70 text-white p-3 w-full rounded-lg font-semibold shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5"
        >
          {status === "loading" ? "Registering..." : "Register"}
        </button>

        {/* Error */}
        {error && (
          <p className="text-red-500 mt-4 text-center font-medium">
            {error.message || error.toString()}
          </p>
        )}

        {/* Login link */}
        <p className="text-sm text-gray-500 mt-6 text-center">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-teal-600 hover:text-teal-700 font-semibold transition"
          >
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}