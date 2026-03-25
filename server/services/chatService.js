import Conversation from "../models/Conversation.js";
import Booking from "../models/Booking.js";
import Message from "../models/Message.js";

/**
 * Get an existing conversation for a booking or create a new one.
 * Ensures only the customer or the provider's user can access.
 *
 * @param {string} bookingId
 * @param {string} userId
 * @returns {Promise<Conversation>}
 */
export const getOrCreateConversationService = async (bookingId, userId) => {
  // Fetch booking and populate customer and provider.user
  const booking = await Booking.findById(bookingId)
    .populate("customer", "_id name")
    .populate({ path: "provider", populate: { path: "user", select: "_id name" } });

  if (!booking) {
    throw new Error("Booking not found");
  }

  const customerId = booking.customer?._id?.toString();
  const providerUserId = booking.provider?.user?._id?.toString();

  if (!customerId || !providerUserId) {
    throw new Error("Booking participants not properly defined");
  }

  const isParticipant = userId === customerId || userId === providerUserId;
  if (!isParticipant) {
    console.log("Unauthorized access attempt:", { userId, customerId, providerUserId });
    throw new Error("Unauthorized");
  }

  // Find existing conversation
  let conversation = await Conversation.findOne({ bookingId });

  if (!conversation) {
    // Create new conversation
    conversation = await Conversation.create({
      bookingId,
      participants: [customerId, providerUserId],
      lastMessage: null,
    });
    console.log("✅ Created new conversation for booking:", bookingId);
  } else {
    console.log("ℹ️ Found existing conversation:", conversation._id);
  }

  return conversation;
};

/**
 * Create a new message in a conversation.
 * Validates sender is a participant.
 *
 * @param {Object} params
 * @param {string} params.conversationId
 * @param {string} params.senderId
 * @param {string} params.text
 * @param {string} params.imageUrl
 * @returns {Promise<Message>}
 */
export const createMessageService = async ({ conversationId, senderId, text, imageUrl }) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new Error("Conversation not found");

  if (!conversation.participants.some((p) => p.toString() === senderId)) {
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