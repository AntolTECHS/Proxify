import asyncHandler from "express-async-handler";
import Service from "../models/Service.js";

/**
 * @desc Add a service
 */
export const addService = asyncHandler(async (req, res) => {
  const service = await Service.create({
    ...req.body,
    provider: req.user._id,
  });

  res.status(201).json({ success: true, service });
});

/**
 * @desc Get services for a provider
 */
export const getProviderServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ provider: req.params.providerId });
  res.json({ success: true, services });
});

/**
 * @desc Get all services
 */
export const getAllServices = asyncHandler(async (req, res) => {
  const services = await Service.find().populate("provider", "name");
  res.json({ success: true, services });
});