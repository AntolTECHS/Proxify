const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Booking = require("../models/Booking");
const Service = require("../models/Service");
const User = require("../models/User");

/* ============================
   Authenticated Customer Routes
============================ */

// GET customer profile
router.get("/me", authMiddleware, async (req, res) => {
  if (req.user.role !== "customer") {
    return res.status(403).json({ success: false, message: "Access denied" });
  }
  res.status(200).json({ success: true, customer: req.user });
});

// GET all providers (with verification info)
router.get("/providers", authMiddleware, async (req, res) => {
  try {
    const providers = await User.find({ role: "provider" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, providers });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch providers", error: err.message });
  }
});

// GET all services
router.get("/services", authMiddleware, async (req, res) => {
  try {
    const services = await Service.find()
      .populate("provider", "name isVerified")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, services });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch services", error: err.message });
  }
});

// CREATE a booking
router.post("/bookings", authMiddleware, async (req, res) => {
  try {
    const { providerId, serviceId, scheduledAt, notes, location } = req.body;

    const provider = await User.findById(providerId);
    if (!provider || provider.role !== "provider") {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const booking = await Booking.create({
      customer: req.user._id,
      provider: provider._id,
      service: service._id,
      scheduledAt,
      notes,
      location,
      status: "pending",
    });

    res.status(201).json({ success: true, message: "Booking created", booking });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create booking", error: err.message });
  }
});

// GET customer bookings
router.get("/bookings", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.user._id })
      .populate("provider", "name email isVerified")
      .populate("service", "name description cost")
      .sort({ scheduledAt: -1 });

    res.status(200).json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch bookings", error: err.message });
  }
});

// CANCEL a booking
router.put("/bookings/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.customer.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    booking.status = "cancelled";
    await booking.save();

    res.status(200).json({ success: true, message: "Booking cancelled", booking });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to cancel booking", error: err.message });
  }
});

module.exports = router;
