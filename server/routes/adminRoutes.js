// src/routes/adminRoutes.js
import express from "express";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

import User from "../models/User.js";
import Provider from "../models/Provider.js";
import Booking from "../models/Booking.js";
import Service from "../models/Service.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

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

const validBookingStatuses = [
  "pending",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
];

const bookingTransitions = {
  pending: ["accepted", "cancelled"],
  accepted: ["in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
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

const normalizeProvider = (provider) => {
  if (!provider) return provider;

  const plain =
    typeof provider.toObject === "function" ? provider.toObject() : provider;

  return {
    ...plain,
    name: plain.basicInfo?.providerName || plain.user?.name || plain.name || "",
    email: plain.basicInfo?.email || plain.user?.email || plain.email || "",
    phone: plain.basicInfo?.phone || plain.phone || "",
    services: Array.isArray(plain.services) ? plain.services : [],
    documents: Array.isArray(plain.documents) ? plain.documents : [],
    resubmissions: Array.isArray(plain.resubmissions) ? plain.resubmissions : [],
    approvalBanner:
      plain.approvalBanner ||
      (plain.status === "approved"
        ? "Approved"
        : plain.status === "rejected"
        ? "Rejected"
        : "Pending admin approval"),
    rejectionReason: plain.rejectionReason || "",
    isApproved: plain.status === "approved",
    isPending: plain.status === "pending",
    isRejected: plain.status === "rejected",
  };
};

const normalizeBooking = (booking) => {
  if (!booking) return booking;

  const plain =
    typeof booking.toObject === "function" ? booking.toObject() : booking;

  const provider = plain.provider
    ? {
        ...plain.provider,
        name:
          plain.provider.basicInfo?.providerName ||
          plain.provider.user?.name ||
          plain.provider.name ||
          "",
        email:
          plain.provider.basicInfo?.email ||
          plain.provider.user?.email ||
          plain.provider.email ||
          "",
        phone: plain.provider.basicInfo?.phone || plain.provider.phone || "",
        businessName:
          plain.provider.basicInfo?.businessName ||
          plain.provider.businessName ||
          "",
        location: plain.provider.basicInfo?.location || plain.provider.location || "",
      }
    : null;

  const customer = plain.customer
    ? {
        ...plain.customer,
        name: plain.customer.name || plain.customer.fullName || "",
        email: plain.customer.email || "",
        phone: plain.customer.phone || "",
      }
    : null;

  return {
    ...plain,
    customer,
    provider,
    service: plain.service || plain.serviceId || null,
    serviceName:
      plain.serviceName ||
      plain.service?.name ||
      plain.service?.title ||
      plain.service?.serviceName ||
      plain.serviceId?.name ||
      plain.serviceId?.title ||
      plain.serviceId?.serviceName ||
      "",
  };
};

const normalizeConversation = (conversation) => {
  if (!conversation) return null;

  const plain =
    typeof conversation.toObject === "function"
      ? conversation.toObject()
      : conversation;

  return {
    ...plain,
    bookingId: plain.bookingId || null,
    booking: plain.booking || plain.bookingId || null,
    participants: Array.isArray(plain.participants) ? plain.participants : [],
    lastMessage: plain.lastMessage || null,
    lastMessageText: plain.lastMessageText || "",
    lastMessageAt: plain.lastMessageAt || null,
    updatedAt: plain.updatedAt || plain.lastMessageAt || null,
  };
};

const normalizeMessage = (message) => {
  if (!message) return null;

  const plain =
    typeof message.toObject === "function" ? message.toObject() : message;

  const sender = plain.senderId || plain.sender || null;

  return {
    ...plain,
    senderName:
      plain.senderName ||
      sender?.name ||
      sender?.fullName ||
      sender?.username ||
      "Unknown",
    senderRole: plain.senderRole || sender?.role || "",
    text: plain.text || "",
    imageUrl: plain.imageUrl || "",
    type: plain.type || "text",
    createdAt: plain.createdAt || plain.timestamp || null,
  };
};

const getConversationMessages = async (conversationId) => {
  const messages = await Message.find({
    conversationId,
  })
    .populate("senderId", "name email role")
    .sort({ createdAt: 1 })
    .lean();

  return messages.map(normalizeMessage).filter(Boolean);
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
      .limit(limit)
      .lean();

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

router.delete("/users/:id", protect("admin"), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (req.user?._id && String(req.user._id) === String(id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const providerProfile = await Provider.findOne({ user: id }).lean();

    const bookingQuery = {
      $or: [{ customer: id }],
    };

    if (providerProfile?._id) {
      bookingQuery.$or.push({ provider: providerProfile._id });
    }

    const bookings = await Booking.find(bookingQuery).select("_id").lean();
    const bookingIds = bookings.map((b) => b._id);

    if (bookingIds.length > 0) {
      const conversationsFromBookings = await Conversation.find({
        $or: [
          { bookingId: { $in: bookingIds } },
          { booking: { $in: bookingIds } },
        ],
      })
        .select("_id")
        .lean();

      const conversationIdsFromBookings = conversationsFromBookings.map(
        (c) => c._id
      );

      if (conversationIdsFromBookings.length > 0) {
        await Message.deleteMany({
          conversationId: { $in: conversationIdsFromBookings },
        });
        await Conversation.deleteMany({
          _id: { $in: conversationIdsFromBookings },
        });
      }

      await Booking.deleteMany({ _id: { $in: bookingIds } });
    }

    const userConversations = await Conversation.find({
      participants: id,
    })
      .select("_id")
      .lean();

    const userConversationIds = userConversations.map((c) => c._id);

    if (userConversationIds.length > 0) {
      await Message.deleteMany({
        conversationId: { $in: userConversationIds },
      });
      await Conversation.deleteMany({
        _id: { $in: userConversationIds },
      });
    }

    if (providerProfile?._id) {
      await Service.deleteMany({ provider: providerProfile._id });
      await Provider.deleteOne({ _id: providerProfile._id });
    }

    await User.deleteOne({ _id: id });

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================
   PROVIDERS
============================ */
router.get("/providers", protect("admin"), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const providers = await Provider.find()
      .select(
        "basicInfo status services documents category rating reviewCount createdAt updatedAt rejectionReason approvalBanner resubmissions availabilityStatus experience bio location availability"
      )
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Provider.countDocuments();

    res.json({
      success: true,
      providers: providers.map(normalizeProvider),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/providers/pending", protect("admin"), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const providers = await Provider.find({ status: "pending" })
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Provider.countDocuments({ status: "pending" });

    res.json({
      success: true,
      providers: providers.map(normalizeProvider),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/providers/rejected", protect("admin"), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const providers = await Provider.find({ status: "rejected" })
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Provider.countDocuments({ status: "rejected" });

    res.json({
      success: true,
      providers: providers.map(normalizeProvider),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get(
  "/providers/:id/documents/:documentId/url",
  protect("admin"),
  async (req, res) => {
    try {
      const { id, documentId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid provider ID",
        });
      }

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
  }
);

router.get("/providers/:id", protect("admin"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    const provider = await Provider.findById(req.params.id)
      .populate("user", "name email role")
      .lean();

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    res.json({ success: true, provider: normalizeProvider(provider) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/providers/:id/approve", protect("admin"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    provider.status = "approved";
    provider.approvalBanner = "Approved";
    provider.rejectionReason = "";

    await provider.save();

    const updatedProvider = await Provider.findById(req.params.id)
      .populate("user", "name email role")
      .lean();

    res.json({
      success: true,
      message: "Provider approved successfully",
      provider: normalizeProvider(updatedProvider),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/providers/:id/reject", protect("admin"), async (req, res) => {
  try {
    const notes = req.body?.notes || req.body?.reason || req.body?.rejectionReason;

    if (!notes || !String(notes).trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    provider.status = "rejected";
    provider.approvalBanner = "Rejected";
    provider.rejectionReason = String(notes).trim();

    await provider.save();

    const updatedProvider = await Provider.findById(req.params.id)
      .populate("user", "name email role")
      .lean();

    res.json({
      success: true,
      message: "Provider rejected successfully",
      provider: normalizeProvider(updatedProvider),
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
      .sort({ createdAt: -1 })
      .lean();

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
      .populate({
        path: "provider",
        select: "basicInfo services rating reviewCount status location availabilityStatus",
        populate: {
          path: "user",
          select: "name email role",
        },
      })
      .populate({
        path: "serviceId",
        model: "Service",
        select: "name title serviceName price description",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Booking.countDocuments();

    res.json({
      success: true,
      bookings: bookings.map(normalizeBooking),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error("GET BOOKINGS ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/bookings/:id", protect("admin"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await Booking.findById(req.params.id)
      .populate("customer", "name email phone")
      .populate({
        path: "provider",
        select: "basicInfo services rating reviewCount status location availabilityStatus",
        populate: {
          path: "user",
          select: "name email role",
        },
      })
      .populate({
        path: "serviceId",
        model: "Service",
        select: "name title serviceName price description",
      })
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.json({
      success: true,
      booking: normalizeBooking(booking),
    });
  } catch (err) {
    console.error("GET BOOKING ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/bookings/:id/conversation", protect("admin"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    const booking = await Booking.findById(req.params.id)
      .populate("customer", "name email phone")
      .populate({
        path: "provider",
        select: "basicInfo services rating reviewCount status location availabilityStatus",
        populate: {
          path: "user",
          select: "name email role",
        },
      })
      .populate({
        path: "serviceId",
        model: "Service",
        select: "name title serviceName price description",
      })
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const conversation = await Conversation.findOne({
      $or: [{ bookingId: booking._id }, { booking: booking._id }],
    })
      .populate("participants", "name email role")
      .populate({
        path: "bookingId",
        populate: [
          { path: "customer", select: "name email phone" },
          {
            path: "provider",
            populate: {
              path: "user",
              select: "name email role",
            },
          },
          {
            path: "serviceId",
            model: "Service",
            select: "name title serviceName price description",
          },
        ],
      })
      .populate("lastMessage")
      .lean();

    if (!conversation) {
      return res.json({
        success: true,
        conversation: null,
        messages: [],
      });
    }

    const messages = await getConversationMessages(conversation._id);

    res.json({
      success: true,
      conversation: normalizeConversation(conversation),
      messages,
    });
  } catch (err) {
    console.error("GET BOOKING CONVERSATION ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/bookings/:id/status", protect("admin"), async (req, res) => {
  try {
    const { status } = req.body;

    if (!validBookingStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
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

    const updatedBooking = await Booking.findById(req.params.id)
      .populate("customer", "name email phone")
      .populate({
        path: "provider",
        select: "basicInfo services rating reviewCount status location availabilityStatus",
        populate: {
          path: "user",
          select: "name email role",
        },
      })
      .populate({
        path: "serviceId",
        model: "Service",
        select: "name title serviceName price description",
      })
      .lean();

    res.json({
      success: true,
      message: "Booking updated",
      booking: normalizeBooking(updatedBooking || booking),
    });
  } catch (err) {
    console.error("UPDATE BOOKING STATUS ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/bookings/:id", protect("admin"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

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
   CONVERSATIONS
============================ */
router.get("/conversations", protect("admin"), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const conversations = await Conversation.find()
      .populate("participants", "name email role")
      .populate({
        path: "bookingId",
        populate: [
          { path: "customer", select: "name email phone" },
          {
            path: "provider",
            populate: {
              path: "user",
              select: "name email role",
            },
          },
          {
            path: "serviceId",
            model: "Service",
            select: "name title serviceName price description",
          },
        ],
      })
      .populate("lastMessage")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Conversation.countDocuments();

    res.json({
      success: true,
      conversations: conversations.map(normalizeConversation),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error("GET CONVERSATIONS ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/conversations/:id", protect("admin"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
    }

    const conversation = await Conversation.findById(req.params.id)
      .populate("participants", "name email role")
      .populate({
        path: "bookingId",
        populate: [
          { path: "customer", select: "name email phone" },
          {
            path: "provider",
            populate: {
              path: "user",
              select: "name email role",
            },
          },
          {
            path: "serviceId",
            model: "Service",
            select: "name title serviceName price description",
          },
        ],
      })
      .populate("lastMessage")
      .lean();

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const messages = await getConversationMessages(conversation._id);

    res.json({
      success: true,
      conversation: normalizeConversation(conversation),
      messages,
    });
  } catch (err) {
    console.error("GET CONVERSATION ERROR:", err);
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