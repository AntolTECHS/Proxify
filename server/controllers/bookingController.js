import asyncHandler from "express-async-handler";
import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";

/* ---------------- Add Booking (Customer) ---------------- */
export const addBooking = asyncHandler(async (req, res) => {
  const { serviceId, providerId, scheduledAt, notes, lat, lng } = req.body;

  // Validate required fields
  if (!serviceId || !providerId || !scheduledAt) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: serviceId, providerId, or scheduledAt",
    });
  }

  // Fetch provider
  const provider = await Provider.findById(providerId);
  if (!provider) {
    return res.status(404).json({ success: false, message: "Provider not found" });
  }

  // Find service inside provider
  const service = provider.services.find((s) => s._id.toString() === serviceId);
  if (!service) {
    return res.status(400).json({ success: false, message: "Service not found for this provider" });
  }

  // Prevent double booking at the same time for provider
  const conflict = await Booking.findOne({
    provider: providerId,
    scheduledAt: new Date(scheduledAt),
    status: { $in: ["pending", "accepted", "in_progress"] },
  });

  if (conflict) {
    return res.status(400).json({
      success: false,
      message: "Provider already has a booking at this time",
    });
  }

  // Create booking
  const booking = await Booking.create({
    customer: req.user._id,
    provider: providerId,
    serviceId: service._id,
    serviceName: service.name,
    scheduledAt: new Date(scheduledAt),
    location: req.body.location || "",
    notes: notes || "",
    price: service.price || 0,
    lat: lat || provider.lat || null,
    lng: lng || provider.lng || null,
    status: "pending",
    paymentStatus: "unpaid",
  });

  res.status(201).json({ success: true, booking });
});

/* ---------------- Get bookings by customer ---------------- */
export const getUserBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ customer: req.params.userId })
    .populate({
      path: "provider",
      select: "basicInfo rating reviewCount lat lng status",
    })
    .lean();

  res.status(200).json({ success: true, bookings });
});

/* ---------------- Get bookings by provider ---------------- */
export const getProviderBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ provider: req.params.providerId })
    .populate({
      path: "customer",
      select: "name email phone",
    })
    .lean();

  res.status(200).json({ success: true, bookings });
});

/* ---------------- Get all bookings (optional) ---------------- */
export const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find()
    .populate({
      path: "customer",
      select: "name email phone",
    })
    .populate({
      path: "provider",
      select: "basicInfo rating reviewCount",
    })
    .lean();

  res.status(200).json({ success: true, bookings });
});