import asyncHandler from "express-async-handler";
import Provider from "../models/Provider.js";
import User from "../models/User.js";
import { uploadBuffer } from "../utils/uploadToCloudinary.js";
import { geocodeAddress } from "../utils/geocode.js";

const parseMaybeJSON = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;

  if (typeof value === "string") {
    return JSON.parse(value);
  }

  return value;
};

const formatProviderStatus = (status) => {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending admin approval";
};

const normalizeProviderResponse = (provider) => {
  if (!provider) return provider;

  const plain =
    typeof provider.toObject === "function" ? provider.toObject() : provider;

  return {
    ...plain,
    services: Array.isArray(plain.services) ? plain.services : [],
    documents: Array.isArray(plain.documents) ? plain.documents : [],
    isApproved: plain.status === "approved",
    isPending: plain.status === "pending",
    isRejected: plain.status === "rejected",
    approvalBanner: formatProviderStatus(plain.status),
  };
};

const buildServices = (services = []) => {
  return services.map((s, index) => {
    const name = String(s?.name || "").trim();
    const price = Number(s?.price);

    if (!name) {
      throw new Error(`Service ${index + 1} name is required`);
    }

    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`Service ${index + 1} price must be a valid number`);
    }

    return {
      name,
      price,
      description: String(s?.description || "").trim(),
    };
  });
};

/**
 * @desc    Upgrade a user to provider
 * @route   POST /api/providers/onboard
 * @access  Private
 */
export const upgradeToProvider = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const existingProvider = await Provider.findOne({ user: userId });
  if (existingProvider) {
    return res.status(400).json({ message: "User is already a provider" });
  }

  let basicInfo = {};
  let services = [];
  let availability = {};

  try {
    basicInfo = parseMaybeJSON(req.body.basicInfo, {});
    services = parseMaybeJSON(req.body.services, []);
    availability = parseMaybeJSON(req.body.availability, {});
  } catch {
    return res.status(400).json({ message: "Invalid JSON format" });
  }

  if (!basicInfo.providerName || !basicInfo.email) {
    return res
      .status(400)
      .json({ message: "Provider name and email are required" });
  }

  if (!Array.isArray(services) || services.length === 0) {
    return res
      .status(400)
      .json({ message: "At least one service is required" });
  }

  const normalizedServices = buildServices(services);

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

  const manualLat =
    req.body.lat !== undefined && req.body.lat !== ""
      ? Number(req.body.lat)
      : null;

  const manualLng =
    req.body.lng !== undefined && req.body.lng !== ""
      ? Number(req.body.lng)
      : null;

  let coordinates = null;

  if (Number.isFinite(manualLat) && Number.isFinite(manualLng)) {
    coordinates = [manualLng, manualLat];
  } else if (basicInfo.location) {
    const geo = await geocodeAddress(basicInfo.location);
    if (geo) coordinates = [geo.lng, geo.lat];
  }

  const provider = await Provider.create({
    user: userId,
    basicInfo: {
      providerName: basicInfo.providerName,
      email: basicInfo.email,
      phone: basicInfo.phone || "",
      businessName: basicInfo.businessName || "",
      location: basicInfo.location || "",
      photoURL: "",
    },
    bio: basicInfo.bio || "",
    category: basicInfo.category || "",
    experience: Number(basicInfo.experience) || 0,
    services: normalizedServices,
    documents,
    availability: availability || {},
    status: "pending",
    availabilityStatus: "Offline",
    rating: 0,
    reviewCount: 0,
    location: {
      type: "Point",
      coordinates: coordinates || [0, 0],
    },
  });

  await User.findByIdAndUpdate(userId, {
    role: "provider",
    provider: provider._id,
  });

  res.status(201).json(normalizeProviderResponse(provider));
});

/**
 * @desc    Get logged-in provider profile
 * @route   GET /api/providers/me
 * @access  Private
 */
