// models/Dispute.js
import mongoose from "mongoose";

const disputeSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },

    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    against: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    category: {
      type: String,
      enum: [
        "no_show",
        "poor_quality",
        "scope_mismatch",
        "payment_issue",
        "damage",
        "other",
      ],
      required: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    // Snapshots for stable display even if related records change later
    serviceName: {
      type: String,
      trim: true,
      default: "",
    },

    openedByName: {
      type: String,
      trim: true,
      default: "",
    },

    againstName: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["open", "responded", "under_review", "resolved", "closed"],
      default: "open",
      index: true,
    },

    resolution: {
      outcome: {
        type: String,
        enum: ["customer_favored", "provider_favored", "neutral"],
        default: null,
      },
      note: {
        type: String,
        default: "",
        trim: true,
      },
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      resolvedAt: {
        type: Date,
        default: null,
      },
    },

    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

disputeSchema.index({ jobId: 1, status: 1 });
disputeSchema.index({ openedBy: 1, createdAt: -1 });
disputeSchema.index({ against: 1, createdAt: -1 });
disputeSchema.index({ category: 1, status: 1 });

export default mongoose.model("Dispute", disputeSchema);