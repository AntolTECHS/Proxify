// server/routes/providerRoutes.js
import express from "express";
import multer from "multer";
import Provider from "../models/Provider.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/*                               Multer Config                                */
/* -------------------------------------------------------------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

/* -------------------------------------------------------------------------- */
/*                                  TEST ROUTE                                */
/* -------------------------------------------------------------------------- */
router.get("/test", (req, res) => {
  res.json({ message: "Provider route works!" });
});

/* -------------------------------------------------------------------------- */
/*                         POST  /api/providers/onboard                       */
/* -------------------------------------------------------------------------- */
router.post("/onboard", protect(), upload.array("files"), async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    // Parse frontend FormData JSON
    const info = req.body.basicInfo ? JSON.parse(req.body.basicInfo) : req.body;
    const uploadedFiles = req.files?.map((file) => `/uploads/${file.filename}`) || [];

    // Check if provider already exists
    let provider = await Provider.findOne({ user: req.user._id });

    if (!provider) {
      // Create new provider
      provider = await Provider.create({
        user: req.user._id,
        basicInfo: {
          providerName: info.providerName,
          email: info.email,
          phone: info.phone,
          businessName: info.businessName,
          bio: info.bio,
          location: info.location,
          photoURL: uploadedFiles[0] || "",
        },
        documents: uploadedFiles,
        lat: info.lat ? Number(info.lat) : undefined,
        lng: info.lng ? Number(info.lng) : undefined,
        status: "approved", // <-- set approved so visible to customers
      });
    } else {
      // Update existing provider
      provider.basicInfo = {
        ...provider.basicInfo,
        providerName: info.providerName || provider.basicInfo.providerName,
        email: info.email || provider.basicInfo.email,
        phone: info.phone || provider.basicInfo.phone,
        businessName: info.businessName || provider.basicInfo.businessName,
        bio: info.bio || provider.basicInfo.bio,
        location: info.location || provider.basicInfo.location,
        photoURL: uploadedFiles[0] || provider.basicInfo.photoURL,
      };
      if (uploadedFiles.length > 0) provider.documents.push(...uploadedFiles);
      if (info.lat) provider.lat = Number(info.lat);
      if (info.lng) provider.lng = Number(info.lng);
      provider.status = "approved"; // ensure updated provider is also visible
      await provider.save();
    }

    // Upgrade user role if not already provider
    let updatedUser = await User.findById(req.user._id);
    if (updatedUser.role !== "provider") {
      updatedUser.role = "provider";
      await updatedUser.save();
    }

    // Issue new JWT
    const token = jwt.sign(
      { id: updatedUser._id, role: updatedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ provider, token });
  } catch (err) {
    console.error("ONBOARD ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/*                       GET ALL APPROVED PROVIDERS (FOR CUSTOMERS)          */
/* -------------------------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const providers = await Provider.find({ status: "approved" })
      .populate("user", "-password")
      .lean();
    res.json(providers);
  } catch (err) {
    console.error("GET ALL PROVIDERS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch providers" });
  }
});

/* -------------------------------------------------------------------------- */
/*                        GET Logged-in Provider Profile                      */
/* -------------------------------------------------------------------------- */
router.get("/me", protect("provider"), async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id }).lean();
    if (!provider) return res.status(404).json({ message: "Provider not found" });
    res.json(provider);
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error fetching provider" });
  }
});

/* -------------------------------------------------------------------------- */
/*                          UPDATE Provider Profile                           */
/* -------------------------------------------------------------------------- */
router.put("/update", protect("provider"), upload.single("photo"), async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider) return res.status(404).json({ message: "Provider not found" });

    const info = req.body.basicInfo ? JSON.parse(req.body.basicInfo) : req.body;

    provider.basicInfo = {
      ...provider.basicInfo,
      providerName: info.providerName ?? provider.basicInfo.providerName,
      email: info.email ?? provider.basicInfo.email,
      phone: info.phone ?? provider.basicInfo.phone,
      businessName: info.businessName ?? provider.basicInfo.businessName,
      bio: info.bio ?? provider.basicInfo.bio,
      location: info.location ?? provider.basicInfo.location,
    };

    if (info.lat) provider.lat = Number(info.lat);
    if (info.lng) provider.lng = Number(info.lng);

    if (req.file) {
      provider.basicInfo.photoURL = `/uploads/${req.file.filename}`;
    }

    await provider.save();
    res.json(provider);
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/*                      GET Public Provider Profile by ID                     */
/* -------------------------------------------------------------------------- */
router.get("/:id", async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id).lean();
    if (!provider) return res.status(404).json({ message: "Provider not found" });
    res.json(provider);
  } catch (err) {
    console.error("GET PUBLIC PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error fetching provider" });
  }
});

export default router;