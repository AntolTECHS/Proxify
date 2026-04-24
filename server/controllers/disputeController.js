import Dispute from "../models/Dispute.js";
import {
  createDispute,
  getDisputeById,
  addMessage,
  addEvidence,
  closeDispute,
  deleteEvidence,
} from "../services/disputeService.js";

/* ================= HELPERS ================= */

const isParticipantOrAdmin = (dispute, user) => {
  if (!dispute || !user) return false;

  if (user.role === "admin") return true;

  return (
    dispute.openedBy?.toString() === user._id.toString() ||
    dispute.against?.toString() === user._id.toString()
  );
};

/* ================= FORMAT RESPONSE ================= */

const formatDispute = (dispute) => {
  if (!dispute) return dispute;

  const booking = dispute.jobId || {};

  return {
    ...dispute.toObject(),

    serviceName:
      dispute.serviceSnapshot?.name ||
      booking.serviceName ||
      booking.service?.name ||
      "Service",

    customer: dispute.customer || booking.customer || null,
    provider: dispute.provider || booking.provider || null,
  };
};

/* ================= CREATE DISPUTE ================= */
export const openDispute = async (req, res) => {
  try {
    const dispute = await createDispute(req.body, req.user);

    const populated = await Dispute.findById(dispute._id)
      .populate("jobId")
      .populate("openedBy", "name role")
      .populate("against", "name role");

    res.status(201).json(formatDispute(populated));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/* ================= MY DISPUTES ================= */
export const myDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.find({
      $or: [{ openedBy: req.user._id }, { against: req.user._id }],
    })
      .populate({
        path: "jobId",
        populate: {
          path: "provider",
          populate: { path: "user", select: "name role" },
        },
      })
      .populate("openedBy", "name role")
      .populate("against", "name role")
      .sort({ createdAt: -1 });

    res.json(disputes.map(formatDispute));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* ================= GET SINGLE DISPUTE ================= */
export const getDispute = async (req, res) => {
  try {
    const result = await getDisputeById(req.params.id, req.user);

    res.json({
      ...result,
      dispute: formatDispute(result.dispute),
    });
  } catch (error) {
    const code = error.message === "Dispute not found" ? 404 : 403;
    res.status(code).json({ message: error.message });
  }
};

/* ================= SEND MESSAGE ================= */
export const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const msg = await addMessage(
      {
        disputeId: req.params.id,
        senderId: req.user._id,
        message: message.trim(),
        attachments: [],
      },
      req.user
    );

    res.status(201).json(msg);
  } catch (error) {
    const code = error.message === "Dispute not found" ? 404 : 400;
    res.status(code).json({ message: error.message });
  }
};

/* ================= UPLOAD EVIDENCE ================= */
export const uploadEvidence = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const evidence = await addEvidence(
      {
        disputeId: req.params.id,
        uploadedBy: req.user._id,
        files: req.files,
      },
      req.user
    );

    res.status(201).json(evidence);
  } catch (error) {
    const code = error.message === "Dispute not found" ? 404 : 400;
    res.status(code).json({ message: error.message });
  }
};

/* ================= CLOSE DISPUTE ================= */
export const closeMyDispute = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can close disputes." });
    }

    const dispute = await closeDispute({
      disputeId: req.params.id,
      user: req.user,
    });

    const populated = await Dispute.findById(dispute._id)
      .populate("jobId")
      .populate("openedBy", "name role")
      .populate("against", "name role");

    res.json(formatDispute(populated));
  } catch (error) {
    const code = error.message === "Dispute not found" ? 404 : 400;
    res.status(code).json({ message: error.message });
  }
};

/* ================= DELETE EVIDENCE ================= */
export const deleteMyEvidence = async (req, res) => {
  try {
    await deleteEvidence({
      evidenceId: req.params.evidenceId,
      user: req.user,
    });

    res.json({ message: "Evidence deleted" });
  } catch (error) {
    const code =
      error.message === "Evidence not found" ||
      error.message === "Dispute not found"
        ? 404
        : 400;

    res.status(code).json({ message: error.message });
  }
};

/* ================= RESPOND TO DISPUTE ================= */
export const respondToDispute = async (req, res) => {
  try {
    const { message } = req.body;

    const dispute = await Dispute.findById(req.params.id);

    if (!dispute) {
      return res.status(404).json({ message: "Dispute not found" });
    }

    if (!isParticipantOrAdmin(dispute, req.user)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (message && message.trim()) {
      await addMessage(
        {
          disputeId: dispute._id,
          senderId: req.user._id,
          message: message.trim(),
          attachments: [],
        },
        req.user
      );
    }

    const populated = await Dispute.findById(dispute._id)
      .populate("jobId")
      .populate("openedBy", "name role")
      .populate("against", "name role");

    res.json({
      message: "Response saved",
      dispute: formatDispute(populated),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};