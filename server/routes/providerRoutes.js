// server/routes/providerRoutes.js
import express from "express";
import { upgradeToProvider, getProviderProfile } from "../controllers/providerController.js";
import { protect } from "../middleware/authMiddleware.js";
import multer from "multer";
import path from "path";

const router = express.Router();

// ---------- Multer setup ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// ---------- Routes ----------
router.post("/onboard", protect(), upload.array("files"), upgradeToProvider);
router.get("/me", protect("provider"), getProviderProfile);

export default router;