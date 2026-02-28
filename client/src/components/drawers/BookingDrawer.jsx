// src/components/drawers/BookingDrawer.jsx
import { FaTimes } from "react-icons/fa";

export default function BookingDrawer({ booking, onClose }) {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-black/40"
        onClick={onClose}
      />

      <aside className="w-full max-w-md bg-white p-6 animate-slideIn">
        <button
          onClick={onClose}
          className="mb-4 text-gray-500 hover:text-gray-800"
        >
          <FaTimes />
        </button>

        <h2 className="text-xl font-bold text-teal-700 mb-4">
          Booking Details
        </h2>

        <div className="space-y-2 text-gray-700">
          <p><strong>Service:</strong> {booking.service}</p>
          <p><strong>Provider:</strong> {booking.providerName}</p>
          <p><strong>Date:</strong> {booking.date}</p>
          <p><strong>Time:</strong> {booking.time}</p>
          <p><strong>Status:</strong> {booking.status}</p>
          <p><strong>Notes:</strong> {booking.notes || "—"}</p>
        </div>
      </aside>
    </div>
  );
}