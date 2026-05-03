import { useState } from "react";
import { FaEnvelope, FaBell, FaSave, FaUser, FaToggleOn, FaToggleOff } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.jsx";

export default function CustomerProfile() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  const [notifications, setNotifications] = useState({
    emailBookingUpdates: true,
    emailPromotions: true,
    emailWeeklyDigest: false,
    smsBookingAlerts: true,
    pushNotifications: true,
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleNotificationToggle = (key) => {
    setNotifications({ ...notifications, [key]: !notifications[key] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Updated profile:", form);
    console.log("Notification preferences:", notifications);
    alert("Profile and preferences updated (API hookup pending)");
  };

  return (
    <div className="relative max-w-3xl overflow-hidden">
      <div className="pointer-events-none absolute -left-16 top-6 h-48 w-48 rounded-full bg-[#0f766e]/12 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-20 h-56 w-56 rounded-full bg-[#ca8a04]/10 blur-3xl" />

      <div className="relative space-y-6">
        <div className="rounded-[1.7rem] border border-[#d4e5df] bg-gradient-to-r from-[#f6fffc] via-[#eef9f5] to-[#fef6e4] p-6 shadow-[0_18px_60px_rgba(8,47,43,0.12)]">
          <p className="inline-flex rounded-full bg-[#0f766e]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#0f766e]">
            Account Center
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#143f3a]">
            Profile & Settings
          </h1>
          <p className="mt-2 text-sm text-[#4f6b68] sm:text-base">
            Keep your details up to date and manage your account security.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[1.5rem] border border-[#d4e5df] bg-white/95 p-6 shadow-[0_14px_40px_rgba(8,47,43,0.1)] sm:p-8"
        >
          <div className="space-y-5">
            <div>
              <label className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-[#4f6d69]">
                <FaUser className="text-[#0f766e]" />
                Full Name
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full rounded-xl border border-[#d4e4df] bg-[#f7fcfa] p-3 text-[#143f3a] outline-none transition focus:border-[#0f766e] focus:bg-white focus:ring-4 focus:ring-[#0f766e]/15"
                required
              />
            </div>

            <div>
              <label className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-[#4f6d69]">
                <FaEnvelope className="text-[#0f766e]" />
                Email
              </label>
              <input
                value={form.email}
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-[#d4e4df] bg-[#eef5f2] p-3 text-[#6f8885]"
              />
            </div>

            <div className="rounded-2xl border border-[#dbe8e3] bg-[#f8fcfb] p-4 sm:p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#5f7a77]">
                Notifications
              </h2>

              <div className="space-y-3">
                {/* Email Booking Updates */}
                <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3 border border-[#d4e4df]">
                  <div className="flex items-start gap-3">
                    <FaBell className="mt-1 text-[#0f766e]" />
                    <div>
                      <p className="text-sm font-semibold text-[#143f3a]">Booking Updates</p>
                      <p className="text-xs text-[#6f8885]">Get notified about booking status changes</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationToggle("emailBookingUpdates")}
                    className="text-2xl transition"
                  >
                    {notifications.emailBookingUpdates ? (
                      <FaToggleOn className="text-[#0f766e]" />
                    ) : (
                      <FaToggleOff className="text-[#b0c5c0]" />
                    )}
                  </button>
                </div>

                {/* Email Promotions */}
                <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3 border border-[#d4e4df]">
                  <div className="flex items-start gap-3">
                    <FaBell className="mt-1 text-[#0f766e]" />
                    <div>
                      <p className="text-sm font-semibold text-[#143f3a]">Promotions & Offers</p>
                      <p className="text-xs text-[#6f8885]">Receive exclusive deals and discounts</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationToggle("emailPromotions")}
                    className="text-2xl transition"
                  >
                    {notifications.emailPromotions ? (
                      <FaToggleOn className="text-[#0f766e]" />
                    ) : (
                      <FaToggleOff className="text-[#b0c5c0]" />
                    )}
                  </button>
                </div>

                {/* SMS Booking Alerts */}
                <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3 border border-[#d4e4df]">
                  <div className="flex items-start gap-3">
                    <FaBell className="mt-1 text-[#0f766e]" />
                    <div>
                      <p className="text-sm font-semibold text-[#143f3a]">SMS Alerts</p>
                      <p className="text-xs text-[#6f8885]">Important updates via text message</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationToggle("smsBookingAlerts")}
                    className="text-2xl transition"
                  >
                    {notifications.smsBookingAlerts ? (
                      <FaToggleOn className="text-[#0f766e]" />
                    ) : (
                      <FaToggleOff className="text-[#b0c5c0]" />
                    )}
                  </button>
                </div>

                {/* Push Notifications */}
                <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3 border border-[#d4e4df]">
                  <div className="flex items-start gap-3">
                    <FaBell className="mt-1 text-[#0f766e]" />
                    <div>
                      <p className="text-sm font-semibold text-[#143f3a]">Push Notifications</p>
                      <p className="text-xs text-[#6f8885]">Real-time alerts on your device</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNotificationToggle("pushNotifications")}
                    className="text-2xl transition"
                  >
                    {notifications.pushNotifications ? (
                      <FaToggleOn className="text-[#0f766e]" />
                    ) : (
                      <FaToggleOff className="text-[#b0c5c0]" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0f766e] to-[#0a5a54] px-6 py-3 font-semibold text-white transition hover:from-[#0d6b64] hover:to-[#084944]"
              >
                <FaSave />
                Save Changes
              </button>

              <button
                type="button"
                className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                onClick={() => alert("Delete account flow coming next")}
              >
                Delete Account
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}