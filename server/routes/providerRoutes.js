import express from "express";
import multer from "multer";
import Provider from "../models/Provider.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { protect } from "../middleware/authMiddleware.js";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import { geocodeAddress } from "../utils/geocode.js";

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

function parseJsonInput(input, fallback = {}) {
  try {
    if (typeof input === "string") return JSON.parse(input);
    if (input && typeof input === "object") return input;
    return fallback;
  } catch {
    return null;
  }
}

function normalizeServices(services) {
  if (!Array.isArray(services)) return [];
  return services.map((s) => ({
    name: String(s?.name || "").trim(),
    price: Number(s?.price) || 0,
    description: String(s?.description || "").trim(),
  }));
}

function buildCoordinatesFromLatLng(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
    return [lngNum, latNum]; // [lng, lat]
  }

  return null;
}

function normalizeProvider(provider) {
  if (!provider) return provider;

  const plain =
    typeof provider.toObject === "function" ? provider.toObject() : provider;

  return {
    ...plain,
    services: Array.isArray(plain.services) ? plain.services : [],
    documents: Array.isArray(plain.documents) ? plain.documents : [],
    resubmissions: Array.isArray(plain.resubmissions) ? plain.resubmissions : [],
    isApproved: plain.status === "approved",
    isPending: plain.status === "pending",
    isRejected: plain.status === "rejected",
    approvalBanner:
      plain.approvalBanner ||
      (plain.status === "approved"
        ? "Approved"
        : plain.status === "rejected"
        ? "Rejected"
        : "Pending admin approval"),
  };
}

function mergeAvailability(existingAvailability, incomingAvailability) {
  return {
    ...(typeof existingAvailability?.toObject === "function"
      ? existingAvailability.toObject()
      : existingAvailability || {}),
    ...incomingAvailability,
  };
}

async function resolveProviderLocation({ lat, lng, locationText }) {
  const coordinates = buildCoordinatesFromLatLng(lat, lng);

  if (coordinates) return coordinates;

  if (locationText) {
    const geo = await geocodeAddress(locationText);
    if (geo) return [geo.lng, geo.lat];
  }

  return [0, 0];
}

/* -------------------------------------------------------------------------- */
/*                                  TEST ROUTE                                */
/* -------------------------------------------------------------------------- */
router.get("/test", (req, res) => res.json({ message: "Provider route works!" }));

