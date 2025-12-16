import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerUser } from "../../redux/slices/authSlice";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((state) => state.auth);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(registerUser({ name, email, password, role }));
    if (result.meta.requestStatus === "fulfilled") navigate("/login");
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md relative overflow-hidden"
      >
        {/* Decorative teal gradient overlays */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>

        <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">
          Create an Account
        </h2>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2 font-medium">Name</label>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            required
          />
        </div>

        <div className="mb-4">
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

        <div className="mb-4">
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

        <div className="mb-6">
          <label className="block text-gray-700 mb-2 font-medium">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border border-gray-300 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
          >
            <option value="customer">Customer</option>
            <option value="provider">Provider</option>
          </select>
        </div>

        <button
          type="submit"
          className="bg-teal-600 hover:bg-teal-700 text-white p-3 w-full rounded-lg font-semibold shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5"
        >
          {status === "loading" ? "Registering..." : "Register"}
        </button>

        {error && (
          <p className="text-red-500 mt-4 text-center font-medium">
            {error.message || error}
          </p>
        )}

        <p className="text-sm text-gray-500 mt-6 text-center">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-teal-600 hover:text-teal-700 font-semibold transition"
          >
            Login
          </a>
        </p>
      </form>
    </div>
  );
}
