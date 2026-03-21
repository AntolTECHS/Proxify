import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getOrCreateConversation,
  sendMessage,
} from "../controllers/chatController.js";

const router = express.Router();

router.get("/conversation/:bookingId", protect(), getOrCreateConversation);
router.post("/messages/:conversationId", protect(), sendMessage);

export default router;