// src/components/modals/RescheduleModal.jsx
import { useState } from "react";
import { FaTimes } from "react-icons/fa";

export default function RescheduleModal({ booking, onClose, onSave }) {
  const [date, setDate] = useState(booking.date);
  const [time, setTime] = useState(booking.time);

  const handleSubmit = () => {
    onSave({ date, time });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <FaTimes />
        </button>

        <h2 className="text-xl font-semibold text-teal-700 mb-4">
          Reschedule Booking
        </h2>

        <div className="space-y-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded-md p-2"
          />

          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full border rounded-md p-2"
          />

          <button
            onClick={handleSubmit}
            className="w-full bg-teal-600 text-white py-2 rounded-md hover:bg-teal-700 transition"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}