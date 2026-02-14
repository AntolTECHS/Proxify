const User = require("../models/User");
const Booking = require("../models/Booking");

/* ======================================================
   HELPER: Ensure admin access
====================================================== */
const checkAdmin = (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ message: "Access denied" });
    return false;
  }
  return true;
};

/* ======================================================
   GET ALL USERS (ADMIN)
====================================================== */
exports.getAllUsers = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ======================================================
   GET ALL BOOKINGS (ADMIN)
====================================================== */
exports.getAllBookings = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const bookings = await Booking.find()
      .populate("service provider customer", "name email")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ======================================================
   GET ALL PENDING PROVIDERS
====================================================== */
exports.getPendingProviders = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const providers = await User.find({
      role: "provider",
      verificationStatus: "pending",
    }).select("-password");
    res.json(providers);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      return res.status(404).json({ message: "Provider not found" });
    }

    provider.isVerified = true;
    provider.verificationStatus = "approved";
    provider.verifiedAt = new Date();

    await provider.save();

    res.json({
      message: "Provider approved successfully",
      provider: {
        id: provider._id,
        name: provider.name,
        email: provider.email,
        isVerified: provider.isVerified,
        verificationStatus: provider.verificationStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ======================================================
   REJECT PROVIDER
====================================================== */
exports.rejectProvider = async (req, res) => {
  if (!checkAdmin(req, res)) return;

  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: "Rejection reason is required" });

    const provider = await User.findById(req.params.id);

    if (!provider || provider.role !== "provider") {
      return res.status(404).json({ message: "Provider not found" });
    }

    provider.isVerified = false;
    provider.verificationStatus = "rejected";
    provider.verificationNotes = reason;

    await provider.save();

    res.json({
      message: "Provider rejected successfully",
      provider: {
        id: provider._id,
        name: provider.name,
        email: provider.email,
        isVerified: provider.isVerified,
        verificationStatus: provider.verificationStatus,
        verificationNotes: provider.verificationNotes,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
