import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import {
  FaPaperPlane,
  FaImage,
  FaTimes,
  FaCheck,
  FaCheckDouble,
} from "react-icons/fa";
import axios from "axios";
import { useAuth } from "../../context/AuthContext.jsx";

const API_REST = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const API_SOCKET = import.meta.env.VITE_API_SOCKET || "http://localhost:5000";

export default function Chat({ bookingId, token }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const socketRef = useRef(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeout = useRef(null);

  /* ---------------- GET OR CREATE CONVERSATION ---------------- */
  useEffect(() => {
    if (!bookingId || !token || !userId) return;

    const initConversation = async () => {
      try {
        const res = await axios.get(`${API_REST}/chat/conversation/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const normalized = (res.data.conversation.messages || []).map((m) => ({
          ...m,
          self: m.senderId === userId,
          text: typeof m.text === "string" ? m.text.replace(/^6\s*/, "") : m.text,
        }));

        setConversationId(res.data.conversation._id);
        setMessages(normalized);
      } catch (err) {
        console.error(
          "Error initializing conversation:",
          err.response?.data || err.message
        );
      } finally {
        setLoading(false);
      }
    };

    initConversation();
  }, [bookingId, token, userId]);

  /* ---------------- SOCKET.IO CONNECTION ---------------- */
  useEffect(() => {
    if (!conversationId || !token || !userId) return;
    if (socketRef.current) return;

    socketRef.current = io(API_SOCKET, {
      path: "/socket.io",
      transports: ["websocket"],
      auth: { token },
    });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join_conversation", conversationId);
    });

    socketRef.current.on("receive_message", (msg) => {
      setMessages((prev) => {
        const cleanMsg = {
          ...msg,
          text: typeof msg.text === "string" ? msg.text.replace(/^6\s*/, "") : msg.text,
          self: msg.senderId === userId,
        };

        if (cleanMsg.tempId) {
          const idx = prev.findIndex((m) => m.tempId === cleanMsg.tempId);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = cleanMsg;
            return updated;
          }
        }

        if (prev.some((m) => m._id === cleanMsg._id)) return prev;
        return [...prev, cleanMsg];
      });
    });

    socketRef.current.on("message_delivered", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, status: "delivered" } : m))
      );
    });

    socketRef.current.on("messages_seen", ({ messageIds }) => {
      setMessages((prev) =>
        prev.map((m) => (messageIds.includes(m._id) ? { ...m, status: "seen" } : m))
      );
    });

    socketRef.current.on("user_typing", ({ userId: uid }) => {
      if (uid !== userId) {
        setTypingUsers((prev) => new Set(prev).add(uid));
      }
    });

    socketRef.current.on("user_stop_typing", ({ userId: uid }) => {
      setTypingUsers((prev) => {
        const copy = new Set(prev);
        copy.delete(uid);
        return copy;
      });
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [conversationId, token, userId]);

  /* ---------------- AUTO SCROLL ---------------- */
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---------------- IMAGE UPLOAD ---------------- */
  const uploadImage = async (selectedFile) => {
    const formData = new FormData();
    formData.append("file", selectedFile);

    const res = await axios.post(`${API_REST}/chat/upload-image`, formData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return res.data.url;
  };

  /* ---------------- HELPERS ---------------- */
  const clearAttachment = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ---------------- SEND MESSAGE ---------------- */
  const sendMessage = async () => {
    if ((!newMsg.trim() && !file) || !socketRef.current?.connected || sending) return;

    setSending(true);

    try {
      let imageUrl = null;
      if (file) {
        imageUrl = await uploadImage(file);
      }

      const tempId = `${Date.now()}-${Math.random()}`;
      const payload = { conversationId, text: newMsg.trim(), imageUrl, tempId };

      setMessages((prev) => [
        ...prev,
        {
          ...payload,
          senderId: userId,
          self: true,
          createdAt: new Date().toISOString(),
          status: "sent",
        },
      ]);

      socketRef.current.emit("send_message", payload, (res) => {
        if (!res?.success) {
          setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
        }
      });

      setNewMsg("");
      clearAttachment();
      socketRef.current.emit("stop_typing", { conversationId });
    } catch (err) {
      console.error("Send message failed:", err);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (e) => {
    setNewMsg(e.target.value);

    if (!socketRef.current?.connected) return;
    socketRef.current.emit("typing", { conversationId });

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current.emit("stop_typing", { conversationId });
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
          <p className="text-sm font-medium text-slate-500">Loading chat…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full w-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-sky-500 via-sky-500 to-cyan-500 px-5 py-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Chat</h2>
              <p className="text-xs text-white/80">Secure conversation for this booking</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur sm:block">
                {typingUsers.size > 0 ? "Someone is typing…" : "Online"}
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-4 py-5 sm:px-6">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[260px] items-center justify-center">
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-500">
                  <FaPaperPlane />
                </div>
                <p className="text-base font-semibold text-slate-700">No messages yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Start the conversation by sending the first message.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m, idx) => {
                const isSelf = m.self;
                const time = m.createdAt
                  ? new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

                return (
                  <div
                    key={m._id || m.tempId || idx}
                    className={`flex items-end ${isSelf ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={[
                        "max-w-[84%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[70%]",
                        isSelf
                          ? "rounded-br-md bg-gradient-to-br from-sky-500 to-cyan-500 text-white"
                          : "rounded-bl-md border border-slate-200 bg-white text-slate-800",
                      ].join(" ")}
                    >
                      {m.text && (
                        <p className="whitespace-pre-wrap text-sm leading-6">{m.text}</p>
                      )}

                      {m.imageUrl && (
                        <div className="mt-2">
                          <img
                            src={m.imageUrl}
                            alt="chat attachment"
                            onClick={() => setPreviewImage(m.imageUrl)}
                            className="h-24 w-auto max-w-[180px] cursor-pointer rounded-lg border border-white/20 object-cover transition hover:opacity-90"
                          />
                        </div>
                      )}

                      <div
                        className={`mt-2 flex items-center justify-end gap-1 text-[11px] ${
                          isSelf ? "text-white/80" : "text-slate-400"
                        }`}
                      >
                        <span>{time}</span>
                        {isSelf && (
                          <span className="ml-1 inline-flex items-center">
                            {m.status === "seen" ? (
                              <FaCheckDouble className="text-[10px]" />
                            ) : (
                              <FaCheck className="text-[10px]" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {typingUsers.size > 0 && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500 shadow-sm">
                    <span className="inline-flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                    </span>
                    Someone is typing…
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:px-4">
          {previewUrl && (
            <div className="mb-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-700">{file?.name}</p>
                  <p className="text-xs text-slate-500">Image attached</p>
                </div>
              </div>

              <button
                type="button"
                onClick={clearAttachment}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label="Remove attachment"
              >
                <FaTimes />
              </button>
            </div>
          )}

          <div className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm sm:p-3">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-sky-200 hover:text-sky-600"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach image"
            >
              <FaImage />
            </button>

            <div className="min-w-0 flex-1">
              <textarea
                className="h-11 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
                value={newMsg}
                onChange={handleTyping}
                onKeyDown={handleKeyPress}
                placeholder="Type a message…"
                rows={1}
              />
            </div>

            <button
              type="button"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition ${
                sending || (!newMsg.trim() && !file)
                  ? "cursor-not-allowed bg-slate-300"
                  : "bg-gradient-to-r from-sky-500 to-cyan-500 shadow-md hover:from-sky-600 hover:to-cyan-600"
              }`}
              onClick={sendMessage}
              disabled={sending || (!newMsg.trim() && !file)}
              aria-label="Send message"
            >
              <FaPaperPlane className="ml-[1px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute right-4 top-4 text-white hover:text-gray-200"
            aria-label="Close image preview"
          >
            <FaTimes size={22} />
          </button>

          <img
            src={previewImage}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}