const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["ID", "Certificate", "License", "Other"],
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    fileUrl: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    notes: {
      type: String, // Admin can add rejection reason
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", DocumentSchema);
