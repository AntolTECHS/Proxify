export const registerDisputeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    /* ================= JOIN DISPUTE ROOM ================= */
    socket.on("join_dispute", ({ disputeId, userId }) => {
      socket.join(`dispute_${disputeId}`);

      socket.to(`dispute_${disputeId}`).emit("user_joined", {
        userId,
      });
    });

    /* ================= SEND MESSAGE ================= */
    socket.on("send_dispute_message", (data) => {
      const { disputeId, message } = data;

      io.to(`dispute_${disputeId}`).emit("new_dispute_message", message);
    });

    /* ================= TYPING INDICATOR ================= */
    socket.on("typing", ({ disputeId, userId }) => {
      socket.to(`dispute_${disputeId}`).emit("typing", { userId });
    });

    socket.on("stop_typing", ({ disputeId, userId }) => {
      socket.to(`dispute_${disputeId}`).emit("stop_typing", { userId });
    });

    /* ================= DISCONNECT ================= */
    socket.on("disconnect", () => {
      console.log("🔴 User disconnected:", socket.id);
    });
  });
};