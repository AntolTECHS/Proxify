// server/routes/bookingRoutes.js
import express from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* -------------------- ADMIN ONLY -------------------- */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ success: false, message: "Access denied. Admins only." });
  }
  next();
};

/* -------------------- VALID STATUSES -------------------- */
const VALID_STATUSES = [
  "pending",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
];

/* -------------------- CREATE BOOKING -------------------- */
router.post("/", protect(), async (req, res) => {
  try {
    const { providerId, serviceId, scheduledAt, location, notes, lat, lng } =
      req.body;

    if (!providerId || !mongoose.Types.ObjectId.isValid(providerId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid providerId" });
    }

    if (!serviceId || !mongoose.Types.ObjectId.isValid(serviceId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid serviceId" });
    }

    if (!scheduledAt || !location) {
      return res.status(400).json({
        success: false,
        message: "scheduledAt and location are required",
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
      return res
        .status(404)
        .json({ success: false, message: "Provider not found" });
    }

    const service = provider.services.find(
      (s) => s._id.toString() === serviceId
    );

    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found on provider" });
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

    const populatedBooking = await Booking.findById(booking._id)
      .populate(
        "provider",
        "basicInfo services rating reviewCount status lat lng"
      )
      .populate("customer", "-password")
      .lean();

    return res.status(201).json({ success: true, booking: populatedBooking });
  } catch (err) {
    console.error("CREATE BOOKING ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* -------------------- GET BOOKINGS FOR CUSTOMER -------------------- */
router.get("/", protect(), async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.user._id })
      .populate(
        "provider",
        "basicInfo services rating reviewCount status lat lng"
      )
      .populate("customer", "-password")
      .lean();

    return res.json({ success: true, bookings });
  } catch (err) {
    console.error("GET BOOKINGS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* -------------------- GET BOOKINGS FOR PROVIDER -------------------- */
router.get("/provider", protect(), async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found",
      });
    }

    const bookings = await Booking.find({ provider: provider._id })
      .populate("customer", "-password")
      .populate("provider", "basicInfo")
      .lean();

    return res.json({ success: true, bookings });
  } catch (err) {
    console.error("GET PROVIDER BOOKINGS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* -------------------- UPDATE BOOKING STATUS -------------------- */
router.patch("/:id/status", protect(), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid booking id" });
    }

    if (!status) {
      return res
        .status(400)
        .json({ success: false, message: "Status is required" });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    booking.status = status;

    // ✅ AUTO SET PAYMENT STATUS
    if (status === "completed") {
      booking.paymentStatus = "paid";
    }

    await booking.save();

    const updatedBooking = await Booking.findById(id)
      .populate("customer", "-password")
      .populate(
        "provider",
        "basicInfo services rating reviewCount status lat lng"
      )
      .lean();

    return res.json({
      success: true,
      booking: updatedBooking,
    });
  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* -------------------- ADMIN GET ALL BOOKINGS -------------------- */
router.get("/admin/all", protect("admin"), adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("customer", "-password")
      .populate("provider", "basicInfo")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, bookings });
  } catch (err) {
    console.error("ADMIN GET BOOKINGS ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* -------------------- ADMIN DELETE BOOKING -------------------- */
router.delete("/admin/:id", protect("admin"), adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid booking id" });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    await booking.deleteOne();

    return res.json({ success: true, message: "Booking deleted" });
  } catch (err) {
    console.error("ADMIN DELETE BOOKING ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;