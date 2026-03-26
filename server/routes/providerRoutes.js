// routes/providerRoutes.js
import express from "express";
import multer from "multer";
import Provider from "../models/Provider.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { protect } from "../middleware/authMiddleware.js";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/*                            CLOUDINARY CONFIG                               */
/* -------------------------------------------------------------------------- */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const uploadBuffer = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });

/* -------------------------------------------------------------------------- */
/*                               MULTER CONFIG                                */
/* -------------------------------------------------------------------------- */

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

/* -------------------------------------------------------------------------- */
/*                                  TEST ROUTE                                */
/* -------------------------------------------------------------------------- */

router.get("/test", (req, res) => {
  res.json({ message: "Provider route works!" });
});

/* -------------------------------------------------------------------------- */
/*                         POST /api/providers/onboard                        */
/*                         BASIC INFO ONLY                                   */
/* -------------------------------------------------------------------------- */

router.post("/onboard", protect(), async (req, res) => {
  try {
    let info = {};

    try {
      info =
        typeof req.body.basicInfo === "string"
          ? JSON.parse(req.body.basicInfo)
          : req.body.basicInfo || {};
    } catch {
      return res.status(400).json({ message: "Invalid JSON format for basicInfo" });
    }

    if (!info.providerName || !info.email || !info.phone) {
      return res.status(400).json({
        message: "Provider name, email, and phone are required",
      });
    }

    let provider = await Provider.findOne({ user: req.user._id });

    if (!provider) {
      provider = await Provider.create({
        user: req.user._id,
        basicInfo: {
          providerName: info.providerName,
          email: info.email,
          phone: info.phone,
          businessName: info.businessName || "",
          bio: info.bio || "",
          location: info.location || "",
          photoURL: "",
        },
        services: [],
        documents: [],
        location: {
          type: "Point",
          coordinates: [0, 0],
        },
        status: "approved",
        availabilityStatus: "Offline",
        rating: 0,
        reviewCount: 0,
      });
    } else {
      provider.basicInfo = {
        ...provider.basicInfo,
        providerName: info.providerName ?? provider.basicInfo.providerName,
        email: info.email ?? provider.basicInfo.email,
        phone: info.phone ?? provider.basicInfo.phone,
        businessName: info.businessName ?? provider.basicInfo.businessName,
        bio: info.bio ?? provider.basicInfo.bio,
        location: info.location ?? provider.basicInfo.location,
      };

      await provider.save();
    }

    const updatedUser = await User.findById(req.user._id);
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (updatedUser.role !== "provider") {
      updatedUser.role = "provider";
      await updatedUser.save();
    }

    const token = jwt.sign(
      { id: updatedUser._id, role: updatedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      provider,
      token,
      onboardComplete: true,
    });
  } catch (err) {
    console.error("ONBOARD ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/*                       GET ALL APPROVED PROVIDERS                           */
/* -------------------------------------------------------------------------- */

router.get("/", async (req, res) => {
  try {
    const providers = await Provider.find({ status: "approved" })
      .populate("user", "-password")
      .lean();

    const result = providers.map((p) => ({
      ...p,
      approvedBadge: p.status === "approved" ? "Approved" : "Not Approved",
    }));

    res.json(result);
  } catch (err) {
    console.error("GET PROVIDERS ERROR:", err);
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
/*                          FULL SETTINGS ONLY                               */
/* -------------------------------------------------------------------------- */

router.put(
  "/update",
  protect("provider"),
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "files", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const provider = await Provider.findOne({ user: req.user._id });
      if (!provider) return res.status(404).json({ message: "Provider not found" });

      let info = {};
      let services = [];

      try {
        info =
          typeof req.body.basicInfo === "string"
            ? JSON.parse(req.body.basicInfo)
            : req.body.basicInfo || {};

        services =
          typeof req.body.services === "string"
            ? JSON.parse(req.body.services)
            : req.body.services || [];
      } catch {
        return res.status(400).json({ message: "Invalid JSON format" });
      }

      provider.basicInfo = {
        ...provider.basicInfo,
        providerName: info.providerName ?? provider.basicInfo.providerName,
        email: info.email ?? provider.basicInfo.email,
        phone: info.phone ?? provider.basicInfo.phone,
        businessName: info.businessName ?? provider.basicInfo.businessName,
        bio: info.bio ?? provider.basicInfo.bio,
        location: info.location ?? provider.basicInfo.location,
      };

      if (req.files?.photo?.[0]) {
        const result = await uploadBuffer(
          req.files.photo[0].buffer,
          "proxify/profile"
        );
        provider.basicInfo.photoURL = result.secure_url;
      }

      if (req.files?.files?.length > 0) {
        for (const file of req.files.files) {
          const result = await uploadBuffer(
            file.buffer,
            "proxify/documents"
          );
          provider.documents.push({
            name: file.originalname,
            path: result.secure_url,
            size: file.size,
            type: file.mimetype,
          });
        }
      }

      if (Array.isArray(services) && services.length > 0) {
        provider.services = services.map((s) => ({
          name: s.name,
          price: Number(s.price) || 0,
          description: s.description || "",
        }));
      }

      if (info.lat !== undefined && info.lng !== undefined) {
        provider.location = {
          type: "Point",
          coordinates: [Number(info.lng), Number(info.lat)],
        };
      }

      await provider.save();
      res.json(provider);
    } catch (err) {
      console.error("UPDATE ERROR:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

/* -------------------------------------------------------------------------- */
/*                      GET Public Provider Profile by ID                     */
/* -------------------------------------------------------------------------- */

router.get("/:id", async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id).lean();
    if (!provider) return res.status(404).json({ message: "Provider not found" });
    res.json(provider);
  } catch (err) {
    console.error("GET PROVIDER ERROR:", err);
    res.status(500).json({ message: "Server error fetching provider" });
  }
});

export default router;