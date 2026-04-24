// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ProviderProfile from "../models/Provider.js";

const buildAuthError = (res, message, status = 401) => {
  return res.status(status).json({
    success: false,
    message,
  });
};

export const protect = (requiredRole = null) => async (req, res, next) => {
  try {
    /* ---------------- TOKEN EXTRACTION ---------------- */
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return buildAuthError(res, "No token provided", 401);
    }

    const token = authHeader.split(" ")[1];

    /* ---------------- VERIFY TOKEN ---------------- */
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err?.name === "TokenExpiredError") {
        return buildAuthError(res, "Session expired", 401);
      }

      return buildAuthError(res, "Invalid token", 401);
    }

    /* ---------------- FETCH USER ---------------- */
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return buildAuthError(res, "User not found", 401);
    }

    /* ---------------- OPTIONAL PROFILE FETCH ---------------- */
    let profile = null;
    const includeProfile = req.headers["x-include-profile"];

    if (user.role === "provider" && includeProfile) {
      profile = await ProviderProfile.findOne({ user: user._id });
    }

    /* ---------------- NORMALIZE USER OBJECT ---------------- */
    const userObj = user.toObject();

    req.user = {
      ...userObj,
      id: user._id.toString(),
      _id: user._id,
      profile: profile ? profile.toObject() : null,
    };

    /* ---------------- ROLE CHECK ---------------- */
    if (requiredRole && user.role !== requiredRole) {
      return buildAuthError(res, "Access denied", 403);
    }

    next();
  } catch (err) {
    console.error("🔥 AuthMiddleware error:", err.message);

    return buildAuthError(res, "Authentication failed", 401);
  }
};

export const adminOnly = protect("admin");
export const providerOnly = protect("provider");
export const customerOnly = protect("customer");