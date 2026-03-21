import asyncHandler from "express-async-handler";
import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";

/* ================================
   ADD BOOKING (CUSTOMER)
================================ */
export const addBooking = asyncHandler(async (req, res) => {
  const { serviceId, providerId, scheduledAt, notes, lat, lng } = req.body;

  if (!serviceId || !providerId || !scheduledAt) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: serviceId, providerId, scheduledAt",
    });
  }

  // Validate date
  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: "Invalid scheduledAt date",
    });
  }

  // Fetch provider
  const provider = await Provider.findById(providerId);
  if (!provider) {
    return res.status(404).json({
      success: false,
      message: "Provider not found",
    });
  }

  // Find service inside provider
  const service = provider.services.find(
    (s) => s._id.toString() === serviceId
  );

  if (!service) {
    return res.status(400).json({
      success: false,
      message: "Service not found for this provider",
    });
  }

  // Prevent double booking
  const conflict = await Booking.findOne({
    provider: providerId,
    scheduledAt: scheduledDate,
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
    scheduledAt: scheduledDate,
    location: req.body.location || "",
    notes: notes || "",
    price: service.price || 0,
    lat: lat ?? provider.lat ?? null,
    lng: lng ?? provider.lng ?? null,
    status: "pending",
    paymentStatus: "unpaid",
  });

  return res.status(201).json({
    success: true,
    booking,
  });
});

/* ================================
   GET BOOKINGS BY CUSTOMER
================================ */
export const getUserBookings = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const bookings = await Booking.find({ customer: userId })
    .populate({
      path: "provider",
      select: "basicInfo rating reviewCount lat lng status",
    })
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({
    success: true,
    bookings,
  });
});

/* ================================
   GET BOOKINGS BY PROVIDER
================================ */
export const getProviderBookings = asyncHandler(async (req, res) => {
  const { providerId } = req.params;

  const bookings = await Booking.find({ provider: providerId })
    .populate({
      path: "customer",
      select: "name email phone",
    })
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({
    success: true,
    bookings,
  });
});

/* ================================
   GET ALL BOOKINGS (ADMIN)
================================ */
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
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({
    success: true,
    bookings,
  });
});