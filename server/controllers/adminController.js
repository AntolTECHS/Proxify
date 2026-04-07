const User = require("../models/User");
const Booking = require("../models/Booking");
const Service = require("../models/Service");
const Provider = require("../models/Provider");

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
   HELPER: Format provider status
====================================================== */
const formatProviderStatus = (status) => {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending admin approval";
};

/* ======================================================
   HELPER: Normalize provider for safe response
====================================================== */
const normalizeProvider = (provider) => {
  if (!provider) return provider;

  const plain =
    typeof provider.toObject === "function" ? provider.toObject() : provider;

  return {
    ...plain,
    services: Array.isArray(plain.services) ? plain.services : [],
    documents: Array.isArray(plain.documents) ? plain.documents : [],
    resubmissions: Array.isArray(plain.resubmissions) ? plain.resubmissions : [],
    approvalBanner: plain.approvalBanner || formatProviderStatus(plain.status),
    isApproved: plain.status === "approved",
    isPending: plain.status === "pending",
    isRejected: plain.status === "rejected",
  };
};

/* ======================================================
   HELPER: Normalize booking for safe response
====================================================== */
const normalizeBooking = (booking) => {
  if (!booking) return booking;

  const plain =
    typeof booking.toObject === "function" ? booking.toObject() : booking;

  return {
    ...plain,
    service: plain.service || null,
    provider: plain.provider || null,
    customer: plain.customer || null,
  };
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
      approvedProviders,
      rejectedProviders,
      pendingBookings,
    ] = await Promise.all([
      User.countDocuments(),
      Provider.countDocuments(),
      Booking.countDocuments(),
      Service.countDocuments(),
      Provider.countDocuments({ status: "pending" }),
      Provider.countDocuments({ status: "approved" }),
      Provider.countDocuments({ status: "rejected" }),
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
        approvedProviders,
        rejectedProviders,
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
    const users = await User.find().select("-password").lean();
    res.json({ success: true, users });
  } catch (error) {
    console.error("Users error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   DELETE USER
====================================================== */
exports.deleteUser = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // Prevent admin from deleting their own account
    if (req.user?._id && String(req.user._id) === String(id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // If this user has a provider profile, clean it up too
    const providerProfile = await Provider.findOne({ user: id });

    // Delete bookings where the user is the customer
    await Booking.deleteMany({ customer: id });

    // Delete provider-related data if the user is a provider
    if (providerProfile) {
      await Booking.deleteMany({ provider: providerProfile._id });
      await Service.deleteMany({ provider: providerProfile._id });
      await Provider.deleteOne({ _id: providerProfile._id });
    }

    // Finally delete the user
    await User.deleteOne({ _id: id });

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   PROVIDERS
====================================================== */
exports.getProviders = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const providers = await Provider.find()
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      providers: providers.map(normalizeProvider),
    });
  } catch (error) {
    console.error("Providers error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProviderById = async (req, res) => {
  if (!checkAdmin(req, res)) return;

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

    res.json({ success: true, provider: normalizeProvider(provider) });
  } catch (error) {
    console.error("Provider details error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPendingProviders = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const providers = await Provider.find({ status: "pending" })
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      providers: providers.map(normalizeProvider),
    });
  } catch (error) {
    console.error("Pending providers error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRejectedProviders = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const providers = await Provider.find({ status: "rejected" })
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      providers: providers.map(normalizeProvider),
    });
  } catch (error) {
    console.error("Rejected providers error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ======================================================
   APPROVE PROVIDER
====================================================== */
exports.approveProvider = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    provider.status = "approved";
    provider.approvalBanner = "Approved";
    provider.rejectionReason = "";

    await provider.save();

    res.json({
      success: true,
      message: "Provider approved",
      provider: normalizeProvider(provider),
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
    const reason = req.body?.notes || req.body?.reason || req.body?.rejectionReason;

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    provider.status = "rejected";
    provider.approvalBanner = "Rejected";
    provider.rejectionReason = String(reason).trim();

    await provider.save();

    res.json({
      success: true,
      message: "Provider rejected",
      provider: normalizeProvider(provider),
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
      .populate("service", "name price")
      .populate("provider", "basicInfo.providerName basicInfo.email status")
      .populate("customer", "name email")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, bookings: bookings.map(normalizeBooking) });
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
      booking: normalizeBooking(booking),
    });
  } catch (error) {
    console.error("Update booking error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBooking = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const deleted = await Booking.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

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