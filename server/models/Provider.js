import mongoose from "mongoose";

/* ================= SERVICES ================= */

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: true }
);

/* ================= DOCUMENTS ================= */

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    path: { type: String, trim: true, default: "" },
    size: { type: Number, min: 0, default: 0 },
    type: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

/* ================= RESUBMISSIONS ================= */

const resubmissionSchema = new mongoose.Schema(
  {
    note: {
      type: String,
      trim: true,
      default: "",
    },

    previousRejectionReason: {
      type: String,
      trim: true,
      default: "",
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/* ================= AVAILABILITY ================= */

const availabilitySchema = new mongoose.Schema(
  {
    days: {
      type: [String],
      default: [],
      validate: {
        validator: function (days) {
          const allowed = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
          return Array.isArray(days) && days.every((d) => allowed.includes(d));
        },
        message: "Invalid availability day supplied",
      },
    },

    start: {
      type: String,
      default: "08:00",
    },

    end: {
      type: String,
      default: "18:00",
    },
  },
  { _id: false }
);

/* ================= GEO LOCATION ================= */

const geoSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },

    coordinates: {
      type: [Number], // [lng, lat]
      default: [0, 0],
    },
  },
  { _id: false }
);

/* ================= PROVIDER ================= */

const providerSchema = new mongoose.Schema(
  {
    /* ================= USER LINK ================= */

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    /* ================= ADMIN APPROVAL ================= */

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    approvalBanner: {
      type: String,
      trim: true,
      default: "Pending admin approval",
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },

    resubmissions: {
      type: [resubmissionSchema],
      default: [],
    },

    /* ================= ONLINE STATUS ================= */

    availabilityStatus: {
      type: String,
      enum: ["Online", "Offline", "Busy"],
      default: "Offline",
    },

    /* ================= BASIC INFO ================= */

    basicInfo: {
      providerName: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },

      phone: {
        type: String,
        trim: true,
        default: "",
      },

      location: {
        type: String,
        trim: true,
        default: "",
      },

      businessName: {
        type: String,
        trim: true,
        default: "",
      },

      photoURL: {
        type: String,
        default: "",
      },
    },

    /* ================= PROFILE ================= */

    bio: {
      type: String,
      trim: true,
      default: "",
    },

    category: {
      type: String,
      trim: true,
      index: true,
      default: "",
    },

    experience: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* ================= RATINGS ================= */

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },

    /* ================= GEO ================= */

    location: {
      type: geoSchema,
      default: {
        type: "Point",
        coordinates: [0, 0],
      },
    },

    /* ================= SERVICES ================= */

    services: {
      type: [serviceSchema],
      default: [],
      validate: {
        validator: function (services) {
          if (!Array.isArray(services) || services.length === 0) return true;

          const names = services
            .map((s) => String(s?.name || "").trim().toLowerCase())
            .filter(Boolean);

          return new Set(names).size === names.length;
        },
        message: "Duplicate services are not allowed",
      },
    },

    /* ================= AVAILABILITY ================= */

    availability: {
      type: availabilitySchema,
      default: {
        days: [],
        start: "08:00",
        end: "18:00",
      },
    },

    /* ================= DOCUMENTS ================= */

    documents: {
      type: [documentSchema],
      default: [],
    },
  },
  { timestamps: true }
);

/* ================= INDEXES ================= */

/* 🔍 Text search */
providerSchema.index({
  "basicInfo.providerName": "text",
  category: "text",
  "basicInfo.businessName": "text",
});

/* ⚡ Fast filtering */
providerSchema.index({
  status: 1,
  category: 1,
});

/* 📍 Geo queries */
providerSchema.index({
  location: "2dsphere",
});

/* ================= VIRTUALS ================= */

providerSchema.virtual("isVerified").get(function () {
  return this.status === "approved";
});

/* ================= TRANSFORM ================= */

providerSchema.set("toJSON", {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.__v;
    return ret;
  },
});

providerSchema.set("toObject", {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.__v;
    return ret;
  },
});

/* ================= MODEL ================= */

export default mongoose.model("Provider", providerSchema);