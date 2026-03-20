// models/Review.js
import mongoose from "mongoose";

/* ============================
   Review Schema
============================ */
const reviewSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer is required"],
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: [true, "Provider is required"],
      index: true, // faster queries by provider
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking is required"],
      unique: true, // ensures one review per booking
    },
    rating: {
      type: Number,
      min: [1, "Rating cannot be below 1"],
      max: [5, "Rating cannot exceed 5"],
      required: [true, "Rating is required"],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, "Comment cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ============================
   Middleware / Hooks
============================ */
// Ensure rating stays within bounds
reviewSchema.pre("save", function () {
  if (this.rating < 1) this.rating = 1;
  if (this.rating > 5) this.rating = 5;
});

// Automatically populate customer when fetching reviews
reviewSchema.pre(/^find/, function () {
  this.populate({ path: "customer", select: "name email" });
});

/* ============================
   Static Method: calculateProviderRating
   Use this to recalc avg rating for a provider
============================ */
reviewSchema.statics.calculateProviderRating = async function (providerId) {
  const stats = await this.aggregate([
    { $match: { provider: mongoose.Types.ObjectId(providerId) } },
    {
      $group: {
        _id: "$provider",
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await mongoose.model("Provider").findByIdAndUpdate(providerId, {
      rating: stats[0].avgRating.toFixed(1),
      totalReviews: stats[0].totalReviews,
    });
  } else {
    await mongoose.model("Provider").findByIdAndUpdate(providerId, {
      rating: 0,
      totalReviews: 0,
    });
  }
};

/* ============================
   Indexes
============================ */
reviewSchema.index({ provider: 1, rating: -1 }); // query reviews by provider with sorting

export default mongoose.model("Review", reviewSchema);