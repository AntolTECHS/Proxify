import { useState } from "react";
import { FaFileAlt, FaImage, FaVideo, FaFilePdf, FaEye, FaTimes } from "react-icons/fa";

const getIcon = (type = "", mime = "") => {
  if (mime.startsWith("image/") || type === "image") return <FaImage />;
  if (mime.startsWith("video/") || type === "video") return <FaVideo />;
  if (mime.includes("pdf") || type === "document") return <FaFilePdf />;
  return <FaFileAlt />;
};

const formatSize = (bytes = 0) => {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

export default function Evidence({ items = [] }) {
  const [preview, setPreview] = useState(null);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h4 style={{ margin: 0 }}>Evidence</h4>
        <span style={{ fontSize: 12, color: "#666" }}>
          {items.length} file{items.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div style={{ color: "#666", fontSize: 14 }}>
          No evidence uploaded.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((e) => {
            const isImage = (e.mimeType || "").startsWith("image/") || e.evidenceType === "image";
            const isVideo = (e.mimeType || "").startsWith("video/");

            return (
              <div
                key={e._id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 12,
                  background: "#fff",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                {/* Icon / Preview */}
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: "#f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 16,
                    color: "#374151",
                  }}
                >
                  {getIcon(e.evidenceType, e.mimeType)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#111827",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {e.originalName || "Untitled file"}
                  </div>

                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                    {e.evidenceType || "other"} • {formatSize(e.fileSize)}
                  </div>

                  {/* Actions */}
                  <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
                    <a
                      href={e.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: 12,
                        color: "#2563eb",
                        textDecoration: "none",
                        fontWeight: 600,
                      }}
                    >
                      Open file
                    </a>

                    {(isImage || isVideo) && (
                      <button
                        onClick={() => setPreview(e)}
                        style={{
                          fontSize: 12,
                          color: "#059669",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        Preview
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 50,
          }}
        >
          <button
            onClick={() => setPreview(null)}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              background: "transparent",
              border: "none",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <FaTimes size={22} />
          </button>

          {preview.mimeType?.startsWith("image/") || preview.evidenceType === "image" ? (
            <img
              src={preview.fileUrl}
              alt={preview.originalName}
              style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12 }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : preview.mimeType?.startsWith("video/") ? (
            <video
              controls
              src={preview.fileUrl}
              style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12 }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}