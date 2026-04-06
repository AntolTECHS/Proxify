const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
      index: true,
    },

    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    serviceName: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "in_progress", "completed", "cancelled"],
      default: "pending",
    },

    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    lat: Number,
    lng: Number,

    notes: {
      type: String,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "card", "mobile_money"],
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
    },

    feedback: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

/* ✅ AUTO PAYMENT UPDATE (NO next()) */
bookingSchema.pre("save", function () {
  if (this.isModified("status") && this.status === "completed") {
    this.paymentStatus = "paid";
  }
});

module.exports = mongoose.model("Booking", bookingSchema);