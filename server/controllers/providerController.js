import asyncHandler from "express-async-handler";
import Provider from "../models/Provider.js";
import User from "../models/User.js";
import { uploadBuffer } from "../utils/uploadToCloudinary.js";

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

  try {
    basicInfo =
      typeof req.body.basicInfo === "string"
        ? JSON.parse(req.body.basicInfo)
        : req.body.basicInfo || {};

    services =
      typeof req.body.services === "string"
        ? JSON.parse(req.body.services)
        : req.body.services || [];
  } catch (err) {
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

  services = services.map((s) => ({
    name: s.name,
    price: Number(s.price) || 0,
    description: s.description || "",
  }));

  let documents = [];

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

  const provider = await Provider.create({
    user: userId,
    basicInfo,
    services,
    documents,
    status: "approved",
    availabilityStatus: "Offline",
    rating: 0,
    reviewCount: 0,
  });

  await User.findByIdAndUpdate(userId, {
    role: "provider",
    provider: provider._id,
  });

  res.status(201).json(provider);
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

  res.json(provider);
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

  try {
    basicInfo =
      typeof req.body.basicInfo === "string"
        ? JSON.parse(req.body.basicInfo)
        : req.body.basicInfo || {};

    services =
      typeof req.body.services === "string"
        ? JSON.parse(req.body.services)
        : req.body.services || [];
  } catch (err) {
    return res.status(400).json({ message: "Invalid JSON format" });
  }

  provider.basicInfo = {
    ...provider.basicInfo,
    ...basicInfo,
  };

  provider.services = services;
  provider.lat = req.body.lat || provider.lat;
  provider.lng = req.body.lng || provider.lng;

  /* Upload profile photo */
  if (req.files?.photo?.length > 0) {
    const result = await uploadBuffer(
      req.files.photo[0].buffer,
      "proxify/profile"
    );

    provider.basicInfo.photoURL = result.secure_url;
  }

  /* Upload documents */
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

  await provider.save();

  res.json(provider);
});



/**
 * @desc    Get all providers
 * @route   GET /api/providers
 * @access  Public
 */
export const getAllProviders = asyncHandler(async (req, res) => {
  const providers = await Provider.find()
    .populate("user", "-password")
    .lean();

  const result = providers.map((p) => ({
    ...p,
    approvedBadge: p.status === "approved" ? "Approved" : "Not Approved",
  }));

  res.json(result);
});