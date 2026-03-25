import Message from "../models/Message.js";
import {
  getOrCreateConversationService,
  createMessageService,
} from "../services/chatService.js";

/* ============================
   GET OR CREATE CONVERSATION
============================ */
export const getOrCreateConversation = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    if (!bookingId || !bookingId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const conversation = await getOrCreateConversationService(bookingId, userId);

    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: 1 })
      .populate("senderId", "name avatar");

    const normalizedMessages = messages.map((m) => ({
      _id: m._id,
      conversationId: m.conversationId,
      senderId: m.senderId._id,
      senderName: m.senderId.name,
      senderAvatar: m.senderId.avatar,
      text: m.text,
      imageUrl: m.imageUrl,
      createdAt: m.createdAt,
      self: m.senderId._id.toString() === userId,
    }));

    res.json({ success: true, conversation: { ...conversation.toObject(), messages: normalizedMessages } });
  } catch (err) {
    console.error("🔥 ChatController getOrCreateConversation error:", err.message);
    const status = err.message === "Unauthorized" ? 403 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

/* ============================
        SEND MESSAGE
============================ */
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text, imageUrl } = req.body;
    const userId = req.user.id;

    if (!conversationId || !conversationId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: "Invalid conversation ID" });
    }

    const message = await createMessageService({ conversationId, senderId: userId, text, imageUrl });

    await message.populate("senderId", "name avatar");

    res.json({
      success: true,
      message: {
        _id: message._id,
        conversationId: message.conversationId,
        senderId: message.senderId._id,
        senderName: message.senderId.name,
        senderAvatar: message.senderId.avatar,
        text: message.text,
        imageUrl: message.imageUrl,
        createdAt: message.createdAt,
        self: message.senderId._id.toString() === userId,
      },
    });
  } catch (err) {
    console.error("🔥 ChatController sendMessage error:", err.message);
    const status = err.message === "Unauthorized" ? 403 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};