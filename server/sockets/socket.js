// src/sockets/socket.js
import { Server } from "socket.io";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import jwt from "jsonwebtoken";

let io;

/* ---------------- ONLINE USERS (multi-device safe) ---------------- */
const onlineUsers = new Map(); // userId -> Set(socketIds)

export const initSocket = (server) => {
  io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  /* ---------------- AUTH MIDDLEWARE ---------------- */
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication error: No token"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id, name: decoded.name || "User" };
      next();
    } catch {
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  /* ---------------- CONNECTION ---------------- */
  io.on("connection", (socket) => {
    const userId = socket.user.id;
    console.log(`✅ Socket connected: ${socket.id} (user: ${userId})`);

    /* ----------- TRACK ONLINE USERS ----------- */
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
      io.emit("user_online", userId);
    }
    onlineUsers.get(userId).add(socket.id);

    /* ---------------- JOIN CONVERSATION ---------------- */
    socket.on("join_conversation", async (conversationId) => {
      try {
        const conversation = await Conversation.findById(conversationId).populate({
          path: "bookingId",
          populate: [
            { path: "customer", select: "_id name" },
            { path: "provider", populate: { path: "user", select: "_id name" } },
          ],
        });

        if (!conversation) {
          console.log("❌ Conversation not found");
          return socket.emit("error", "Conversation not found");
        }

        const booking = conversation.bookingId;
        const customerId = booking.customer?._id?.toString();
        const providerUserId = booking.provider?.user?._id?.toString();

        if (userId !== customerId && userId !== providerUserId) {
          console.log("❌ Unauthorized join attempt", { userId, customerId, providerUserId });
          return socket.disconnect(true);
        }

        socket.join(conversationId);
        console.log(`📥 User ${userId} joined conversation ${conversationId}`);
      } catch (err) {
        console.error("Join error:", err.message);
        socket.disconnect(true);
      }
    });

    /* ---------------- TYPING INDICATORS ---------------- */
    socket.on("typing", ({ conversationId }) => {
      socket.to(conversationId).emit("user_typing", {
        userId,
        name: socket.user.name,
      });
    });

    socket.on("stop_typing", ({ conversationId }) => {
      socket.to(conversationId).emit("user_stop_typing", { userId });
    });

    /* ---------------- SEND MESSAGE ---------------- */
    socket.on("send_message", async (data, callback) => {
      try {
        const { conversationId, text, imageUrl, tempId } = data; // <-- include tempId

        if (!text && !imageUrl) return callback({ success: false, error: "Empty message" });

        const conversation = await Conversation.findById(conversationId).populate({
          path: "bookingId",
          populate: [
            { path: "customer", select: "_id" },
            { path: "provider", populate: { path: "user", select: "_id" } },
          ],
        });

        if (!conversation) throw new Error("Conversation not found");

        const booking = conversation.bookingId;
        const customerId = booking.customer?._id?.toString();
        const providerUserId = booking.provider?.user?._id?.toString();

        if (userId !== customerId && userId !== providerUserId) throw new Error("Unauthorized");

        // CREATE MESSAGE
        const message = await Message.create({
          conversationId,
          senderId: userId,
          text: text || "",
          imageUrl: imageUrl || "",
          type: imageUrl ? "image" : "text",
          readBy: [userId],
        });

        // UPDATE CONVERSATION
        conversation.lastMessage = message._id;
        await conversation.save();

        // EMIT MESSAGE (pass tempId back!)
        const payload = {
          _id: message._id,
          conversationId: message.conversationId,
          senderId: userId,
          senderName: socket.user.name,
          text: message.text,
          imageUrl: message.imageUrl,
          createdAt: message.createdAt,
          tempId: tempId || null, // <-- tempId for optimistic UI replacement
        };

        io.to(conversationId).emit("receive_message", payload);

        // EMIT DELIVERED EVENT
        io.to(conversationId).emit("message_delivered", { messageId: message._id });

        callback({ success: true });
      } catch (err) {
        console.error("send_message error:", err.message);
        callback({ success: false, error: err.message });
      }
    });

    /* ---------------- MARK SEEN ---------------- */
    socket.on("mark_seen", async ({ conversationId }) => {
      try {
        const messages = await Message.find({
          conversationId,
          readBy: { $ne: userId },
        });

        const messageIds = messages.map((m) => m._id);
        if (!messageIds.length) return;

        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $addToSet: { readBy: userId } }
        );

        io.to(conversationId).emit("messages_seen", { messageIds, userId });
      } catch (err) {
        console.error("mark_seen error:", err.message);
      }
    });

    /* ---------------- DISCONNECT ---------------- */
    socket.on("disconnect", (reason) => {
      console.log(`⚠️ Socket disconnected: ${socket.id} (reason: ${reason})`);

      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (!sockets.size) {
          onlineUsers.delete(userId);
          io.emit("user_offline", userId);
        }
      }
    });
  });
};

export const getIo = () => io;