/* -------------------------------------------------------------------------- */
/*                         POST /api/providers/onboard                        */
/* -------------------------------------------------------------------------- */
router.post(
  "/onboard",
  protect(),
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "files", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const basicInfo = parseJsonInput(req.body.basicInfo, null);
      const servicesInput = parseJsonInput(req.body.services, []);
      const availabilityInput = parseJsonInput(req.body.availability, {});

      if (!basicInfo) {
        return res.status(400).json({ message: "Invalid JSON format for basicInfo" });
      }

      const services = normalizeServices(servicesInput);

      if (!basicInfo.providerName || !basicInfo.email || !basicInfo.phone) {
        return res.status(400).json({
          message: "Provider name, email, and phone are required",
        });
      }

      const existingProvider = await Provider.findOne({ user: req.user._id });

      // Upload profile photo
      let photoURL = "";
      if (req.files?.photo?.[0]) {
        const result = await uploadBuffer(req.files.photo[0].buffer, "proxify/profile");
        photoURL = result.secure_url;
      }

      // Upload documents
      const documents = [];
      if (req.files?.files?.length) {
        for (const file of req.files.files) {
          const result = await uploadBuffer(file.buffer, "proxify/documents");
          documents.push({
            name: file.originalname,
            path: result.secure_url,
            size: file.size,
            type: file.mimetype,
          });
        }
      }

      const coordinates = await resolveProviderLocation({
        lat: req.body.lat,
        lng: req.body.lng,
        locationText: basicInfo.location,
      });

      let provider;

      if (!existingProvider) {
        provider = await Provider.create({
          user: req.user._id,
          basicInfo: {
            providerName: basicInfo.providerName,
            email: basicInfo.email,
            phone: basicInfo.phone,
            businessName: basicInfo.businessName || "",
            location: basicInfo.location || "",
            photoURL,
          },
          bio: basicInfo.bio || "",
          category: basicInfo.category || "",
          experience: Number(basicInfo.experience) || 0,
          services,
          documents,
          availability: availabilityInput || {},
          location: {
            type: "Point",
            coordinates,
          },
          status: "pending",
          approvalBanner: "Pending admin approval",
          rejectionReason: "",
          resubmissions: [],
          rating: 0,
          reviewCount: 0,
          availabilityStatus: "Offline",
        });
      } else {
        existingProvider.basicInfo = {
          ...existingProvider.basicInfo,
          providerName:
            basicInfo.providerName ?? existingProvider.basicInfo.providerName,
          email: basicInfo.email ?? existingProvider.basicInfo.email,
          phone: basicInfo.phone ?? existingProvider.basicInfo.phone,
          businessName:
            basicInfo.businessName ?? existingProvider.basicInfo.businessName,
          location: basicInfo.location ?? existingProvider.basicInfo.location,
          photoURL: photoURL || existingProvider.basicInfo.photoURL,
        };

        existingProvider.bio = basicInfo.bio ?? existingProvider.bio;
        existingProvider.category = basicInfo.category ?? existingProvider.category;

        if (basicInfo.experience !== undefined) {
          existingProvider.experience = Number(basicInfo.experience) || 0;
        }

        if (services.length > 0) {
          existingProvider.services = services;
        }

        if (documents.length > 0) {
          existingProvider.documents.push(...documents);
        }

        if (availabilityInput && typeof availabilityInput === "object") {
          existingProvider.availability = mergeAvailability(
            existingProvider.availability,
            availabilityInput
          );
        }

        if (!existingProvider.location) {
          existingProvider.location = { type: "Point", coordinates: [0, 0] };
        }

        if (coordinates) {
          existingProvider.location.type = "Point";
          existingProvider.location.coordinates = coordinates;
        }

        // Keep status as-is. Do not auto-approve existing providers.
        await existingProvider.save();
        provider = existingProvider;
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

      res.status(201).json({
        provider: normalizeProvider(provider),
        token,
      });
    } catch (err) {
      console.error("ONBOARD ERROR:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

/* -------------------------------------------------------------------------- */
/*                        PATCH /api/providers/resubmit                       */
/* -------------------------------------------------------------------------- */
router.patch("/resubmit", protect("provider"), async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    if (provider.status !== "rejected") {
      return res.status(400).json({
        message: "Only rejected providers can resubmit",
      });
    }

    const note = String(req.body?.note || "").trim();

    if (!Array.isArray(provider.resubmissions)) {
      provider.resubmissions = [];
    }

    provider.resubmissions.push({
      note,
      previousRejectionReason: provider.rejectionReason || "",
      date: new Date(),
    });

    provider.status = "pending";
    provider.approvalBanner = "Pending admin approval";
    provider.rejectionReason = "";

    await provider.save();

    res.json({
      message: "Provider resubmitted successfully",
      provider: normalizeProvider(provider),
    });
  } catch (err) {
    console.error("RESUBMIT ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/*                            GET ALL PROVIDERS                               */
/* -------------------------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const providers = await Provider.find()
      .populate("user", "-password")
      .sort({ createdAt: -1 })
      .lean();

    const result = providers.map((p) => normalizeProvider(p));

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

    res.json(normalizeProvider(provider));
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    res.status(500).json({ message: "Server error fetching provider" });
  }
});

/* -------------------------------------------------------------------------- */
/*                          UPDATE Provider Profile                           */
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
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }

      // Prevent approval state changes from provider-side updates
      delete req.body.status;
      delete req.body.rejectionReason;
      delete req.body.approvalBanner;

      const basicInfo = parseJsonInput(req.body.basicInfo, null);
      const servicesInput = parseJsonInput(req.body.services, []);
      const availabilityInput = parseJsonInput(req.body.availability, null);

      if (!basicInfo) {
        return res.status(400).json({ message: "Invalid JSON format" });
      }

      const services = normalizeServices(servicesInput);

      provider.basicInfo = {
        ...provider.basicInfo,
        providerName: basicInfo.providerName ?? provider.basicInfo.providerName,
        email: basicInfo.email ?? provider.basicInfo.email,
        phone: basicInfo.phone ?? provider.basicInfo.phone,
        businessName: basicInfo.businessName ?? provider.basicInfo.businessName,
        location: basicInfo.location ?? provider.basicInfo.location,
        photoURL: provider.basicInfo.photoURL || "",
      };

      if (typeof basicInfo.bio === "string") {
        provider.bio = basicInfo.bio;
      }

      if (basicInfo.category !== undefined) {
        provider.category = String(basicInfo.category).trim();
      }

      if (basicInfo.experience !== undefined) {
        const exp = Number(basicInfo.experience);
        if (Number.isFinite(exp) && exp >= 0) {
          provider.experience = exp;
        }
      }

      // Upload new profile photo
      if (req.files?.photo?.[0]) {
        const result = await uploadBuffer(req.files.photo[0].buffer, "proxify/profile");
        provider.basicInfo.photoURL = result.secure_url;
      }

      // Upload new documents
      if (req.files?.files?.length) {
        for (const file of req.files.files) {
          const result = await uploadBuffer(file.buffer, "proxify/documents");
          provider.documents.push({
            name: file.originalname,
            path: result.secure_url,
            size: file.size,
            type: file.mimetype,
          });
        }
      }

      // Update services if provided
      if (services.length > 0) {
        provider.services = services;
      }

      // Update availability if provided
      if (availabilityInput && typeof availabilityInput === "object") {
        provider.availability = mergeAvailability(provider.availability, availabilityInput);
      }

      // Update coordinates from lat/lng if sent
      const coordinates = buildCoordinatesFromLatLng(req.body.lat, req.body.lng);

      if (coordinates) {
        provider.location = provider.location || { type: "Point", coordinates: [0, 0] };
        provider.location.type = "Point";
        provider.location.coordinates = coordinates;
      } else if (provider.basicInfo.location) {
        const geo = await geocodeAddress(provider.basicInfo.location);
        if (geo) {
          provider.location = provider.location || { type: "Point", coordinates: [0, 0] };
          provider.location.type = "Point";
          provider.location.coordinates = [geo.lng, geo.lat];
        }
      }

      await provider.save();
      res.json(normalizeProvider(provider));
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
    const provider = await Provider.findById(req.params.id)
      .populate("user", "-password")
      .lean();

    if (!provider) return res.status(404).json({ message: "Provider not found" });

    res.json(normalizeProvider(provider));
  } catch (err) {
    console.error("GET PROVIDER ERROR:", err);
    res.status(500).json({ message: "Server error fetching provider" });
  }
});

export default router;