import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addBooking,
  getUserBookings,
  getProviderBookings,
} from "../controllers/bookingController.js";

const router = express.Router();

// Customer adds a booking
router.post("/add", protect("customer"), addBooking);

// Get bookings by user
router.get("/user/:userId", protect("customer"), getUserBookings);

// Get bookings by provider
router.get("/provider/:providerId", protect("provider"), getProviderBookings);

export default router;