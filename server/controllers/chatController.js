import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import {
  getOrCreateConversationService,
  createMessageService,
} from "../services/chatService.js";

export const getOrCreateConversation = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const conversation = await getOrCreateConversationService(bookingId, req.user.id);

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
      self: m.senderId._id.toString() === req.user.id,
    }));

    res.json({
      success: true,
      conversation: {
        ...conversation.toObject(),
        messages: normalizedMessages,
      },
    });
  } catch (err) {
    console.error("🔥 ChatController error:", err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text, imageUrl } = req.body;

    const message = await createMessageService({
      conversationId,
      senderId: req.user.id,
      text,
      imageUrl,
    });

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
        self: message.senderId._id.toString() === req.user.id,
      },
    });
  } catch (err) {
    console.error("🔥 ChatController sendMessage error:", err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};