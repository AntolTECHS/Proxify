import mongoose from "mongoose";

const providerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    basicInfo: {
      providerName: { type: String, required: true },
      email: { type: String, required: true },
      phone: String,
      location: String,
      businessName: String,
      bio: String,
    },
    services: [{ name: String, price: Number }],
    servicesDescription: String,
    availability: {},
    documents: [{ name: String, path: String, size: Number, type: String }],
    documentsText: String,
  },
  { timestamps: true }
);

export default mongoose.model("Provider", providerSchema);