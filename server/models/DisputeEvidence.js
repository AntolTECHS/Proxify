import mongoose from "mongoose";
import { deleteCloudinaryFile } from "../utils/cloudinaryUpload.js";

const disputeEvidenceSchema = new mongoose.Schema(
  {
    disputeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dispute",
      required: true,
      index: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },

    publicId: {
      type: String,
      required: true,
      trim: true,
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },

    mimeType: {
      type: String,
      required: true,
      trim: true,
    },

    fileSize: {
      type: Number,
      default: 0,
      min: 0,
    },

    evidenceType: {
      type: String,
      enum: ["image", "video", "document", "receipt", "other"],
      default: "other",
      index: true,
    },
  },
  { timestamps: true }
);

/* ================= INDEXES ================= */

// Fast dispute timeline loading
disputeEvidenceSchema.index({ disputeId: 1, createdAt: -1 });

// User uploads lookup (audit/debug)
disputeEvidenceSchema.index({ uploadedBy: 1, createdAt: -1 });

// Optional: filter by type within dispute
disputeEvidenceSchema.index({ disputeId: 1, evidenceType: 1 });

/* ================= FILE SAFETY ================= */

// Auto-delete Cloudinary file when evidence is removed
disputeEvidenceSchema.post("findOneAndDelete", async function (doc) {
  if (doc?.publicId) {
    try {
      await deleteCloudinaryFile(doc.publicId, "auto");
    } catch (err) {
      console.error("Cloudinary cleanup failed:", err.message);
    }
  }
});

// Also cover direct .deleteOne()
disputeEvidenceSchema.post("deleteOne", { document: true }, async function () {
  if (this.publicId) {
    try {
      await deleteCloudinaryFile(this.publicId, "auto");
    } catch (err) {
      console.error("Cloudinary cleanup failed:", err.message);
    }
  }
});

/* ================= HELPERS ================= */

// Virtual: human-readable size
disputeEvidenceSchema.virtual("fileSizeKB").get(function () {
  return this.fileSize ? Math.round(this.fileSize / 1024) : 0;
});

/* ================= CLEAN OUTPUT ================= */

const cleanTransform = (_, ret) => {
  delete ret.__v;
  return ret;
};

disputeEvidenceSchema.set("toJSON", {
  virtuals: true,
  transform: cleanTransform,
});

disputeEvidenceSchema.set("toObject", {
  virtuals: true,
  transform: cleanTransform,
});

/* ================= EXPORT ================= */

export default mongoose.model("DisputeEvidence", disputeEvidenceSchema);