export const getProviderProfile = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ user: req.user._id }).populate(
    "user",
    "-password"
  );

  if (!provider) {
    return res.status(404).json({ message: "Provider not found" });
  }

  res.json(normalizeProviderResponse(provider));
});

/**
 * @desc    Update provider profile
 * @route   PUT /api/providers/update
 * @access  Private
 */
export const updateProvider = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ user: req.user._id });

  if (!provider) {
    return res.status(404).json({ message: "Provider not found" });
  }

  let basicInfo = {};
  let services = [];
  let availability = {};

  try {
    basicInfo = parseMaybeJSON(req.body.basicInfo, {});
    services = parseMaybeJSON(req.body.services, []);
    availability = parseMaybeJSON(req.body.availability, {});
  } catch {
    return res.status(400).json({ message: "Invalid JSON format" });
  }

  // Block any attempt to change approval fields from this route
  delete req.body.status;
  delete req.body.rejectionReason;

  provider.basicInfo = {
    ...provider.basicInfo,
    ...basicInfo,
  };

  if (typeof req.body.bio === "string") {
    provider.bio = req.body.bio;
  } else if (typeof basicInfo.bio === "string") {
    provider.bio = basicInfo.bio;
  }

  if (req.body.category !== undefined) {
    provider.category = String(req.body.category).trim();
  } else if (typeof basicInfo.category === "string") {
    provider.category = String(basicInfo.category).trim();
  }

  if (req.body.experience !== undefined) {
    const exp = Number(req.body.experience);
    if (Number.isFinite(exp) && exp >= 0) {
      provider.experience = exp;
    }
  } else if (basicInfo.experience !== undefined) {
    const exp = Number(basicInfo.experience);
    if (Number.isFinite(exp) && exp >= 0) {
      provider.experience = exp;
    }
  }

  if (Array.isArray(services) && services.length > 0) {
    provider.services = buildServices(services);
  }

  if (
    availability &&
    typeof availability === "object" &&
    !Array.isArray(availability)
  ) {
    const currentAvailability =
      typeof provider.availability?.toObject === "function"
        ? provider.availability.toObject()
        : provider.availability || {};

    provider.availability = {
      ...currentAvailability,
      ...availability,
    };
  }

  const manualLat =
    req.body.lat !== undefined && req.body.lat !== ""
      ? Number(req.body.lat)
      : null;

  const manualLng =
    req.body.lng !== undefined && req.body.lng !== ""
      ? Number(req.body.lng)
      : null;

  if (Number.isFinite(manualLat) && Number.isFinite(manualLng)) {
    provider.location = provider.location || {
      type: "Point",
      coordinates: [0, 0],
    };
    provider.location.type = "Point";
    provider.location.coordinates = [manualLng, manualLat];
  } else if (provider.basicInfo.location) {
    const geo = await geocodeAddress(provider.basicInfo.location);
    if (geo) {
      provider.location = provider.location || {
        type: "Point",
        coordinates: [0, 0],
      };
      provider.location.type = "Point";
      provider.location.coordinates = [geo.lng, geo.lat];
    }
  }

  if (req.files?.photo?.length > 0) {
    const result = await uploadBuffer(
      req.files.photo[0].buffer,
      "proxify/profile"
    );
    provider.basicInfo.photoURL = result.secure_url;
  }

  if (req.files?.files?.length > 0) {
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

  await provider.save();
  res.json(normalizeProviderResponse(provider));
});

/**
 * @desc    Get all providers
 * @route   GET /api/providers
 * @access  Public
 */
export const getAllProviders = asyncHandler(async (req, res) => {
  const providers = await Provider.find()
    .populate("user", "-password")
    .sort({ createdAt: -1 })
    .lean();

  const result = providers.map((p) => ({
    ...p,
    services: Array.isArray(p.services) ? p.services : [],
    documents: Array.isArray(p.documents) ? p.documents : [],
    isApproved: p.status === "approved",
    isPending: p.status === "pending",
    isRejected: p.status === "rejected",
    approvalBanner: formatProviderStatus(p.status),
  }));

  res.json(result);
});