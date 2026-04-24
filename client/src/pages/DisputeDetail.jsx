import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { closeDispute, getDispute, sendMessage, uploadEvidence } from "../api/disputeApi";
import Chat from "../components/Chat/disputeChat";
import Evidence from "../components/Evidence";
import Status from "../components/Status";

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  minWidth: 0,
};

const secondaryButtonStyle = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
  cursor: "pointer",
  fontWeight: 600,
};

const dangerButtonStyle = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #b91c1c",
  background: "#b91c1c",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

const CATEGORY_LABELS = {
  no_show: "No show",
  poor_quality: "Poor quality",
  scope_mismatch: "Scope mismatch",
  payment_issue: "Payment issue",
  damage: "Damage",
  other: "Other",
};

export default function DisputeDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const fileInputRef = useRef(null);

  const load = async () => {
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      const res = await getDispute(id);
      setData(res);
    } catch (err) {
      console.error("Load dispute failed:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to load dispute");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const dispute = data?.dispute || null;
  const messages = data?.messages || [];
  const evidence = data?.evidence || [];

  const closed = useMemo(() => {
    return ["resolved", "closed"].includes(dispute?.status);
  }, [dispute?.status]);

  const canAct = Boolean(dispute && !closed && !busyAction);

  const openPopup = (message) => {
    setPopupMessage(message);
    setPopupOpen(true);
  };

  const handleSend = async (message, files = []) => {
    if (!id || closed || busyAction) return;

    setBusyAction("send");
    setError("");

    try {
      await sendMessage(id, { message });

      if (files?.length) {
        const form = new FormData();
        files.forEach((file) => form.append("files", file));
        await uploadEvidence(id, form);
      }

      await load();
    } catch (err) {
      console.error("Send message failed:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to send message");
    } finally {
      setBusyAction("");
    }
  };

  const handleUpload = async (files) => {
    if (!id || closed || busyAction || !files?.length) return;

    setBusyAction("upload");
    setError("");

    try {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      await uploadEvidence(id, form);
      await load();
    } catch (err) {
      console.error("Upload evidence failed:", err);
      setError(err?.response?.data?.message || err?.message || "Failed to upload evidence");
    } finally {
      setBusyAction("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClose = async () => {
    if (!id || closed || busyAction) return;

    setBusyAction("close");
    setError("");

    try {
      await closeDispute(id);
      openPopup("Dispute closed successfully.");
      await load();
    } catch (err) {
      console.error("Close dispute failed:", err);

      if (err?.response?.status === 403) {
        openPopup("Only admins can close disputes.");
      } else {
        openPopup(err?.response?.data?.message || err?.message || "Failed to close dispute.");
      }

      setError(err?.response?.data?.message || err?.message || "Failed to close dispute");
    } finally {
      setBusyAction("");
    }
  };

  if (loading) {
    return <div style={{ padding: 16, color: "#6b7280" }}>Loading dispute...</div>;
  }

  if (!data || !dispute) {
    return (
      <div style={{ padding: 16 }}>
        <div style={cardStyle}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Dispute not found</div>
          <div style={{ color: "#6b7280", fontSize: 14 }}>
            The dispute could not be loaded or no longer exists.
          </div>
          {error && (
            <div
              style={{
                marginTop: 12,
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
          <button onClick={load} style={{ ...secondaryButtonStyle, marginTop: 12 }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dispute-page" style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      <style>{`
        .dispute-page,
        .dispute-page * {
          box-sizing: border-box;
        }

        .dispute-header {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .dispute-header-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .dispute-summary-grid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .dispute-main-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          align-items: start;
        }

        .dispute-section {
          min-width: 0;
        }

        .dispute-card {
          min-width: 0;
        }

        .dispute-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .dispute-top-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .dispute-upload-input {
          display: block;
          width: 100%;
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          background: #fff;
        }

        .popup-backdrop {
          position: fixed;
          inset: 0;
          z-index: 80;
          background: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .popup-card {
          width: 100%;
          max-width: 420px;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          border: 1px solid #e5e7eb;
          padding: 20px;
        }

        .popup-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #111827;
        }

        .popup-message {
          margin: 10px 0 0;
          color: #4b5563;
          font-size: 14px;
          line-height: 1.5;
        }

        .popup-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 18px;
        }

        @media (min-width: 640px) {
          .dispute-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
          }

          .dispute-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dispute-top-actions {
            justify-content: flex-end;
          }
        }

        @media (min-width: 1024px) {
          .dispute-main-grid {
            grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
          }
        }
      `}</style>

      {error && (
        <div
          style={{
            marginBottom: 16,
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

      <div style={{ ...cardStyle, marginBottom: 16 }} className="dispute-card">
        <div className="dispute-header">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="dispute-title-row">
              <h2 style={{ margin: 0, fontSize: 22, lineHeight: 1.2 }}>
                {dispute.reason || CATEGORY_LABELS[dispute.category] || "Dispute"}
              </h2>
              <Status status={dispute.status} />
            </div>

            <p style={{ margin: "10px 0 0", color: "#374151", whiteSpace: "pre-wrap" }}>
              {dispute.description}
            </p>
          </div>

          <div className="dispute-header-actions">
            {!closed && (
              <button
                onClick={handleClose}
                disabled={!canAct || busyAction === "close"}
                style={{
                  ...dangerButtonStyle,
                  opacity: !canAct || busyAction === "close" ? 0.7 : 1,
                  cursor: !canAct || busyAction === "close" ? "not-allowed" : "pointer",
                }}
              >
                {busyAction === "close" ? "Closing..." : "Close dispute"}
              </button>
            )}

            <button
              onClick={load}
              disabled={Boolean(busyAction)}
              style={{
                ...secondaryButtonStyle,
                opacity: busyAction ? 0.7 : 1,
                cursor: busyAction ? "not-allowed" : "pointer",
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="dispute-summary-grid">
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Category</div>
            <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>
              {CATEGORY_LABELS[dispute.category] || dispute.category || "Unknown"}
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Reason</div>
            <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>
              {dispute.reason || "No reason provided"}
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Opened by</div>
            <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>
              {dispute.openedBy?.name || dispute.openedBy?.role || "Unknown"}
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Against</div>
            <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>
              {dispute.against?.name || dispute.against?.role || "Unknown"}
            </div>
          </div>

          {dispute.resolution && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: 12,
                borderRadius: 10,
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                minWidth: 0,
              }}
            >
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Resolution</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {dispute.resolution.outcome || "Pending"}
              </div>
              {dispute.resolution.note && (
                <div style={{ color: "#374151", whiteSpace: "pre-wrap" }}>
                  {dispute.resolution.note}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="dispute-main-grid">
        <div style={cardStyle} className="dispute-section dispute-card">
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Messages</h3>

          <div style={{ minWidth: 0 }}>
            <Chat
              messages={messages}
              onSend={closed ? undefined : handleSend}
              placeholder={closed ? "This dispute is closed" : "Write a message..."}
            />
          </div>

          {closed && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: "#f9fafb",
                color: "#6b7280",
                fontSize: 14,
                border: "1px solid #e5e7eb",
              }}
            >
              This dispute is closed. New replies are disabled.
            </div>
          )}
        </div>

        <div style={cardStyle} className="dispute-section dispute-card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 12,
              minWidth: 0,
            }}
          >
            <h3 style={{ margin: 0 }}>Evidence</h3>
            <span style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>
              {evidence.length} item{evidence.length === 1 ? "" : "s"}
            </span>
          </div>

          <div style={{ minWidth: 0 }}>
            <Evidence items={evidence} />
          </div>

          {!closed && (
            <div style={{ marginTop: 16 }}>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  await handleUpload(files);
                }}
                className="dispute-upload-input"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={Boolean(busyAction)}
                style={{
                  ...secondaryButtonStyle,
                  marginTop: 10,
                  width: "100%",
                  opacity: busyAction ? 0.7 : 1,
                  cursor: busyAction ? "not-allowed" : "pointer",
                }}
              >
                {busyAction === "upload" ? "Uploading..." : "Upload evidence"}
              </button>
            </div>
          )}
        </div>
      </div>

      {popupOpen && (
        <div className="popup-backdrop" onClick={() => setPopupOpen(false)}>
          <div className="popup-card" onClick={(e) => e.stopPropagation()}>
            <p className="popup-title">Notice</p>
            <p className="popup-message">{popupMessage}</p>
            <div className="popup-actions">
              <button onClick={() => setPopupOpen(false)} style={secondaryButtonStyle}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
