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
      index: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking is required"],
      unique: true, // one review per booking
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

/* ============================
   PRE SAVE (MODERN)
============================ */
reviewSchema.pre("save", async function () {
  // Clamp rating safely
  if (this.rating < 1) this.rating = 1;
  if (this.rating > 5) this.rating = 5;
});

/* ============================
   AUTO POPULATE (FIXED)
============================ */
reviewSchema.pre(/^find/, function () {
  // Always safe — no getOptions crash
  this.populate({
    path: "customer",
    select: "name email",
  });
});

/* ============================
   STATIC: CALCULATE PROVIDER RATING
============================ */
reviewSchema.statics.calculateProviderRating = async function (providerId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(providerId)) return;

    const providerObjectId =
      typeof providerId === "string"
        ? new mongoose.Types.ObjectId(providerId)
        : providerId;

    const stats = await this.aggregate([
      { $match: { provider: providerObjectId } },
      {
        $group: {
          _id: "$provider",
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const rating = stats.length
      ? Number(stats[0].avgRating.toFixed(1))
      : 0;

    const totalReviews = stats.length ? stats[0].totalReviews : 0;

    await mongoose.model("Provider").findByIdAndUpdate(providerId, {
      rating,
      totalReviews,
    });
  } catch (err) {
    console.error("🔥 Rating calc error:", err.message);
  }
};

/* ============================
   POST HOOKS (SAFE RECALC)
============================ */

// After create/update
reviewSchema.post("save", async function () {
  await this.constructor.calculateProviderRating(this.provider);
});

// After delete (findOneAndDelete)
reviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await doc.constructor.calculateProviderRating(doc.provider);
  }
});

// After deleteOne (document)
reviewSchema.post("deleteOne", { document: true }, async function () {
  await this.constructor.calculateProviderRating(this.provider);
});

/* ============================
   INDEXES
============================ */
reviewSchema.index({ provider: 1, createdAt: -1 });
reviewSchema.index({ provider: 1, rating: -1 });

export default mongoose.model("Review", reviewSchema);