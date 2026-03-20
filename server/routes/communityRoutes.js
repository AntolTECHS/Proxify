// routes/communityRoutes.js
import express from "express";
import multer from "multer";

import {
  createPost,
  getPosts,
  likePost,
  addComment,
} from "../controllers/communityController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Multer memory storage for Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Routes
router.get("/", getPosts);

router.post("/post", protect(), upload.single("image"), createPost);

router.put("/like/:id", protect(), likePost);

router.post("/comment/:id", protect(), addComment);

export default router;