// src/pages/Customer/Chat.jsx
import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { FaPaperPlane } from "react-icons/fa";
import axios from "axios";

const API_REST = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const API_SOCKET = import.meta.env.VITE_API_SOCKET || "http://localhost:5000";

export default function Chat({ bookingId, token }) {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const scrollRef = useRef(null);

  /* ---------------- GET OR CREATE CONVERSATION ---------------- */
  useEffect(() => {
    if (!bookingId || !token) return;

    const initConversation = async () => {
      try {
        console.log("DEBUG: Axios GET Conversation");

        const res = await axios.get(
          `${API_REST}/chat/conversation/${bookingId}`,
          { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
        );

        console.log("DEBUG: Conversation response:", res.data);

        setConversationId(res.data.conversation._id);
        setMessages(res.data.conversation.messages || []);
        setLoading(false);
      } catch (err) {
        console.error("Error initializing conversation:", err);
        setLoading(false);
      }
    };

    initConversation();
  }, [bookingId, token]);

  /* ---------------- SOCKET.IO CONNECTION ---------------- */
  useEffect(() => {
    if (!conversationId || !token) return;

    console.log("DEBUG: Connecting socket...");

    socketRef.current = io(API_SOCKET, {
      path: "/socket.io",         // must match server path
      transports: ["websocket"],  // enforce websocket
      auth: { token },             // JWT auth
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Socket connected:", socketRef.current.id);
      socketRef.current.emit("join_conversation", conversationId);
    });

    socketRef.current.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    socketRef.current.on("disconnect", (reason) => {
      console.log("⚠️ Socket disconnected:", reason);
    });

    return () => socketRef.current.disconnect();
  }, [conversationId, token]);

  /* ---------------- AUTO SCROLL ---------------- */
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---------------- SEND MESSAGE ---------------- */
  const sendMessage = () => {
    if (!newMsg.trim() || !socketRef.current?.connected) return;

    const payload = { conversationId, text: newMsg };

    // Emit via socket
    socketRef.current.emit("send_message", payload, (res) => {
      if (!res.success) console.error("Send message error:", res.error);
    });

    // Optimistic UI
    setMessages((prev) => [
      ...prev,
      { ...payload, self: true, createdAt: new Date().toISOString() },
    ]);

    setNewMsg("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  if (loading) return <p className="text-center py-4">Loading chat...</p>;

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden shadow">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 mt-4">No messages yet</p>
        )}
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.self ? "justify-end" : "justify-start"} mb-2`}
          >
            <div
              className={`max-w-[70%] px-3 py-2 rounded-lg ${
                m.self ? "bg-sky-500 text-white" : "bg-gray-200 text-gray-800"
              }`}
            >
              <p className="break-words">{m.text}</p>
              <span className="text-xs text-gray-400 float-right mt-1">
                {new Date(m.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
        <div ref={scrollRef}></div>
      </div>

      {/* Input */}
      <div className="flex p-2 border-t bg-white">
        <input
          className="flex-1 border px-3 py-2 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-sky-300"
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type a message..."
        />
        <button
          className="bg-sky-500 hover:bg-sky-600 text-white px-4 rounded-r-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50"
          onClick={sendMessage}
          disabled={!newMsg.trim() || !socketRef.current?.connected}
        >
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
}