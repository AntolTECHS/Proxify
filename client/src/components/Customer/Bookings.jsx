import { useEffect, useState } from "react";
import API from "../../api/axios";

export default function Bookings() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      const res = await API.get("/bookings");
      setBookings(res.data);
    };
    fetchBookings();
  }, []);

  return (
    <div className="bg-white p-6 rounded shadow-md my-4">
      <h2 className="text-xl font-bold mb-4">My Bookings</h2>
      <ul>
        {bookings.map((b) => (
          <li key={b._id} className="border-b py-2">
            <p>Service: {b.service.name}</p>
            <p>Provider: {b.provider.name}</p>
            <p>Status: {b.status}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
