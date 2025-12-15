const Chat = require("../models/Chat");
const Message = require("../models/Message");

// Create chat between two users
exports.createChat = async (req, res) => {
  try {
    const { participants } = req.body; // array of user IDs
    const chat = await Chat.create({ participants });
    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { chat, text, media } = req.body;
    const message = await Message.create({ chat, sender: req.user.id, text, media });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user chats
exports.getChats = async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user.id }).populate("participants", "name email");
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get messages of a chat
exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId }).populate("sender", "name email");
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
