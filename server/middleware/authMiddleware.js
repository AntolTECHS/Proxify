// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ProviderProfile from "../models/Provider.js";

export const protect = (role) => async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    let profile = null;
    if (user.role === "provider") {
      profile = await ProviderProfile.findOne({ user: user._id });
    }

    // ✅ FIX: include BOTH id and _id
    req.user = {
      id: user._id.toString(), // 🔥 IMPORTANT FIX
      ...user.toObject(),
      profile: profile ? profile.toObject() : null,
    };

    // Role check
    if (role && user.role !== role) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    next();
  } catch (err) {
    console.error("🔥 AuthMiddleware error:", err.message);
    return res.status(401).json({
      success: false,
      message: "Token invalid or expired",
    });
  }
};