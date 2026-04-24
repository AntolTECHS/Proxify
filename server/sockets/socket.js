import { Server } from "socket.io";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import jwt from "jsonwebtoken";
import Dispute from "../models/Dispute.js";
import DisputeMessage from "../models/DisputeMessage.js";

let io;

/* ---------------- ONLINE USERS ---------------- */
const onlineUsers = new Map(); // userId -> Set(socketIds)

/* ---------------- HELPERS ---------------- */
const toStr = (v) => (v ? v.toString() : null);

const getDisputeRoom = (disputeId) => `dispute_${disputeId}`;

const getDisputeAndValidate = async (disputeId, userId, role) => {
  const dispute = await Dispute.findById(disputeId);

  if (!dispute) {
    throw new Error("Dispute not found");
  }

  const isParticipant =
    toStr(dispute.openedBy) === userId || toStr(dispute.against) === userId;

  if (!isParticipant && role !== "admin") {
    throw new Error("Unauthorized");
  }

  return dispute;
};

export const initSocket = (server) => {
  io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  /* ---------------- AUTH ---------------- */
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = {
        id: decoded.id,
        name: decoded.name || "User",
        role: decoded.role || "user",
      };

      socket.data = socket.data || {};
      socket.data.disputeRooms = new Set();

      next();
    } catch {
      return next(new Error("Invalid token"));
    }
  });

  /* ---------------- CONNECTION ---------------- */
  io.on("connection", (socket) => {
    const userId = socket.user.id;

    console.log(`✅ Connected: ${socket.id} (${userId})`);

    /* ================= ONLINE TRACKING ================= */
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
      io.emit("user_online", userId);
    }
    onlineUsers.get(userId).add(socket.id);

    /* =====================================================
       💬 BOOKING CHAT (UNCHANGED)
    ====================================================== */

    socket.on("join_conversation", async (conversationId) => {
      try {
        const conversation = await Conversation.findById(conversationId).populate(
          {
            path: "bookingId",
            populate: [
              { path: "customer", select: "_id name" },
              { path: "provider", populate: { path: "user", select: "_id name" } },
            ],
          }
        );

        if (!conversation) return socket.emit("error", "Conversation not found");

        const booking = conversation.bookingId;
        const customerId = toStr(booking.customer?._id);
        const providerUserId = toStr(booking.provider?.user?._id);

        if (userId !== customerId && userId !== providerUserId) {
          return socket.disconnect(true);
        }

        socket.join(conversationId);
      } catch (err) {
        console.error("join_conversation:", err.message);
      }
    });

    socket.on("typing", ({ conversationId }) => {
      socket.to(conversationId).emit("user_typing", {
        userId,
        name: socket.user.name,
      });
    });

    socket.on("stop_typing", ({ conversationId }) => {
      socket.to(conversationId).emit("user_stop_typing", { userId });
    });

    socket.on("send_message", async (data, callback) => {
      try {
        const { conversationId, text, imageUrl, tempId } = data;

        if (!text && !imageUrl) {
          return callback?.({ success: false, error: "Empty message" });
        }

        const conversation = await Conversation.findById(conversationId).populate(
          {
            path: "bookingId",
            populate: [
              { path: "customer", select: "_id" },
              { path: "provider", populate: { path: "user", select: "_id" } },
            ],
          }
        );

        if (!conversation) throw new Error("Conversation not found");

        const booking = conversation.bookingId;
        const customerId = toStr(booking.customer?._id);
        const providerUserId = toStr(booking.provider?.user?._id);

        if (userId !== customerId && userId !== providerUserId) {
          throw new Error("Unauthorized");
        }

        const message = await Message.create({
          conversationId,
          senderId: userId,
          text: text || "",
          imageUrl: imageUrl || "",
          type: imageUrl ? "image" : "text",
          readBy: [userId],
        });

        conversation.lastMessage = message._id;
        await conversation.save();

        const payload = {
          _id: message._id,
          conversationId,
          senderId: userId,
          senderName: socket.user.name,
          text: message.text,
          imageUrl: message.imageUrl,
          createdAt: message.createdAt,
          tempId: tempId || null,
        };

        io.to(conversationId).emit("receive_message", payload);

        callback?.({ success: true, message: payload });
      } catch (err) {
        console.error("send_message:", err.message);
        callback?.({ success: false, error: err.message });
      }
    });

    socket.on("mark_seen", async ({ conversationId }) => {
      try {
        const messages = await Message.find({
          conversationId,
          readBy: { $ne: userId },
        });

        const ids = messages.map((m) => m._id);
        if (!ids.length) return;

        await Message.updateMany(
          { _id: { $in: ids } },
          { $addToSet: { readBy: userId } }
        );

        io.to(conversationId).emit("messages_seen", { messageIds: ids, userId });
      } catch (err) {
        console.error("mark_seen:", err.message);
      }
    });

    /* =====================================================
       ⚖️ DISPUTE SYSTEM (HARDENED, BOOKING CHAT UNTOUCHED)
    ====================================================== */

    socket.on("join_dispute", async ({ disputeId }) => {
      try {
        const dispute = await getDisputeAndValidate(
          disputeId,
          userId,
          socket.user.role
        );

        const room = getDisputeRoom(disputeId);
        socket.join(room);

        socket.data.disputeRooms.add(room);

        socket.emit("dispute:joined", { disputeId, success: true });
        socket.emit("joined_dispute", { disputeId }); // legacy alias

        if (dispute.status === "open" && socket.user.role === "admin") {
          io.to(room).emit("dispute:admin_joined", { adminId: userId });
          io.to(room).emit("admin_joined", { adminId: userId }); // legacy alias
        }
      } catch (err) {
        console.error("join_dispute:", err.message);
        socket.emit("dispute:error", err.message);
      }
    });

    socket.on("send_dispute_message", async (data, callback) => {
      try {
        const { disputeId, message, tempId } = data;

        if (!message || !message.trim()) {
          return callback?.({ success: false, error: "Empty message" });
        }

        const dispute = await getDisputeAndValidate(
          disputeId,
          userId,
          socket.user.role
        );

        const msg = await DisputeMessage.create({
          disputeId,
          senderId: userId,
          message: message.trim(),
          messageType: socket.user.role === "admin" ? "admin" : "user",
          isSystemMessage: false,
        });

        const payload = {
          _id: msg._id,
          disputeId,
          senderId: userId,
          senderName: socket.user.name,
          senderRole: socket.user.role,
          message: msg.message,
          createdAt: msg.createdAt,
          tempId: tempId || null,
        };

        const room = getDisputeRoom(disputeId);

        io.to(room).emit("dispute:message", payload);
        io.to(room).emit("receive_dispute_message", payload); // legacy alias

        if (dispute.status === "open") {
          dispute.status = "responded";
          await dispute.save();

          io.to(room).emit("dispute:updated", {
            disputeId,
            status: dispute.status,
          });
          io.to(room).emit("dispute_updated", {
            disputeId,
            status: dispute.status,
          });
        }

        callback?.({ success: true, message: payload });
      } catch (err) {
        console.error("send_dispute_message:", err.message);
        callback?.({ success: false, error: err.message });
      }
    });

    socket.on("dispute_typing", async ({ disputeId }) => {
      try {
        await getDisputeAndValidate(disputeId, userId, socket.user.role);

        const room = getDisputeRoom(disputeId);

        io.to(room).except(socket.id).emit("dispute:user_typing", {
          userId,
          name: socket.user.name,
        });

        io.to(room).except(socket.id).emit("user_typing", {
          userId,
          name: socket.user.name,
        });
      } catch (err) {
        console.error("dispute_typing:", err.message);
      }
    });

    socket.on("dispute_stop_typing", async ({ disputeId }) => {
      try {
        await getDisputeAndValidate(disputeId, userId, socket.user.role);

        const room = getDisputeRoom(disputeId);

        io.to(room).except(socket.id).emit("dispute:user_stop_typing", {
          userId,
        });

        io.to(room).except(socket.id).emit("user_stop_typing", {
          userId,
        });
      } catch (err) {
        console.error("dispute_stop_typing:", err.message);
      }
    });

    socket.on("admin_join_dispute", async ({ disputeId }) => {
      try {
        if (socket.user.role !== "admin") {
          throw new Error("Only admin allowed");
        }

        await getDisputeAndValidate(disputeId, userId, "admin");

        const room = getDisputeRoom(disputeId);
        socket.join(room);

        socket.data.disputeRooms.add(room);

        io.to(room).emit("dispute:admin_joined", {
          adminId: userId,
        });
        io.to(room).emit("admin_joined", {
          adminId: userId,
        });
      } catch (err) {
        console.error("admin_join_dispute:", err.message);
      }
    });

    socket.on("dispute_status_update", async ({ disputeId, status }) => {
      try {
        if (socket.user.role !== "admin") {
          throw new Error("Only admin can update status");
        }

        const allowedStatuses = [
          "open",
          "responded",
          "under_review",
          "resolved",
          "closed",
        ];

        if (!allowedStatuses.includes(status)) {
          throw new Error("Invalid status");
        }

        const dispute = await Dispute.findById(disputeId);
        if (!dispute) throw new Error("Dispute not found");

        dispute.status = status;
        if (["resolved", "closed"].includes(status)) {
          dispute.closedAt = new Date();
        }
        await dispute.save();

        const room = getDisputeRoom(disputeId);

        io.to(room).emit("dispute:updated", {
          disputeId,
          status,
        });

        io.to(room).emit("dispute_updated", {
          disputeId,
          status,
        });
      } catch (err) {
        console.error("dispute_status_update:", err.message);
      }
    });

    socket.on("dispute_mark_seen", async ({ disputeId }) => {
      try {
        await getDisputeAndValidate(disputeId, userId, socket.user.role);

        const room = getDisputeRoom(disputeId);

        io.to(room).emit("dispute:seen", {
          disputeId,
          userId,
        });
      } catch (err) {
        console.error("dispute_mark_seen:", err.message);
      }
    });

    /* ================= DISCONNECT ================= */
    socket.on("disconnect", () => {
      console.log(`❌ Disconnected: ${socket.id}`);

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