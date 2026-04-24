import { useEffect, useMemo, useRef, useState } from "react";
import { FaPaperPlane, FaImage, FaTimes } from "react-icons/fa";

const MAX_DEFAULT_FILES = 5;
const MAX_DEFAULT_FILE_SIZE_MB = 10;

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return String(value);

  return (
    String(
      value._id ||
        value.id ||
        value.userId ||
        value.uid ||
        value.senderId ||
        value.createdBy ||
        value.uploadedBy ||
        ""
    ) || null
  );
};

const getCurrentUserId = (currentUserId) => normalizeId(currentUserId);

const getSenderId = (message) => {
  if (!message) return null;

  const candidates = [
    message.senderId,
    message.sender,
    message.userId,
    message.createdBy,
    message.uploadedBy,
    message.owner,
    message.from,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeId(candidate);
    if (normalized) return normalized;
  }

  return null;
};

const isMineMessage = (message, currentUserId) => {
  if (!message) return false;

  const currentId = getCurrentUserId(currentUserId);
  const senderId = getSenderId(message);

  return Boolean(
    (currentId && senderId && senderId === currentId) ||
      message.self === true ||
      message.isMine === true ||
      message.mine === true
  );
};

const getSenderName = (message, currentUserId = null) => {
  if (!message) return "Unknown";
  if (message.senderName) return message.senderName;

  const sender = message.senderId || message.sender;
  const mine = isMineMessage(message, currentUserId);

  if (!sender) return mine ? "You" : "Unknown";

  if (typeof sender === "string" || typeof sender === "number") {
    return normalizeId(sender) === getCurrentUserId(currentUserId) ? "You" : "Unknown";
  }

  return sender.name || sender.fullName || (mine ? "You" : "Unknown");
};

const getSenderRole = (message) => {
  if (!message) return "user";
  if (message.senderRole) return message.senderRole;

  const sender = message.senderId || message.sender;
  if (!sender) return message.messageType || "user";
  if (typeof sender === "string" || typeof sender === "number") return message.messageType || "user";

  return sender.role || message.messageType || "user";
};

const getMessageText = (message) => message?.message || message?.text || "";

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const isImageFile = (file) => {
  const mime = file?.type || file?.mimeType || "";
  return mime.startsWith("image/");
};

const isImageUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(url);
};

const fileKey = (file, index) =>
  `${file.name || file.originalName || "file"}-${file.size || file.fileSize || 0}-${index}`;

const createTempId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getMessageKey = (message) =>
  message?.tempId ||
  message?._id ||
  message?.id ||
  `${message?.createdAt || ""}-${getMessageText(message)}-${getSenderId(message) || ""}`;

const sortByCreatedAt = (a, b) => {
  const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
  const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
  return ta - tb;
};

