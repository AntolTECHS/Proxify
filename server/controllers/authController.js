// controllers/authController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET is not set in environment variables.");
}

/**
 * Helper - generate JWT token
 * @param {ObjectId} userId
 * @returns {String} token
 */
function generateToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET || "temporary_secret", {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/* ======================================================
   REGISTER (Customer / Provider)
   - returns token + sanitized user object
====================================================== */
exports.register = async (req, res) => {
  try {
    // Debug log (remove in production if desired)
    console.log("AUTH_REGISTER_PAYLOAD:", req.body);

    const { name, email, password, role, phone } = req.body || {};

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email and password are required." });
    }

    // Normalize
    const normalizedEmail = String(email).trim().toLowerCase();

    // Role handling
    const allowedRoles = ["customer", "provider"];
    const finalRole = allowedRoles.includes(role) ? role : "customer";

    // Provider must supply phone
    if (finalRole === "provider" && (!phone || String(phone).trim() === "")) {
      return res.status(400).json({ success: false, message: "Phone number is required for providers." });
    }

    // Check duplicate
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User with that email already exists." });
    }

    // Hash password (controller-level)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Build user payload
    const userPayload = {
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: finalRole,
      providerFormData: {},
    };

    if (finalRole === "provider") {
      userPayload.phone = phone;
      userPayload.isVerified = false;
      userPayload.verificationStatus = "pending";
    } else {
      // customers are considered verified by default in your flow
      userPayload.isVerified = true;
      userPayload.verificationStatus = "approved";
    }

    // Create user
    const user = await User.create(userPayload);

    // Generate token so frontend can auto-login
    const token = generateToken(user._id);

    // Respond with sanitized user
    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || null,
      isVerified: !!user.isVerified,
      verificationStatus: user.verificationStatus || (user.role === "provider" ? "pending" : "approved"),
      createdAt: user.createdAt,
    };

    return res.status(201).json({
      success: true,
      message: finalRole === "provider"
        ? "Provider account created. Verification pending admin approval."
        : "User registered successfully.",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({ success: false, message: "Registration failed.", error: error.message });
  }
};

/* ======================================================
   LOGIN
   - returns token + sanitized user object
====================================================== */
exports.login = async (req, res) => {
  try {
    console.log("AUTH_LOGIN_PAYLOAD:", req.body);

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials." });
    }

    // Block rejected providers
    if (user.role === "provider" && user.verificationStatus === "rejected") {
      return res.status(403).json({
        success: false,
        message: "Your provider account has been rejected. Please contact support.",
      });
    }

    const token = generateToken(user._id);

    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || null,
      isVerified: !!user.isVerified,
      verificationStatus: user.role === "provider" ? user.verificationStatus : "approved",
      createdAt: user.createdAt,
    };

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ success: false, message: "Login failed.", error: error.message });
  }
};
