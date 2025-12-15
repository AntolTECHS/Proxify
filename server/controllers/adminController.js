const User = require("../models/User");
const Booking = require("../models/Booking");

// Get all users
exports.getAllUsers = async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all bookings
exports.getAllBookings = async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });
  try {
    const bookings = await Booking.find().populate("service provider customer");
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
