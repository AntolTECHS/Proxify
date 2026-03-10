import asyncHandler from "express-async-handler";
import Provider from "../models/Provider.js";
import User from "../models/User.js";

/**
 * @desc    Upgrade a user to provider
 * @route   POST /api/providers/onboard
 * @access  Private (user)
 */
export const upgradeToProvider = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Prevent duplicate provider
  const existingProvider = await Provider.findOne({ user: userId });
  if (existingProvider) {
    return res.status(400).json({
      success: false,
      message: "User is already a provider",
    });
  }

  // ---------- Parse JSON fields safely ----------
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
    return res
      .status(400)
      .json({ success: false, message: "Invalid JSON format in request" });
  }

  // ---------- Validate required basic info ----------
  if (!basicInfo.providerName || !basicInfo.email) {
    return res.status(400).json({
      success: false,
      message: "Provider name and email are required",
    });
  }

  // ---------- Validate services ----------
  if (!Array.isArray(services) || services.length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one service with name and price is required",
    });
  }

  services = services.map((s) => ({
    name: s.name,
    price: Number(s.price) || 0,
  }));

  // ---------- Handle uploaded documents ----------
  const documents = (req.files || []).map((file) => ({
    name: file.originalname,
    path: `/uploads/${file.filename}`,
    size: file.size,
    type: file.mimetype,
  }));

  // ---------- Create Provider ----------
  const provider = await Provider.create({
    user: userId,
    basicInfo,
    services,
    documents,
    status: "approved", // Or "under_review" depending on workflow
    availabilityStatus: "Offline",
    rating: 0,
    reviewCount: 0,
  });

  // ---------- Upgrade user role ----------
  await User.findByIdAndUpdate(userId, {
    role: "provider",
    provider: provider._id,
  });

  res.status(201).json({
    success: true,
    message: "Provider onboarding completed",
    provider,
  });
});

/**
 * @desc    Get logged-in provider profile
 * @route   GET /api/providers/me
 * @access  Private (provider)
 */
export const getProviderProfile = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ user: req.user._id }).populate(
    "user",
    "-password"
  );

  if (!provider) {
    return res.status(404).json({
      success: false,
      message: "Provider not found",
    });
  }

  res.status(200).json({
    success: true,
    provider,
  });
});

/**
 * @desc    Get all providers with approved badge
 * @route   GET /api/providers
 * @access  Public
 */
export const getAllProviders = asyncHandler(async (req, res) => {
  const providers = await Provider.find()
    .populate("user", "-password")
    .lean(); // lean for plain JS object to add computed fields

  const providersWithBadge = providers.map((p) => ({
    ...p,
    approvedBadge: p.status === "approved" ? "Approved" : "Not Approved",
  }));

  res.status(200).json(providersWithBadge);
});