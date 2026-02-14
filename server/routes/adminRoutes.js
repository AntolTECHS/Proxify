const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Booking = require("../models/Booking");
const Service = require("../models/Service");
const authMiddleware = require("../middleware/authMiddleware");

/* ============================
   Admin Middleware
============================ */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied. Admins only." });
  }
  next();
};

/* ============================
   USERS MANAGEMENT
============================ */

// GET all users (with pagination)
router.get("/users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments();

    res.status(200).json({
      success: true,
      users,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch users", error: err.message });
  }
});

// GET all providers
router.get("/providers", authMiddleware, adminOnly, async (req, res) => {
  try {
    const providers = await User.find({ role: "provider" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, providers });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch providers", error: err.message });
  }
});

/* ============================
   PROVIDER VERIFICATION
============================ */

// Approve provider
router.put("/providers/:id/approve", authMiddleware, adminOnly, async (req, res) => {
  try {
    const provider = await User.findById(req.params.id);
    if (!provider || provider.role !== "provider") {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    provider.isVerified = true;
    provider.verificationStatus = "approved";
    provider.verificationNotes = "";
    provider.verifiedAt = new Date();
    await provider.save();

    res.status(200).json({ success: true, message: "Provider approved", provider });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to approve provider", error: err.message });
  }
});

// Reject provider
router.put("/providers/:id/reject", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { notes } = req.body;
    const provider = await User.findById(req.params.id);
    if (!provider || provider.role !== "provider") {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    provider.isVerified = false;
    provider.verificationStatus = "rejected";
    provider.verificationNotes = notes || "No reason provided";
    provider.verifiedAt = null;
    await provider.save();

    res.status(200).json({ success: true, message: "Provider rejected", provider });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to reject provider", error: err.message });
  }
});

/* ============================
   SERVICES MANAGEMENT
============================ */

// GET all services (with provider info)
router.get("/services", authMiddleware, adminOnly, async (req, res) => {
  try {
    const services = await Service.find()
      .populate("provider", "name email isVerified")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, services });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch services", error: err.message });
  }
});

// DELETE a service
router.delete("/services/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });

    await service.deleteOne();
    res.status(200).json({ success: true, message: "Service deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete service", error: err.message });
  }
});

/* ============================
   BOOKINGS MANAGEMENT
============================ */

// GET all bookings
router.get("/bookings", authMiddleware, adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("customer", "name email phone")
      .populate("provider", "name email phone isVerified")
      .populate("service", "name description cost")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch bookings", error: err.message });
  }
});

// Update booking status
router.put("/bookings/:id/status", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "accepted", "completed", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    booking.status = status;
    await booking.save();

    res.status(200).json({ success: true, message: "Booking status updated", booking });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update booking", error: err.message });
  }
});

module.exports = router;
