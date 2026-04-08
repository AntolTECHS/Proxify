const mongoose = require("mongoose");

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
    },

    serviceName: {
      type: String,
      required: true,
      trim: true,
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
    },

    feedback: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

bookingSchema.index({ locationCoords: "2dsphere" });

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
});

module.exports = mongoose.model("Booking", bookingSchema);