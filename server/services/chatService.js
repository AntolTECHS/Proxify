// src/services/chatService.js
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Booking from "../models/Booking.js";

/* ---------------- VALIDATE PARTICIPANT ---------------- */
export const isParticipant = (conversation, userId) => {
  return conversation.participants.some(
    (p) => p.toString() === userId
  );
};

/* ---------------- GET OR CREATE CONVERSATION ---------------- */
export const getOrCreateConversationService = async (bookingId, userId) => {
  console.log("DEBUG: bookingId:", bookingId);

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error("Booking not found");

  const allowed =
    booking.customer.toString() === userId ||
    booking.provider.toString() === userId;

  if (!allowed) throw new Error("Unauthorized");

  let conversation = await Conversation.findOne({ bookingId });
  console.log("DEBUG: Found conversation:", conversation?._id);

  if (!conversation) {
    console.log("DEBUG: Creating new conversation");
    conversation = await Conversation.create({
      bookingId,
      participants: [booking.customer, booking.provider],
    });
  }

  console.log("DEBUG: Returning conversation:", conversation._id);
  return conversation;
};

/* ---------------- CREATE MESSAGE ---------------- */
export const createMessageService = async ({
  conversationId,
  senderId,
  text,
  imageUrl,
}) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new Error("Conversation not found");

  if (!isParticipant(conversation, senderId)) {
    throw new Error("Unauthorized");
  }

  const message = await Message.create({
    conversationId,
    senderId,
    text: text || "",
    imageUrl: imageUrl || "",
    type: imageUrl ? "image" : "text",
    readBy: [senderId],
  });

  conversation.lastMessage = message._id;
  await conversation.save();

  return message;
};