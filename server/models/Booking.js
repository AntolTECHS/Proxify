import mongoose from "mongoose";

const locationCoordsSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
      required: true,
    },
    coordinates: {
      type: [Number], // [lng, lat]
      default: undefined,
      validate: {
        validator: function (value) {
          if (value == null) return true;
          return (
            Array.isArray(value) &&
            value.length === 2 &&
            value.every((n) => typeof n === "number" && Number.isFinite(n))
          );
        },
        message: "locationCoords.coordinates must be a valid [lng, lat] array",
      },
    },
  },
  { _id: false }
);

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
      index: true,
    },

    serviceName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "in_progress", "completed", "cancelled"],
      default: "pending",
      index: true,
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

    lat: {
      type: Number,
      default: null,
    },

    lng: {
      type: Number,
      default: null,
    },

    locationCoords: {
      type: locationCoordsSchema,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
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
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "card", "mobile_money"],
      default: "cash",
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    feedback: {
      type: String,
      trim: true,
      default: "",
    },

    hasDispute: {
      type: Boolean,
      default: false,
      index: true,
    },

    disputeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dispute",
      default: null,
      index: true,
    },

    disputeStatus: {
      type: String,
      enum: ["none", "open", "responded", "under_review", "resolved", "closed"],
      default: "none",
      index: true,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ locationCoords: "2dsphere" });
bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ provider: 1, createdAt: -1 });
bookingSchema.index({ status: 1, scheduledAt: -1 });
bookingSchema.index({ disputeId: 1, disputeStatus: 1 });

bookingSchema.pre("validate", function () {
  const hasLatLng = Number.isFinite(this.lat) && Number.isFinite(this.lng);

  if (hasLatLng) {
    this.locationCoords = {
      type: "Point",
      coordinates: [this.lng, this.lat],
    };
  } else if (
    this.locationCoords &&
    Array.isArray(this.locationCoords.coordinates) &&
    this.locationCoords.coordinates.length === 2
  ) {
    const [lng, lat] = this.locationCoords.coordinates;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      this.lat = lat;
      this.lng = lng;
    }
  } else {
    this.locationCoords = null;
  }
});

bookingSchema.pre("save", function () {
  if (this.isModified("status") && this.status === "completed") {
    this.paymentStatus = "paid";
  }

  if (this.isModified("disputeId")) {
    this.hasDispute = Boolean(this.disputeId);
  }

  if (this.isModified("disputeStatus") && !this.disputeStatus) {
    this.disputeStatus = "none";
  }

  if (!this.hasDispute && !this.disputeId) {
    this.disputeStatus = "none";
  }
});

export default mongoose.model("Booking", bookingSchema);