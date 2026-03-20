// routes/reviewRoutes.js
import express from "express";
import {
  createReview,
  getProviderReviews,
  deleteReview
} from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ============================
   CUSTOMER REVIEW ROUTES
============================ */

/**
 * @route   POST /api/reviews
 * @desc    Create a new review for a booking
 * @access  Customer only
 */
router.post("/", protect("customer"), createReview);

/**
 * @route   GET /api/reviews/:providerId
 * @desc    Get all reviews for a specific provider
 * @access  Public
 */
router.get("/:providerId", getProviderReviews);

/**
 * @route   DELETE /api/reviews/:reviewId
 * @desc    Delete a review (only by the customer who created it)
 * @access  Customer only
 */
router.delete("/:reviewId", protect("customer"), deleteReview);

export default router;