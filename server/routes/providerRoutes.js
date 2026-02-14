const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");
const Service = require("../models/Service");
const Booking = require("../models/Booking");

/* ============================
   Authenticated Provider Routes
============================ */

// GET provider profile
router.get("/me", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "provider") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    const provider = await User.findById(req.user._id).select("-password");
    res.status(200).json({ success: true, provider });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch profile", error: err.message });
  }
});

// GET provider's services
router.get("/services", authMiddleware, async (req, res) => {
  try {
    const services = await Service.find({ provider: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, services });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch services", error: err.message });
  }
});

// ADD a service
router.post("/services", authMiddleware, async (req, res) => {
  try {
    const { name, description, cost } = req.body;
    const service = await Service.create({ name, description, cost, provider: req.user._id });
    res.status(201).json({ success: true, message: "Service added", service });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to add service", error: err.message });
  }
});

// UPDATE a service
router.put("/services/:id", authMiddleware, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service || service.provider.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const { name, description, cost } = req.body;
    service.name = name || service.name;
    service.description = description || service.description;
    service.cost = cost ?? service.cost;

    await service.save();
    res.status(200).json({ success: true, message: "Service updated", service });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update service", error: err.message });
  }
});

// DELETE a service
router.delete("/services/:id", authMiddleware, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service || service.provider.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    await service.deleteOne();
    res.status(200).json({ success: true, message: "Service deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete service", error: err.message });
  }
});

// GET provider's bookings
router.get("/bookings", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ provider: req.user._id })
      .populate("customer", "name email phone")
      .populate("service", "name description cost")
      .sort({ scheduledAt: -1 });

    res.status(200).json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch bookings", error: err.message });
  }
});

// UPDATE booking status by provider
router.put("/bookings/:id/status", authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.provider.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const { status } = req.body;
    if (!["pending", "accepted", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    booking.status = status;
    await booking.save();

    res.status(200).json({ success: true, message: "Booking status updated", booking });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update booking", error: err.message });
  }
});

module.exports = router;
