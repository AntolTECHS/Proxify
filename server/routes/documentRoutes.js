const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const {
  uploadDocument,
  getProviderDocuments,
  getAllDocuments,
  verifyDocument,
} = require("../controllers/documentController");

// ---------- PROVIDER ROUTES ----------
router.post("/provider/documents", protect, uploadDocument);
router.get("/provider/documents", protect, getProviderDocuments);

// ---------- ADMIN ROUTES ----------
router.get("/admin/documents", protect, admin, getAllDocuments);
router.patch("/admin/documents/:id/verify", protect, admin, verifyDocument);

module.exports = router;
