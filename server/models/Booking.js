const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    /* ================= CUSTOMER ================= */

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    /* ================= PROVIDER ================= */

    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
      index: true
    },

    /* ================= SERVICE ================= */

    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    serviceName: {
      type: String,
      required: true
    },

    /* ================= STATUS ================= */

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "in_progress",
        "completed",
        "cancelled"
      ],
      default: "pending"
    },

    /* ================= SCHEDULE ================= */

    scheduledAt: {
      type: Date,
      required: true,
      index: true
    },

    /* ================= LOCATION ================= */

    location: {
      type: String,
      required: true,
      trim: true
    },

    lat: Number,
    lng: Number,

    /* ================= NOTES ================= */

    notes: {
      type: String,
      trim: true
    },

    /* ================= PAYMENT ================= */

    price: {
      type: Number,
      required: true,
      min: 0
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid"
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "card", "mobile_money"]
    },

    /* ================= FEEDBACK ================= */

    rating: {
      type: Number,
      min: 1,
      max: 5
    },

    feedback: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);