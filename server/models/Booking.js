const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "completed", "cancelled"],
      default: "pending",
    },
    scheduledAt: { type: Date, required: true },
    notes: { type: String },
    location: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", BookingSchema);
