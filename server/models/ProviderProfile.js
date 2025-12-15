const mongoose = require("mongoose");

const ProviderProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bio: { type: String },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
    location: {
      address: { type: String },
      coordinates: { type: [Number], index: "2dsphere" },
    },
    rating: { type: Number, default: 0 },
    profileImage: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProviderProfile", ProviderProfileSchema);
