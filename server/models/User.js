const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    /* ================= BASIC INFO ================= */
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    role: {
      type: String,
      enum: ["customer", "provider", "admin"],
      default: "customer",
    },

    phone: {
      type: String,
      required: function () {
        return this.role === "provider";
      },
    },

    /* ================= PROVIDER ONBOARDING ================= */
    providerFormData: {
      type: Object, // services, availability, documents, etc.
      default: {},
    },

    /* ================= VERIFICATION ================= */
    isVerified: {
      type: Boolean,
      default: function () {
        return this.role !== "provider";
      },
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: function () {
        return this.role === "provider" ? "pending" : "approved";
      },
    },

    verificationNotes: {
      type: String,
    },

    verifiedAt: {
      type: Date,
    },

    /* ================= PROVIDER STATS ================= */
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalJobs: {
      type: Number,
      default: 0,
    },

    completedJobs: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

/* ================= PASSWORD HASHING ================= */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/* ================= PASSWORD MATCH ================= */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
