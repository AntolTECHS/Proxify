import { useState, useEffect } from "react";
import { adminService } from "../services/adminService";
import { useAuth } from "../context/AuthContext";

export const useAdmin = () => {
  const { token } = useAuth();

  const [users, setUsers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [u, p, b] = await Promise.all([
        adminService.getUsers(token),
        adminService.getProviders(token),
        adminService.getBookings(token),
      ]);

      setUsers(u);
      setProviders(p);
      setBookings(b);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id) => {
    await adminService.approveProvider(id, token);
    fetchAll();
  };

  const reject = async (id, notes) => {
    await adminService.rejectProvider(id, notes, token);
    fetchAll();
  };

  const updateBooking = async (id, status) => {
    await adminService.updateBookingStatus(id, status, token);
    fetchAll();
  };

  return {
    users,
    providers,
    bookings,
    loading,
    fetchAll,
    approve,
    reject,
    updateBooking,
  };
};