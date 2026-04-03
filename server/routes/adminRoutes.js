import express from "express";
import { v2 as cloudinary } from "cloudinary";
const router = express.Router();

import User from "../models/User.js";
import Provider from "../models/Provider.js";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import { protect } from "../middleware/authMiddleware.js";

/* ============================
   Cloudinary config
============================ */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

/* ============================
   Helpers
============================ */
const parsePagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const validBookingStatuses = ["pending", "accepted", "completed", "cancelled"];

const bookingTransitions = {
  pending: ["accepted", "cancelled"],
  accepted: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const extractCloudinaryInfo = (filePath) => {
  if (!filePath || typeof filePath !== "string") {
    return { publicId: "", resourceType: "image", format: "" };
  }

  if (!/^https?:\/\//i.test(filePath)) {
    return {
      publicId: filePath.replace(/^\//, ""),
      resourceType: "image",
      format: "",
    };
  }

  try {
    const parsed = new URL(filePath);
    const parts = parsed.pathname.split("/").filter(Boolean);

    const uploadIndex = parts.findIndex(
      (part, idx) =>
        (part === "upload" || part === "private" || part === "authenticated") &&
        idx > 0
    );

    let resourceType = "image";
    if (parts.includes("raw")) resourceType = "raw";
    else if (parts.includes("video")) resourceType = "video";
    else if (parts.includes("image")) resourceType = "image";

    let publicPath = "";
    if (uploadIndex >= 0) {
      publicPath = parts.slice(uploadIndex + 1).join("/");
    } else {
      publicPath = parts.slice(-1)[0] || "";
    }

    const versionMatch = publicPath.match(/^v\d+\/(.+)$/i);
    if (versionMatch) {
      publicPath = versionMatch[1];
    }

    const formatMatch = publicPath.match(/\.([a-z0-9]+)$/i);
    const format = formatMatch ? formatMatch[1].toLowerCase() : "";

    const publicId = publicPath.replace(/\.[^.]+$/, "");

    return {
      publicId: decodeURIComponent(publicId),
      resourceType,
      format,
    };
  } catch {
    return { publicId: "", resourceType: "image", format: "" };
  }
};

const buildSignedCloudinaryUrl = (doc) => {
  if (!doc) return "";

  const filePath = doc.path || doc.url || doc.link || "";
  const storedPublicId = doc.publicId || doc.public_id || "";

  let publicId = storedPublicId;
  let resourceType = doc.resourceType || doc.resource_type || "image";
  let format = doc.format || "";

  if (!publicId && filePath) {
    const extracted = extractCloudinaryInfo(filePath);
    publicId = extracted.publicId;
    resourceType = extracted.resourceType || resourceType;
    format = format || extracted.format || "";
  }

  if (!publicId) return "";

  return cloudinary.url(publicId, {
    secure: true,
    sign_url: true,
    resource_type: resourceType,
    type: "upload",
    format: format || undefined,
  });
};

/* ============================
   DASHBOARD SUMMARY
============================ */
router.get("/summary", protect("admin"), async (req, res) => {
  try {
    const [
      totalUsers,
      totalProviders,
      totalBookings,
      totalServices,
      pendingProviders,
      pendingBookings,
      approvedProviders,
      rejectedProviders,
    ] = await Promise.all([
      User.countDocuments(),
      Provider.countDocuments(),
      Booking.countDocuments(),
      Service.countDocuments(),
      Provider.countDocuments({ status: "pending" }),
      Booking.countDocuments({ status: "pending" }),
      Provider.countDocuments({ status: "approved" }),
      Provider.countDocuments({ status: "rejected" }),
    ]);

    res.json({
      success: true,
      summary: {
        totalUsers,
        totalProviders,
        totalBookings,
        totalServices,
        pendingProviders,
        pendingBookings,
        approvedProviders,
        rejectedProviders,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================
   USERS
============================ */
router.get("/users", protect("admin"), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      success: true,
      users,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================
   PROVIDERS
============================ */

// Get all providers (list view)
router.get("/providers", protect("admin"), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const providers = await Provider.find()
      .select(
        "basicInfo status services documents category rating reviewCount createdAt updatedAt"
      )
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Provider.countDocuments();

    res.json({
      success: true,
      providers,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single provider (detail view / modal)
router.get("/providers/:id", protect("admin"), async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id)
      .populate("user", "name email role")
      .lean();

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    res.json({ success: true, provider });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Secure document URL for admin only
router.get("/providers/:id/documents/:documentId/url", protect("admin"), async (req, res) => {
  try {
    const { id, documentId } = req.params;

    const provider = await Provider.findById(id).lean();

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    const documents = Array.isArray(provider.documents) ? provider.documents : [];
    const doc =
      documents.find(
        (d) => String(d._id) === String(documentId) || String(d.id) === String(documentId)
      ) ||
      (Number.isInteger(Number(documentId)) ? documents[Number(documentId)] : null);

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    const signedUrl = buildSignedCloudinaryUrl(doc);

    if (!signedUrl) {
      return res.status(400).json({
        success: false,
        message: "Could not generate secure document URL",
      });
    }

    res.json({
      success: true,
      url: signedUrl,
      document: {
        id: doc._id || doc.id || null,
        name: doc.name || "Unnamed document",
        type: doc.type || "",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Approve provider
router.put("/providers/:id/approve", protect("admin"), async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    provider.status = "approved";
    await provider.save();

    const updatedProvider = await Provider.findById(req.params.id)
      .populate("user", "name email role")
      .lean();

    res.json({
      success: true,
      message: "Provider approved successfully",
      provider: updatedProvider,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Reject provider
router.put("/providers/:id/reject", protect("admin"), async (req, res) => {
  try {
    const { notes } = req.body;

    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    provider.status = "rejected";

    if (notes && typeof notes === "string") {
      provider.rejectionNotes = notes.trim();
    }

    await provider.save();

    const updatedProvider = await Provider.findById(req.params.id)
      .populate("user", "name email role")
      .lean();

    res.json({
      success: true,
      message: "Provider rejected successfully",
      provider: updatedProvider,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================
   SERVICES
============================ */
router.get("/services", protect("admin"), async (req, res) => {
  try {
    const services = await Service.find()
      .populate("provider", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, services });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================
   BOOKINGS
============================ */
router.get("/bookings", protect("admin"), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const bookings = await Booking.find()
      .populate("customer", "name email phone")
      .populate("provider", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments();

    res.json({
      success: true,
      bookings,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================
   UPDATE BOOKING STATUS
============================ */
router.put("/bookings/:id/status", protect("admin"), async (req, res) => {
  try {
    const { status } = req.body;

    if (!validBookingStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const currentStatus = booking.status;
    const allowedNext = bookingTransitions[currentStatus] || [];

    if (currentStatus !== status && !allowedNext.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change from ${currentStatus} to ${status}`,
      });
    }

    booking.status = status;
    await booking.save();

    res.json({
      success: true,
      message: "Booking updated",
      booking,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================
   DELETE BOOKING
============================ */
router.delete("/bookings/:id", protect("admin"), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    await booking.deleteOne();

    res.json({
      success: true,
      message: "Booking deleted",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================
   ANALYTICS
============================ */
router.get("/analytics/bookings-per-day", protect("admin"), async (req, res) => {
  try {
    const data = await Booking.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: data.map((d) => ({ date: d._id, count: d.count })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;