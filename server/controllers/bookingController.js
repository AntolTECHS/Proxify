// controllers/bookingController.js
import asyncHandler from "express-async-handler";
import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";
import { geocodeAddress } from "../utils/geocode.js";

const safeParseJSON = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const parseNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const buildLocationCoords = (lat, lng) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    type: "Point",
    coordinates: [lng, lat],
  };
};

const normalizeLocationCoords = async ({ lat, lng, locationText, locationGeoJSON }) => {
  let finalLat = parseNumberOrNull(lat);
  let finalLng = parseNumberOrNull(lng);

  const geoInput = safeParseJSON(locationGeoJSON, null);
  const geoCoords = Array.isArray(geoInput?.coordinates) ? geoInput.coordinates : null;

  if ((!Number.isFinite(finalLat) || !Number.isFinite(finalLng)) && geoCoords?.length === 2) {
    const maybeLng = Number(geoCoords[0]);
    const maybeLat = Number(geoCoords[1]);
    if (Number.isFinite(maybeLat) && Number.isFinite(maybeLng)) {
      finalLat = maybeLat;
      finalLng = maybeLng;
    }
  }

  if ((!Number.isFinite(finalLat) || !Number.isFinite(finalLng)) && locationText) {
    const geo = await geocodeAddress(locationText);
    if (geo) {
      finalLat = Number(geo.lat);
      finalLng = Number(geo.lng);
    }
  }

  const locationCoords = buildLocationCoords(finalLat, finalLng);

  return {
    lat: Number.isFinite(finalLat) ? finalLat : null,
    lng: Number.isFinite(finalLng) ? finalLng : null,
    locationCoords,
  };
};

/* ================================
   ADD BOOKING (CUSTOMER)
================================ */
export const addBooking = asyncHandler(async (req, res) => {
  const {
    serviceId,
    providerId,
    scheduledAt,
    notes,
    paymentMethod,
    lat,
    lng,
    location,
    locationText,
    locationGeoJSON,
  } = req.body;

  const finalLocationText = String(locationText ?? location ?? "").trim();

  if (!serviceId || !providerId || !scheduledAt || !finalLocationText) {
    return res.status(400).json({
      success: false,
      message:
        "Missing required fields: serviceId, providerId, scheduledAt, location",
    });
  }

  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) {
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

  const { lat: finalLat, lng: finalLng, locationCoords } =
    await normalizeLocationCoords({
      lat,
      lng,
      locationText: finalLocationText,
      locationGeoJSON,
    });

  const bookingData = {
    customer: req.user._id,
    provider: providerId,
    serviceId: service._id,
    serviceName: service.name,
    scheduledAt: scheduledDate,
    location: finalLocationText,
    locationText: finalLocationText,
    notes: String(notes || "").trim(),
    price: Number(service.price) || 0,
    paymentMethod: paymentMethod || "cash",
    status: "pending",
    paymentStatus: "unpaid",
    lat: finalLat,
    lng: finalLng,
  };

  if (locationCoords) {
    bookingData.locationCoords = locationCoords;
  }

  const booking = await Booking.create(bookingData);

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
      select: "basicInfo rating reviewCount lat lng locationCoords status",
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