export default function Chat({
  messages = [],
  onSend,
  currentUserId = null,
  placeholder = "Write a message...",
  title = "Messages",
  maxFiles = MAX_DEFAULT_FILES,
  maxFileSizeMB = MAX_DEFAULT_FILE_SIZE_MB,
  accept = "*/*",
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [optimisticMessages, setOptimisticMessages] = useState([]);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const endRef = useRef(null);
  const pendingUrlsRef = useRef(new Set());

  const maxFileSizeBytes = useMemo(
    () => maxFileSizeMB * 1024 * 1024,
    [maxFileSizeMB]
  );

  const cleanupTempUrls = (message) => {
    const attachments = Array.isArray(message?.attachments) ? message.attachments : [];
    for (const att of attachments) {
      const url = att?.localPreviewUrl;
      if (url && pendingUrlsRef.current.has(url)) {
        URL.revokeObjectURL(url);
        pendingUrlsRef.current.delete(url);
      }
    }
  };

  useEffect(() => {
    return () => {
      for (const url of pendingUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      pendingUrlsRef.current.clear();
    };
  }, []);

  const mergedMessages = useMemo(() => {
    const map = new Map();

    for (const m of messages) {
      map.set(getMessageKey(m), m);
    }

    for (const opt of optimisticMessages) {
      const key = getMessageKey(opt);
      const existing = map.get(key);

      if (!existing) {
        map.set(key, opt);
      } else {
        map.set(key, {
          ...opt,
          ...existing,
          tempId: opt.tempId || existing.tempId || null,
        });
      }
    }

    return Array.from(map.values()).sort(sortByCreatedAt);
  }, [messages, optimisticMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mergedMessages, files.length]);

  useEffect(() => {
    if (!optimisticMessages.length || !messages.length) return;

    setOptimisticMessages((prev) =>
      prev.filter((opt) => {
        const matched = messages.some((m) => {
          if (opt.tempId && m.tempId && opt.tempId === m.tempId) return true;
          if (opt.tempId && m._id && opt.tempId === m._id) return true;
          if (opt._id && m._id && opt._id === m._id) return true;
          return false;
        });

        if (matched) {
          cleanupTempUrls(opt);
          return false;
        }

        return true;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const normalizeFiles = (incoming) => {
    const list = Array.from(incoming || []);
    if (!list.length) return [];

    const next = [];
    for (const file of list) {
      if (next.length >= maxFiles) break;

      if (file.size > maxFileSizeBytes) {
        setError(`${file.name} is too large. Maximum size is ${maxFileSizeMB} MB.`);
        continue;
      }

      next.push(file);
    }

    if (list.length > maxFiles) {
      setError(`You can attach up to ${maxFiles} files per message.`);
    }

    return next;
  };

  const addFiles = (incoming) => {
    setError("");

    const normalized = normalizeFiles(incoming);
    if (!normalized.length) return;

    setFiles((prev) => {
      const merged = [...prev];
      for (const file of normalized) {
        if (merged.length >= maxFiles) break;
        merged.push(file);
      }
      return merged.slice(0, maxFiles);
    });
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearComposer = () => {
    setText("");
    setFiles([]);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    textareaRef.current?.focus();
  };

  const buildOptimisticMessage = (trimmedText, selectedFiles) => {
    const tempId = createTempId();

    const attachments = selectedFiles.map((file) => {
      const url = URL.createObjectURL(file);
      pendingUrlsRef.current.add(url);

      return {
        url,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        localPreviewUrl: url,
      };
    });

    return {
      tempId,
      _id: tempId,
      senderId: currentUserId,
      senderName: "You",
      senderRole: "user",
      message: trimmedText,
      text: trimmedText,
      attachments,
      createdAt: new Date().toISOString(),
      status: "sending",
      isPending: true,
      self: true,
      isMine: true,
    };
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((sending || (!trimmed && files.length === 0)) || typeof onSend !== "function") {
      return;
    }

    setSending(true);
    setError("");

    const optimisticMessage = buildOptimisticMessage(trimmed, files);
    setOptimisticMessages((prev) => [...prev, optimisticMessage]);
    clearComposer();

    try {
      const result = await onSend(trimmed, files, optimisticMessage.tempId);

      if (result?.message) {
        const confirmed = {
          ...result.message,
          tempId: optimisticMessage.tempId,
          self: true,
          isMine: true,
          senderId: result.message.senderId || currentUserId,
        };

        cleanupTempUrls(optimisticMessage);

        setOptimisticMessages((prev) =>
          prev.map((m) => (m.tempId === optimisticMessage.tempId ? confirmed : m))
        );
      }
    } catch (err) {
      setOptimisticMessages((prev) =>
        prev.filter((m) => m.tempId !== optimisticMessage.tempId)
      );
      cleanupTempUrls(optimisticMessage);
      setError(err?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = (e) => {
    const clipboardFiles = e.clipboardData?.files;
    if (clipboardFiles?.length) addFiles(clipboardFiles);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const dropped = e.dataTransfer?.files;
    if (dropped?.length) addFiles(dropped);
  };

  const renderSeenStatus = (message) => {
    if (!message) return null;

    const seenCount = Array.isArray(message.seenBy) ? message.seenBy.length : null;

    if (message.isSystemMessage) return <span style={{ color: "#6b7280" }}>system</span>;
    if (message.messageType === "admin" || message.senderRole === "admin") {
      return <span style={{ color: "#7c3aed" }}>admin</span>;
    }
    if (message.status === "sending" || message.isPending) {
      return <span style={{ color: "#6b7280" }}>sending</span>;
    }
    if (seenCount != null && seenCount > 0) return <span style={{ color: "#059669" }}>seen</span>;
    if (message.seenAt) return <span style={{ color: "#059669" }}>seen</span>;
    if (message.status === "seen") return <span style={{ color: "#059669" }}>seen</span>;
    if (message.status === "delivered") return <span style={{ color: "#2563eb" }}>delivered</span>;

    return null;
  };

  const renderMessageAttachment = (file, idx) => {
    const url = file?.url || file?.fileUrl || file?.imageUrl;
    const name = file?.originalName || file?.name || url || "attachment";
    const mime = file?.mimeType || "";
    const imageLike = isImageUrl(url) || mime.startsWith("image/");

    if (!url) return null;

    return (
      <div key={fileKey(file, idx)} style={{ marginTop: 10 }}>
        {imageLike ? (
          <img
            src={url}
            alt={name}
            onClick={() => setPreviewImage(url)}
            style={{
              maxWidth: "240px",
              width: "100%",
              maxHeight: "180px",
              objectFit: "cover",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              cursor: "pointer",
              display: "block",
            }}
          />
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 10,
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              color: "#0f172a",
              textDecoration: "none",
              fontSize: 13,
              wordBreak: "break-word",
              maxWidth: "100%",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "#0ea5e9",
                flexShrink: 0,
              }}
            />
            <span>{name}</span>
          </a>
        )}
      </div>
    );
  };

  const renderComposerAttachment = (file, idx) => {
    const imageLike = isImageFile(file);
    const previewUrl = imageLike ? URL.createObjectURL(file) : null;

    return (
      <div
        key={fileKey(file, idx)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: 10,
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {imageLike ? (
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid #e5e7eb",
                flexShrink: 0,
                background: "#f9fafb",
              }}
            >
              <img
                src={previewUrl}
                alt={file.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          ) : (
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              FILE
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#111827",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 360,
              }}
            >
              {file.name}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {Math.round((file.size / 1024 / 1024) * 100) / 100} MB
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => removeFile(idx)}
          style={{
            border: "none",
            background: "#fee2e2",
            color: "#991b1b",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          Remove
        </button>
      </div>
    );
  };

  const isMine = (message) => isMineMessage(message, currentUserId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {mergedMessages.length} message{mergedMessages.length === 1 ? "" : "s"}
        </div>
      </div>

      <div
        onDragEnter={() => setDragActive(true)}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        style={{
          maxHeight: 360,
          overflowY: "auto",
          overflowX: "hidden",
          border: dragActive ? "2px dashed #0ea5e9" : "1px solid #e5e7eb",
          padding: 12,
          borderRadius: 12,
          background: dragActive ? "#f0f9ff" : "#fff",
          transition: "all 0.15s ease",
        }}
      >
        {mergedMessages.length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: 14 }}>No messages yet.</div>
        ) : (
          mergedMessages.map((m, index) => {
            const mine = isMine(m);
            const hasAttachments = Array.isArray(m.attachments) && m.attachments.length > 0;

            return (
              <div
                key={getMessageKey(m) || index}
                style={{
                  display: "flex",
                  width: "100%",
                  justifyContent: mine ? "flex-end" : "flex-start",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: "fit-content",
                    maxWidth: "78%",
                    minWidth: "180px",
                    padding: 12,
                    borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    border: "1px solid #f3f4f6",
                    background: m.isSystemMessage
                      ? "#f9fafb"
                      : mine
                      ? "#dbeafe"
                      : "#ffffff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    opacity: m.status === "sending" || m.isPending ? 0.82 : 1,
                    marginLeft: mine ? "auto" : 0,
                    marginRight: mine ? 0 : "auto",
                    alignSelf: mine ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginBottom: 6,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: mine ? "flex-end" : "flex-start",
                      textAlign: mine ? "right" : "left",
                    }}
                  >
                    <b style={{ color: "#111827" }}>{getSenderName(m, currentUserId)}</b>
                    <span>•</span>
                    <span>{getSenderRole(m)}</span>
                    <span>•</span>
                    <span>{formatTime(m.createdAt)}</span>
                    {renderSeenStatus(m) && (
                      <>
                        <span>•</span>
                        {renderSeenStatus(m)}
                      </>
                    )}
                  </div>

                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: "#111827",
                      textAlign: mine ? "right" : "left",
                    }}
                  >
                    {getMessageText(m)}
                  </div>

                  {m.imageUrl &&
                    renderMessageAttachment({ url: m.imageUrl, originalName: "image" }, 0)}

                  {hasAttachments && (
                    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                      {m.attachments.map((file, idx) => renderMessageAttachment(file, idx))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {files.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
            Attachments ({files.length}/{maxFiles})
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {files.map((file, idx) => renderComposerAttachment(file, idx))}
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            background: "#fef2f2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "stretch",
          flexWrap: "wrap",
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          rows={3}
          style={{
            flex: "1 1 320px",
            resize: "vertical",
            minHeight: 96,
            padding: 12,
            borderRadius: 12,
            border: "1px solid #d1d5db",
            outline: "none",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 140 }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            onChange={(e) => addFiles(e.target.files)}
            style={{ display: "none" }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || files.length >= maxFiles}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #d1d5db",
              background: "#fff",
              color: "#111827",
              cursor: sending || files.length >= maxFiles ? "not-allowed" : "pointer",
              fontWeight: 600,
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <FaImage />
            Add files
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={sending || (!text.trim() && files.length === 0)}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #111827",
              background: sending ? "#4b5563" : "#111827",
              color: "#fff",
              cursor:
                sending || (!text.trim() && files.length === 0)
                  ? "not-allowed"
                  : "pointer",
              fontWeight: 700,
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <FaPaperPlane />
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>

      {previewImage && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.8)",
            padding: 16,
          }}
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            style={{
              position: "absolute",
              right: 16,
              top: 16,
              color: "#fff",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            aria-label="Close image preview"
          >
            <FaTimes size={22} />
          </button>

          <img
            src={previewImage}
            alt="Preview"
            style={{ maxHeight: "90vh", maxWidth: "90vw", borderRadius: 12 }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}