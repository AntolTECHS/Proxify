import mongoose from "mongoose";
import { deleteCloudinaryFile } from "../utils/cloudinaryUpload.js";

/* ================= ATTACHMENT ================= */

const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },

    publicId: {
      type: String,
      default: null,
      trim: true,
    },

    originalName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 255,
    },

    mimeType: {
      type: String,
      default: "",
      trim: true,
    },

    fileSize: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

/* ================= MESSAGE ================= */

const disputeMessageSchema = new mongoose.Schema(
  {
    disputeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dispute",
      required: true,
      index: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    attachments: {
      type: [attachmentSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 5, // limit attachments per message
        message: "Maximum 5 attachments allowed per message",
      },
    },

    isSystemMessage: {
      type: Boolean,
      default: false,
      index: true,
    },

    messageType: {
      type: String,
      enum: ["user", "system", "admin"],
      default: "user",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* ================= INDEXES ================= */

// Chat thread (primary read path)
disputeMessageSchema.index({ disputeId: 1, createdAt: 1 });

// Latest messages (for previews / last message)
disputeMessageSchema.index({ disputeId: 1, createdAt: -1 });

// Sender activity (admin / moderation)
disputeMessageSchema.index({ senderId: 1, createdAt: -1 });

// Message type filtering
disputeMessageSchema.index({ messageType: 1, createdAt: -1 });

/* ================= FILE CLEANUP ================= */

// When message is deleted → clean attachments from Cloudinary
disputeMessageSchema.post("findOneAndDelete", async function (doc) {
  if (!doc?.attachments?.length) return;

  for (const file of doc.attachments) {
    if (file.publicId) {
      try {
        await deleteCloudinaryFile(file.publicId, "auto");
      } catch (err) {
        console.error("Attachment cleanup failed:", err.message);
      }
    }
  }
});

disputeMessageSchema.post("deleteOne", { document: true }, async function () {
  if (!this.attachments?.length) return;

  for (const file of this.attachments) {
    if (file.publicId) {
      try {
        await deleteCloudinaryFile(file.publicId, "auto");
      } catch (err) {
        console.error("Attachment cleanup failed:", err.message);
      }
    }
  }
});

/* ================= HELPERS ================= */

// Virtual: quick flag for UI
disputeMessageSchema.virtual("hasAttachments").get(function () {
  return this.attachments?.length > 0;
});

/* ================= CLEAN OUTPUT ================= */

const cleanTransform = (_, ret) => {
  delete ret.__v;
  return ret;
};

disputeMessageSchema.set("toJSON", {
  virtuals: true,
  transform: cleanTransform,
});

disputeMessageSchema.set("toObject", {
  virtuals: true,
  transform: cleanTransform,
});

/* ================= EXPORT ================= */

export default mongoose.model("DisputeMessage", disputeMessageSchema);