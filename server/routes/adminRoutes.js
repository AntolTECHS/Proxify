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
    return res
      .status(403)
      .json({ success: false, message: "Access denied. Admins only." });
  }
  next();
};

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
router.get("/summary", authMiddleware, adminOnly, async (req, res) => {
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

    return res.status(200).json({
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
    console.error("GET /admin/summary error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard summary",
      error: err.message,
    });
  }
});

/* ============================
   USERS MANAGEMENT
============================ */

// GET all users (with pagination)
router.get("/users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    return res.status(200).json({
      success: true,
      users,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error("GET /admin/users error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: err.message,
    });
  }
});

// GET all providers
router.get("/providers", authMiddleware, adminOnly, async (req, res) => {
  try {
    const providers = await User.find({ role: "provider" })
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, providers });
  } catch (err) {
    console.error("GET /admin/providers error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch providers",
      error: err.message,
    });
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
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    provider.isVerified = true;
    provider.verificationStatus = "approved";
    provider.verificationNotes = "";
    provider.verifiedAt = new Date();

    await provider.save();

    return res.status(200).json({
      success: true,
      message: "Provider approved",
      provider,
    });
  } catch (err) {
    console.error("PUT /admin/providers/:id/approve error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to approve provider",
      error: err.message,
    });
  }
});

// Reject provider
router.put("/providers/:id/reject", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { notes } = req.body;

    if (!notes || !notes.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const provider = await User.findById(req.params.id);

    if (!provider || provider.role !== "provider") {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    provider.isVerified = false;
    provider.verificationStatus = "rejected";
    provider.verificationNotes = notes.trim();
    provider.verifiedAt = null;

    await provider.save();

    return res.status(200).json({
      success: true,
      message: "Provider rejected",
      provider,
    });
  } catch (err) {
    console.error("PUT /admin/providers/:id/reject error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to reject provider",
      error: err.message,
    });
  }
});

/* ============================
   SERVICES MANAGEMENT
============================ */

// GET all services (with provider info)
router.get("/services", authMiddleware, adminOnly, async (req, res) => {
  try {
    const services = await Service.find()
      .populate("provider", "name email isVerified verificationStatus")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, services });
  } catch (err) {
    console.error("GET /admin/services error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch services",
      error: err.message,
    });
  }
});

// DELETE a service
router.delete("/services/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    await service.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Service deleted",
    });
  } catch (err) {
    console.error("DELETE /admin/services/:id error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete service",
      error: err.message,
    });
  }
});

/* ============================
   BOOKINGS MANAGEMENT
============================ */

// GET all bookings
router.get("/bookings", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const bookings = await Booking.find()
      .populate("customer", "name email phone")
      .populate("provider", "name email phone isVerified verificationStatus")
      .populate("service", "name description cost")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments();

    return res.status(200).json({
      success: true,
      bookings,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error("GET /admin/bookings error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      error: err.message,
    });
  }
});

// Update booking status
router.put("/bookings/:id/status", authMiddleware, adminOnly, async (req, res) => {
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
    const allowedNextStatuses = bookingTransitions[currentStatus] || [];

    if (currentStatus !== status && !allowedNextStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change booking from ${currentStatus} to ${status}`,
      });
    }

    booking.status = status;
    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Booking status updated",
      booking,
    });
  } catch (err) {
    console.error("PUT /admin/bookings/:id/status error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update booking",
      error: err.message,
    });
  }
});

// DELETE a booking
router.delete("/bookings/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    await booking.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Booking deleted",
    });
  } catch (err) {
    console.error("DELETE /admin/bookings/:id error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete booking",
      error: err.message,
    });
  }
});

/* ============================
   ANALYTICS
============================ */

// Bookings per day for chart
router.get(
  "/analytics/bookings-per-day",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const data = await Booking.aggregate([
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      return res.status(200).json({
        success: true,
        data: data.map((item) => ({
          date: item._id,
          count: item.count,
        })),
      });
    } catch (err) {
      console.error("GET /admin/analytics/bookings-per-day error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch booking analytics",
        error: err.message,
      });
    }
  }
);

module.exports = router;