const User = require("../models/User");
const ProviderProfile = require("../models/ProviderProfile");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* ======================================================
   REGISTER (Customer / Provider)
====================================================== */
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const allowedRoles = ["customer", "provider"];
    const finalRole = allowedRoles.includes(role) ? role : "customer";

    if (finalRole === "provider" && !phone) {
      return res.status(400).json({ message: "Phone number is required for providers" });
    }

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      name,
      email,
      password: hashedPassword,
      role: finalRole,
    };

    if (finalRole === "provider") {
      userData.phone = phone;
      userData.isVerified = false;
      userData.verificationStatus = "pending";
    }

    const user = await User.create(userData);

    // Create provider profile if needed
    if (finalRole === "provider") {
      await ProviderProfile.create({ user: user._id });
    }

    res.status(201).json({
      message:
        finalRole === "provider"
          ? "Provider account created. Verification pending admin approval."
          : "User registered successfully",
      role: user.role,
      verificationStatus: user.verificationStatus || "approved",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ======================================================
   LOGIN
====================================================== */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Block rejected providers
    if (user.role === "provider" && user.verificationStatus === "rejected") {
      return res.status(403).json({
        message: "Your provider account has been rejected. Please contact support.",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        isVerified: user.isVerified,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isVerified: user.isVerified,
        verificationStatus:
          user.role === "provider" ? user.verificationStatus : "approved",
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ======================================================
   PROVIDER: GET OWN PROFILE
====================================================== */
exports.getMyProfile = async (req, res) => {
  try {
    const profile = await ProviderProfile.findOne({ user: req.user.id })
      .populate("user", "name email role verificationStatus phone");

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ======================================================
   PROVIDER: UPDATE PROFILE
====================================================== */
exports.updateMyProfile = async (req, res) => {
  try {
    const { bio, address, coordinates, profileImage, services, experience } =
      req.body;

    let profile = await ProviderProfile.findOne({ user: req.user.id });
    if (!profile) profile = new ProviderProfile({ user: req.user.id });

    if (bio) profile.bio = bio;
    if (profileImage) profile.profileImage = profileImage;
    if (services) profile.services = services;
    if (experience) profile.experience = experience;

    if (address || coordinates) {
      profile.location = {
        address: address || profile.location?.address,
        coordinates: coordinates || profile.location?.coordinates,
      };
    }

    await profile.save();

    res.json({
      message: "Profile updated successfully",
      profile,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ======================================================
   ADMIN: GET ALL PROVIDERS
====================================================== */
exports.getAllProvidersForReview = async (req, res) => {
  try {
    const providers = await User.find({ role: "provider" })
      .sort({ verificationStatus: 1, createdAt: -1 })
      .select("-password");

    res.json(providers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ======================================================
   ADMIN: APPROVE PROVIDER
====================================================== */
exports.approveProvider = async (req, res) => {
  try {
    const { providerId } = req.params;

    const provider = await User.findById(providerId);
    if (!provider || provider.role !== "provider") {
      return res.status(404).json({ message: "Provider not found" });
    }

    provider.isVerified = true;
    provider.verificationStatus = "approved";
    provider.verifiedAt = new Date();
    provider.verificationNotes = undefined;

    await provider.save();

    res.json({
      message: "Provider approved successfully",
      providerId: provider._id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ======================================================
   ADMIN: REJECT PROVIDER
====================================================== */
exports.rejectProvider = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const provider = await User.findById(providerId);
    if (!provider || provider.role !== "provider") {
      return res.status(404).json({ message: "Provider not found" });
    }

    provider.isVerified = false;
    provider.verificationStatus = "rejected";
    provider.verificationNotes = reason;

    await provider.save();

    res.json({
      message: "Provider rejected",
      providerId: provider._id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
