// src/models/Conversation.js
import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true, // one conversation per booking
      index: true,
    },

    /* ---------------- PARTICIPANTS ---------------- */
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    /* ---------------- LAST MESSAGE ---------------- */
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },

    lastMessageText: {
      type: String,
      default: "",
    },

    lastMessageAt: {
      type: Date,
    },

    /* ---------------- UNREAD COUNTS ---------------- */
    unreadCounts: {
      type: Map,
      of: Number, // userId -> unread count
      default: {},
    },
  },
  { timestamps: true }
);

/* ---------------- INDEXES (IMPORTANT) ---------------- */
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

export default mongoose.model("Conversation", conversationSchema);