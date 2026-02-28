// controllers/bookingController.js
import Booking from "../models/Booking.js";

/* ---------------- Add Booking (Customer) ---------------- */
export const addBooking = async (req, res) => {
  try {
    const { serviceId, providerId, date } = req.body;

    if (!serviceId || !providerId || !date) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const booking = await Booking.create({
      customer: req.user._id,
      provider: providerId,
      service: serviceId,
      date,
      status: "pending",
    });

    res.status(201).json({ success: true, booking });
  } catch (err) {
    console.error("ADD BOOKING ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ---------------- Get bookings by user ---------------- */
export const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.params.userId }).populate("service provider");
    res.status(200).json({ success: true, bookings });
  } catch (err) {
    console.error("GET USER BOOKINGS ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ---------------- Get bookings by provider ---------------- */
export const getProviderBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ provider: req.params.providerId }).populate("service customer");
    res.status(200).json({ success: true, bookings });
  } catch (err) {
    console.error("GET PROVIDER BOOKINGS ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};