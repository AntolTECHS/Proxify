const User = require("../models/User");
const Booking = require("../models/Booking");
const Service = require("../models/Service");

/* ======================================================
   HELPER: Ensure admin access
====================================================== */
const checkAdmin = (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ success: false, message: "Access denied" });
    return false;
  }
  return true;
};

/* ======================================================
   DASHBOARD SUMMARY
====================================================== */
exports.getSummary = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const [
      totalUsers,
      totalProviders,
      totalBookings,
      totalServices,
      pendingProviders,
      pendingBookings,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "provider" }),
      Booking.countDocuments(),
      Service.countDocuments(),
      User.countDocuments({ role: "provider", verificationStatus: "pending" }),
      Booking.countDocuments({ status: "pending" }),
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
      },
    });
  } catch (error) {
    console.error("Summary error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   USERS
====================================================== */
exports.getAllUsers = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const users = await User.find().select("-password");
    res.json({ success: true, users });
  } catch (error) {
    console.error("Users error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   PROVIDERS
====================================================== */
exports.getProviders = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const providers = await User.find({ role: "provider" }).select("-password");
    res.json({ success: true, providers });
  } catch (error) {
    console.error("Providers error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPendingProviders = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const providers = await User.find({
      role: "provider",
      verificationStatus: "pending",
    }).select("-password");

    res.json({ success: true, providers });
  } catch (error) {
    console.error("Pending providers error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   APPROVE PROVIDER
====================================================== */
exports.approveProvider = async (req, res) => {
  if (!checkAdmin(req, res)) return;

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

    res.json({
      success: true,
      message: "Provider approved",
      provider,
    });
  } catch (error) {
    console.error("Approve provider error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   REJECT PROVIDER
====================================================== */
exports.rejectProvider = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const { notes } = req.body; // ✅ FIXED (was reason)

    if (!notes || !notes.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const provider = await User.findById(req.params.id);

    if (!provider || provider.role !== "provider") {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    provider.isVerified = false;
    provider.verificationStatus = "rejected";
    provider.verificationNotes = notes.trim();
    provider.verifiedAt = null;

    await provider.save();

    res.json({
      success: true,
      message: "Provider rejected",
      provider,
    });
  } catch (error) {
    console.error("Reject provider error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   BOOKINGS
====================================================== */
exports.getAllBookings = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const bookings = await Booking.find()
      .populate("service", "name cost")
      .populate("provider", "name email")
      .populate("customer", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    console.error("Bookings error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const { status } = req.body;

    const validStatuses = ["pending", "accepted", "completed", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    booking.status = status;
    await booking.save();

    res.json({
      success: true,
      message: "Booking updated",
      booking,
    });
  } catch (error) {
    console.error("Update booking error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBooking = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    await Booking.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Booking deleted",
    });
  } catch (error) {
    console.error("Delete booking error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   ANALYTICS
====================================================== */
exports.getBookingAnalytics = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const stats = await Booking.aggregate([
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
      data: stats.map((s) => ({
        date: s._id,
        count: s.count,
      })),
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};