import express from "express";
const router = express.Router();

import User from "../models/User.js";
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
      User.countDocuments({ role: "provider" }),
      Booking.countDocuments(),
      Service.countDocuments(),
      User.countDocuments({ role: "provider", verificationStatus: "pending" }),
      Booking.countDocuments({ status: "pending" }),
      User.countDocuments({ role: "provider", verificationStatus: "approved" }),
      User.countDocuments({ role: "provider", verificationStatus: "rejected" }),
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
});

router.get("/providers", protect("admin"), async (req, res) => {
  const providers = await User.find({ role: "provider" })
    .select("-password")
    .sort({ createdAt: -1 });

  res.json({ success: true, providers });
});

/* ============================
   SERVICES
============================ */
router.get("/services", protect("admin"), async (req, res) => {
  const services = await Service.find()
    .populate("provider", "name email")
    .sort({ createdAt: -1 });

  res.json({ success: true, services });
});

/* ============================
   BOOKINGS
============================ */
router.get("/bookings", protect("admin"), async (req, res) => {
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
});

/* ============================
   ANALYTICS
============================ */
router.get(
  "/analytics/bookings-per-day",
  protect("admin"),
  async (req, res) => {
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
  }
);

export default router;