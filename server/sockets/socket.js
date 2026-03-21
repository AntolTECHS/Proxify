// src/sockets/socket.js
import { Server } from "socket.io";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import jwt from "jsonwebtoken";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    path: "/socket.io", // must match client
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) return next(new Error("Authentication error"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id} (user: ${socket.user.id})`);

    /* ---------------- JOIN CONVERSATION ---------------- */
    socket.on("join_conversation", (conversationId) => {
      socket.join(conversationId);
      console.log(`User ${socket.user.id} joined conversation ${conversationId}`);
    });

    /* ---------------- SEND MESSAGE ---------------- */
    socket.on("send_message", async (data, callback) => {
      try {
        const { conversationId, text, imageUrl } = data;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) throw new Error("Conversation not found");

        if (!conversation.participants.includes(socket.user.id)) {
          throw new Error("Unauthorized");
        }

        const message = await Message.create({
          conversationId,
          senderId: socket.user.id,
          text: text || "",
          imageUrl: imageUrl || "",
          type: imageUrl ? "image" : "text",
          readBy: [socket.user.id],
        });

        // Update last message
        conversation.lastMessage = message._id;
        await conversation.save();

        const msgForClient = {
          _id: message._id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          senderName: socket.user.name || "Unknown",
          text: message.text,
          imageUrl: message.imageUrl,
          createdAt: message.createdAt,
          self: false,
        };

        // Emit to all participants in the room
        io.to(conversationId).emit("receive_message", msgForClient);

        callback({ success: true });
      } catch (err) {
        console.error("Socket send_message error:", err.message);
        callback({ success: false, error: err.message });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`⚠️ Socket disconnected: ${socket.id} (reason: ${reason})`);
    });
  });
};

export const getIo = () => io;