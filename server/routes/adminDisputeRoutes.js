// routes/adminDisputesRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import Dispute from "../models/Dispute.js";
import { resolveDispute, closeDispute } from "../services/disputeService.js";

const router = express.Router();

// Admin-only access for everything in this router
router.use(protect("admin"));

const handleAsync = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    console.error("Admin disputes route error:", error);

    const message = error?.message || "Server error";
    const code =
      message === "Dispute not found"
        ? 404
        : message === "Forbidden" || message === "Only admins can close disputes." || message === "Only admins can resolve disputes."
        ? 403
        : message === "Invalid outcome"
        ? 400
        : message === "No token provided" ||
          message === "Invalid token" ||
          message === "Session expired" ||
          message === "User not found"
        ? 401
        : 500;

    res.status(code).json({ message });
  }
};

router.get(
  "/",
  handleAsync(async (req, res) => {
    const disputes = await Dispute.find()
      .populate({
        path: "jobId",
        populate: [
          {
            path: "provider",
            populate: {
              path: "user",
              select: "name fullName email role basicInfo",
            },
          },
          {
            path: "customer",
            select: "name fullName email role basicInfo",
          },
        ],
      })
      .populate("openedBy", "name fullName email role basicInfo")
      .populate("against", "name fullName email role basicInfo")
      .sort({ createdAt: -1 });

    res.json(disputes);
  })
);

router.patch(
  "/:id/resolve",
  handleAsync(async (req, res) => {
    const { outcome, note } = req.body;

    if (!["customer_favored", "provider_favored", "neutral"].includes(outcome)) {
      return res.status(400).json({ message: "Invalid outcome" });
    }

    const dispute = await resolveDispute({
      disputeId: req.params.id,
      resolvedBy: req.user, // important: pass the full user, not only the id
      outcome,
      note: note || "",
    });

    res.json(dispute);
  })
);

router.patch(
  "/:id/close",
  handleAsync(async (req, res) => {
    const dispute = await closeDispute({
      disputeId: req.params.id,
      user: req.user,
    });

    res.json(dispute);
  })
);

export default router;