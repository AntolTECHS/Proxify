import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../redux/slices/authSlice";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((state) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(loginUser({ email, password }));
    if (result.meta.requestStatus === "fulfilled") navigate("/dashboard");
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
      <form className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md relative overflow-hidden"
            onSubmit={handleSubmit}>
        {/* Decorative gradient overlay */}
        <div className="absolute -top-16 -left-16 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-16 -right-16 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>

        <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">
          Welcome Back
        </h2>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2 font-medium">Email</label>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2 font-medium">Password</label>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            required
          />
        </div>

        <button
          type="submit"
          className="bg-teal-600 hover:bg-teal-700 text-white p-3 w-full rounded-lg font-semibold shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5"
        >
          {status === "loading" ? "Logging in..." : "Login"}
        </button>

        {error && (
          <p className="text-red-500 mt-4 text-center font-medium">
            {error.message || error}
          </p>
        )}

        <p className="text-sm text-gray-500 mt-6 text-center">
          Don't have an account?{" "}
          <a href="/register" className="text-teal-600 hover:text-teal-700 font-semibold transition">
            Sign Up
          </a>
        </p>
      </form>
    </div>
  );
}
