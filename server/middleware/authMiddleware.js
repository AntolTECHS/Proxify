const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Protect routes by verifying JWT
 * Optionally restrict access to specific roles
 * @param {Array|string} roles - allowed roles (e.g., "admin" or ["admin", "provider"])
 */
const protect = (roles = []) => async (req, res, next) => {
  try {
    // 1️⃣ Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // 2️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3️⃣ Fetch user
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });

    // 4️⃣ Role-based access
    if (roles.length > 0) {
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Forbidden: Access denied" });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    res.status(401).json({ message: "Invalid token", error: err.message });
  }
};

module.exports = protect;
