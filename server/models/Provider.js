import mongoose from "mongoose";

/* ================= SERVICES ================= */

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    price: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: true }
);


/* ================= DOCUMENTS ================= */

const documentSchema = new mongoose.Schema(
  {
    name: String,
    path: String,
    size: Number,
    type: String
  },
  { _id: false }
);


/* ================= PROVIDER ================= */

const providerSchema = new mongoose.Schema(
  {
    /* Linked user account */

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    /* Admin approval */

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved"
    },

    /* Availability for customers */

    availabilityStatus: {
      type: String,
      enum: ["Online", "Offline", "Busy"],
      default: "Offline"
    },

    /* Basic profile info */

    basicInfo: {
      providerName: {
        type: String,
        required: true,
        trim: true
      },

      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
      },

      phone: String,

      location: String,

      businessName: String,

      bio: String,

      photoURL: String
    },

    /* Service category */

    category: {
      type: String,
      trim: true
    },

    /* Years of experience */

    experience: {
      type: Number,
      default: 0
    },

    /* Rating system */

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },

    reviewCount: {
      type: Number,
      default: 0
    },

    /* Map coordinates */

    lat: Number,

    lng: Number,

    /* Services offered */

    services: [serviceSchema],

    /* Uploaded verification docs */

    documents: [documentSchema]
  },

  { timestamps: true }
);

export default mongoose.model("Provider", providerSchema);