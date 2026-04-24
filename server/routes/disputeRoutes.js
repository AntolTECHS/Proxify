import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";
import {
  openDispute,
  myDisputes,
  getDispute,
  sendMessage,
  uploadEvidence,
  respondToDispute,
  closeMyDispute,
  deleteMyEvidence,
} from "../controllers/disputeController.js";

const router = express.Router();

// Create and fetch disputes
router.post("/", protect(), openDispute);
router.get("/my", protect(), myDisputes);
router.get("/:id", protect(), getDispute);

// Conversation / activity
router.post("/:id/messages", protect(), sendMessage);
router.post("/:id/respond", protect(), respondToDispute);

// Evidence handling
router.post("/:id/evidence", protect(), upload.array("files", 10), uploadEvidence);
router.delete("/:id/evidence/:evidenceId", protect(), deleteMyEvidence);

// Lifecycle
router.patch("/:id/close", protect(), adminOnly, closeMyDispute);

export default router;