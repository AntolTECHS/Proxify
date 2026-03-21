// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ProviderProfile from "../models/Provider.js";

export const protect = (role) => async (req, res, next) => {
  try {
    /* ---------------- TOKEN EXTRACTION ---------------- */
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    /* ---------------- VERIFY TOKEN ---------------- */
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Session expired",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    /* ---------------- FETCH USER ---------------- */
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    /* ---------------- OPTIONAL PROFILE FETCH ---------------- */
    // Only fetch provider profile if explicitly requested
    let profile = null;
    const includeProfile = req.headers["x-include-profile"];

    if (user.role === "provider" && includeProfile) {
      profile = await ProviderProfile.findOne({ user: user._id });
    }

    /* ---------------- NORMALIZE USER OBJECT ---------------- */
    const userObj = user.toObject();

    req.user = {
      ...userObj,
      id: user._id.toString(), // 🔥 ALWAYS use this for comparisons
      _id: user._id,           // keep original ObjectId
      profile: profile ? profile.toObject() : null,
    };

    /* ---------------- ROLE CHECK ---------------- */
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
      message: "Authentication failed",
    });
  }
};