const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    category: {
      type: String,
      enum: ["Cleaning", "Plumbing", "Relocation", "Electrical", "Painting", "Other"],
      default: "Other",
    },

    cost: {
      type: Number,
      required: true,
      min: 0,
    },

    duration: {
      type: Number, // Estimated duration in hours
      min: 0,
    },

    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", ServiceSchema);
