import express from "express";
const router = express.Router();

import User from "../models/User.js";
import Provider from "../models/Provider.js"; // ✅ NEW
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import { protect } from "../middleware/authMiddleware.js";

/* ============================
   Helpers
============================ */
const parsePagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const validBookingStatuses = ["pending", "accepted", "completed", "cancelled"];

const bookingTransitions = {
  pending: ["accepted", "cancelled"],
  accepted: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/* ============================
   DASHBOARD SUMMARY
============================ */
router.get("/summary", protect("admin"), async (req, res) => {
  try {
    const [
      totalUsers,
      totalProviders,
      totalBookings,
      totalServices,
      pendingProviders,
      pendingBookings,
      approvedProviders,
      rejectedProviders,
    ] = await Promise.all([
      User.countDocuments(),
      Provider.countDocuments(), // ✅ FIXED
      Booking.countDocuments(),
      Service.countDocuments(),
      Provider.countDocuments({ status: "pending" }), // ✅ FIXED
      Booking.countDocuments({ status: "pending" }),
      Provider.countDocuments({ status: "approved" }), // ✅ FIXED
      Provider.countDocuments({ status: "rejected" }), // ✅ FIXED
    ]);

    res.json({
      success: true,
      summary: {
        totalUsers,
        totalProviders,
        totalBookings,
        totalServices,
        pendingProviders,
        pendingBookings,
        approvedProviders,
        rejectedProviders,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================
   USERS
============================ */
router.get("/users", protect("admin"), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      success: true,
      users,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================
   PROVIDERS
============================ */

// 🔹 Get all providers (list view)
router.get("/providers", protect("admin"), async (req, res) => {
  try {
    const providers = await Provider.find()
      .select("basicInfo status services category rating reviewCount createdAt")
      .sort({ createdAt: -1 });

    res.json({ success: true, providers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 🔹 Get single provider (DETAIL VIEW - modal)
router.get("/providers/:id", protect("admin"), async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id)
      .populate("user", "name email role")
      .lean();

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    res.json({ success: true, provider });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================
   SERVICES
============================ */
router.get("/services", protect("admin"), async (req, res) => {
  try {
    const services = await Service.find()
      .populate("provider", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, services });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================
   BOOKINGS
============================ */
router.get("/bookings", protect("admin"), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const bookings = await Booking.find()
      .populate("customer", "name email phone")
      .populate("provider", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments();

    res.json({
      success: true,
      bookings,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================
   UPDATE BOOKING STATUS
============================ */
router.put("/bookings/:id/status", protect("admin"), async (req, res) => {
  try {
    const { status } = req.body;

    if (!validBookingStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const currentStatus = booking.status;
    const allowedNext = bookingTransitions[currentStatus] || [];

    if (currentStatus !== status && !allowedNext.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change from ${currentStatus} to ${status}`,
      });
    }

    booking.status = status;
    await booking.save();

    res.json({
      success: true,
      message: "Booking updated",
      booking,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================
   DELETE BOOKING
============================ */
router.delete("/bookings/:id", protect("admin"), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    await booking.deleteOne();

    res.json({
      success: true,
      message: "Booking deleted",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================
   ANALYTICS
============================ */
router.get("/analytics/bookings-per-day", protect("admin"), async (req, res) => {
  try {
    const data = await Booking.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: data.map((d) => ({ date: d._id, count: d.count })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;