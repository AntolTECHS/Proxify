// routes/authRoutes.js
import express from "express";
import { register, login } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.post("/register", register);
router.post("/login", login);

// Protected example
router.get("/me", protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

export default router;