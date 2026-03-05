import mongoose from "mongoose";

const providerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved"
    },

    basicInfo: {
      providerName: { type: String, required: true },
      email: { type: String, required: true },
      phone: String,
      location: String,
      businessName: String,
      bio: String,
      photoURL: String,
    },

    category: String,
    experience: String,
    lat: Number,
    lng: Number,

    services: [{ name: String, price: Number }],

    documents: [{ name: String, path: String, size: Number, type: String }],
  },
  { timestamps: true }
);

export default mongoose.model("Provider", providerSchema);