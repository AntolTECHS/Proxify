import { useState } from "react";

export default function AccountStep({ form, setForm, next }) {
  const [showPassword, setShowPassword] = useState(false);

  // Simple validation
  const valid =
    form.name.trim() !== "" &&
    form.email.trim() !== "" &&
    form.password.length >= 6;

  return (
    <div className="max-w-md mx-auto bg-white shadow-xl rounded-2xl p-8 mt-10 border border-gray-200">
      <h2 className="text-3xl font-extrabold text-teal-600 mb-6 text-center">
        Create Your Account
      </h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) next();
        }}
        className="space-y-6"
      >
        {/* Full Name */}
        <div className="flex flex-col">
          <label htmlFor="name" className="mb-2 font-semibold text-gray-700">
            Full Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={form.name}
            required
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Enter your full name"
            className="input px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
          />
        </div>

        {/* Email */}
        <div className="flex flex-col">
          <label htmlFor="email" className="mb-2 font-semibold text-gray-700">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={form.email}
            required
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Enter your email"
            className="input px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col relative">
          <label htmlFor="password" className="mb-2 font-semibold text-gray-700">
            Password
          </label>
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            value={form.password}
            required
            minLength={6}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Enter a password (min 6 chars)"
            className="input px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400 pr-16 transition"
          />
          {/* Toggle Visibility */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-3 text-gray-500 hover:text-teal-600 font-medium transition"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
          <p className="text-sm text-gray-400 mt-1">
            Minimum 6 characters
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!valid}
          className={`w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 transition shadow-lg ${
            !valid ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          Continue
        </button>
      </form>
    </div>
  );
}
