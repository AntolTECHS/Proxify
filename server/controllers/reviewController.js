import Review from "../models/Review.js";
import Provider from "../models/Provider.js";

/* ============================
   HELPER: GET USER ID SAFELY
============================ */
const getUserId = (req) => {
  return req.user?.id || req.user?._id || null;
};

/* ============================
   CREATE REVIEW
============================ */
export const createReview = async (req, res) => {
  try {
    console.log("USER FROM TOKEN:", req.user);

    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const { providerId, bookingId, rating, comment } = req.body;

    /* ---------- VALIDATION ---------- */
    if (!providerId || !bookingId || !rating) {
      return res.status(400).json({
        success: false,
        message: "Provider, booking, and rating are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    /* ---------- PREVENT DUPLICATE ---------- */
    const existingReview = await Review.findOne({
      booking: bookingId,
      customer: userId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You already reviewed this booking",
      });
    }

    /* ---------- CREATE REVIEW ---------- */
    const review = await Review.create({
      customer: userId,
      provider: providerId,
      booking: bookingId,
      rating,
      comment,
    });

    /* ---------- UPDATE PROVIDER RATING ---------- */
    await Review.calculateProviderRating(providerId);

    const updatedProvider = await Provider.findById(providerId)
      .select("rating totalReviews");

    return res.status(201).json({
      success: true,
      review,
      provider: updatedProvider,
    });

  } catch (err) {
    console.error("🔥 createReview error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to create review",
    });
  }
};

/* ============================
   GET REVIEWS FOR PROVIDER
============================ */
export const getProviderReviews = async (req, res) => {
  try {
    const { providerId } = req.params;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "Provider ID is required",
      });
    }

    const reviews = await Review.find({ provider: providerId })
      .populate("customer", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });

  } catch (err) {
    console.error("🔥 getProviderReviews error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch reviews",
    });
  }
};

/* ============================
   DELETE REVIEW
============================ */
export const deleteReview = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    const { reviewId } = req.params;

    if (!reviewId) {
      return res.status(400).json({
        success: false,
        message: "Review ID is required",
      });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    /* ---------- AUTH CHECK ---------- */
    if (review.customer.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const providerId = review.provider;

    await review.deleteOne();

    /* ---------- RECALCULATE RATING ---------- */
    await Review.calculateProviderRating(providerId);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });

  } catch (err) {
    console.error("🔥 deleteReview error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to delete review",
    });
  }
};