// routes/chatRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import multer from "multer";
import { uploadBuffer } from "../utils/cloudinaryUpload.js";
import {
  getOrCreateConversation,
  sendMessage,
} from "../controllers/chatController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ---------------- REST CHAT ROUTES ---------------- */
router.get("/conversation/:bookingId", protect(), getOrCreateConversation);
router.post("/messages/:conversationId", protect(), sendMessage);

/* ---------------- IMAGE UPLOAD ROUTE ---------------- */
router.post(
  "/upload-image",
  protect(),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const result = await uploadBuffer(req.file.buffer, "chat_images");

      res.json({ success: true, url: result.secure_url });
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      res.status(500).json({ success: false, error: "Upload failed" });
    }
  }
);

export default router;