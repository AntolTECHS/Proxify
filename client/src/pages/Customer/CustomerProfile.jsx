import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";

export default function CustomerProfile() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (form.password && form.password !== form.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    // 🔒 API call goes here
    console.log("Updated profile:", form);
    alert("Profile updated (API hookup pending)");
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-6" style={{ color: "#0ea5e9" }}>
        Profile & Settings
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow space-y-5"
      >
        {/* NAME */}
        <div>
          <label className="block mb-1" style={{ color: "#0ea5e9" }}>
            Full Name
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full border rounded-lg p-3"
            style={{ borderColor: "#0ea5e9" }}
            required
          />
        </div>

        {/* EMAIL (READ ONLY) */}
        <div>
          <label className="block mb-1" style={{ color: "#0ea5e9" }}>
            Email
          </label>
          <input
            value={form.email}
            disabled
            className="w-full border rounded-lg p-3 bg-gray-100 cursor-not-allowed"
            style={{ borderColor: "#0ea5e9" }}
          />
        </div>

        {/* PASSWORD */}
        <div>
          <label className="block mb-1" style={{ color: "#0ea5e9" }}>
            New Password <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="password"
            name="password"
            placeholder="Leave blank to keep current password"
            value={form.password}
            onChange={handleChange}
            className="w-full border rounded-lg p-3"
            style={{ borderColor: "#0ea5e9" }}
          />
        </div>

        {/* CONFIRM PASSWORD */}
        <div>
          <label className="block mb-1" style={{ color: "#0ea5e9" }}>
            Confirm Password
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            className="w-full border rounded-lg p-3"
            style={{ borderColor: "#0ea5e9" }}
          />
        </div>

        {/* ACTIONS */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="px-6 py-3 rounded-lg text-white transition"
            style={{ backgroundColor: "#0ea5e9" }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#0284c7")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#0ea5e9")}
          >
            Save Changes
          </button>

          <button
            type="button"
            className="text-red-500 hover:underline"
            onClick={() => alert("Delete account flow coming next")}
          >
            Delete Account
          </button>
        </div>
      </form>
    </div>
  );
}