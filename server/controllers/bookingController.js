import asyncHandler from "express-async-handler";
import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";

/* ================================
   ADD BOOKING (CUSTOMER)
================================ */
export const addBooking = asyncHandler(async (req, res) => {
  const { serviceId, providerId, scheduledAt, notes, lat, lng, location } = req.body;

  if (!serviceId || !providerId || !scheduledAt || !location) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: serviceId, providerId, scheduledAt, location",
    });
  }

  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: "Invalid scheduledAt date",
    });
  }

  const provider = await Provider.findById(providerId);
  if (!provider) {
    return res.status(404).json({
      success: false,
      message: "Provider not found",
    });
  }

  const service = provider.services.find((s) => s._id.toString() === serviceId);

  if (!service) {
    return res.status(400).json({
      success: false,
      message: "Service not found for this provider",
    });
  }

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

  const booking = await Booking.create({
    customer: req.user._id,
    provider: providerId,
    serviceId: service._id,
    serviceName: service.name,
    scheduledAt: scheduledDate,
    location,
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
   UPDATE BOOKING STATUS
   - if completed => paymentStatus = paid
================================ */
export const updateBookingStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, paymentStatus } = req.body;

  const booking = await Booking.findById(id);

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found",
    });
  }

  if (status) {
    booking.status = status;
  }

  if (status === "completed") {
    booking.paymentStatus = "paid";
  } else if (paymentStatus) {
    booking.paymentStatus = paymentStatus;
  }

  await booking.save();

  return res.status(200).json({
    success: true,
    message: "Booking updated successfully",
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