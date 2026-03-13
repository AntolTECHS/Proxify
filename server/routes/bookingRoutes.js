
// server/routes/bookingRoutes.js
import express from "express";
import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";
import { protect } from "../middleware/authMiddleware.js";
import mongoose from "mongoose";

const router = express.Router();

/* -------------------- CREATE BOOKING -------------------- */
router.post("/", protect(), async (req, res) => {
  try {
    const { providerId, serviceId, scheduledAt, location, notes } = req.body;

    if (!providerId || !mongoose.Types.ObjectId.isValid(providerId))
      return res.status(400).json({ success: false, message: "Invalid providerId" });

    if (!serviceId)
      return res.status(400).json({ success: false, message: "serviceId required" });

    if (!scheduledAt || !location)
      return res.status(400).json({ success: false, message: "scheduledAt and location are required" });

    const provider = await Provider.findById(providerId);
    if (!provider)
      return res.status(404).json({ success: false, message: "Provider not found" });

    const service = provider.services.find((s) => s._id.toString() === serviceId);
    if (!service)
      return res.status(404).json({ success: false, message: "Service not found on provider" });

    const conflict = await Booking.findOne({
      provider: providerId,
      scheduledAt: new Date(scheduledAt),
      status: { $in: ["pending", "accepted", "in_progress"] },
    });

    if (conflict)
      return res.status(400).json({
        success: false,
        message: "Provider already has a booking at this time",
      });

    const booking = await Booking.create({
      customer: req.user._id,
      provider: providerId,
      serviceId: service._id,
      serviceName: service.name,
      scheduledAt: new Date(scheduledAt),
      location,
      notes: notes || "",
      price: service.price || 0,
      status: "pending",
      paymentStatus: "unpaid",
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate({
        path: "provider",
        select: "basicInfo services rating reviewCount status lat lng",
      })
      .populate("customer", "-password")
      .lean();

    res.status(201).json({ success: true, booking: populatedBooking });
  } catch (err) {
    console.error("CREATE BOOKING ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -------------------- GET BOOKINGS FOR LOGGED-IN CUSTOMER -------------------- */
router.get("/", protect(), async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.user._id })
      .populate({
        path: "provider",
        select: "basicInfo services rating reviewCount status lat lng",
      })
      .lean();

    res.json({ success: true, bookings });
  } catch (err) {
    console.error("GET BOOKINGS ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -------------------- GET BOOKINGS FOR LOGGED-IN PROVIDER -------------------- */
router.get("/provider", protect(), async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id });

    if (!provider)
      return res.status(404).json({
        success: false,
        message: "Provider profile not found",
      });

    const bookings = await Booking.find({ provider: provider._id })
      .populate("customer", "-password")
      .populate("provider", "basicInfo")
      .lean();

    res.json({
      success: true,
      bookings,
    });
  } catch (err) {
    console.error("GET PROVIDER BOOKINGS ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -------------------- GET BOOKINGS BY PROVIDER ID -------------------- */
router.get("/provider/:providerId", protect(), async (req, res) => {
  try {
    const { providerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(providerId))
      return res.status(400).json({ success: false, message: "Invalid providerId" });

    const bookings = await Booking.find({ provider: providerId })
      .populate("customer", "-password")
      .lean();

    res.json({ success: true, bookings });
  } catch (err) {
    console.error("GET PROVIDER BOOKINGS ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -------------------- UPDATE BOOKING STATUS -------------------- */
router.patch("/:id/status", protect(), async (req, res) => {
  try {
    const { status } = req.body;

    if (!status)
      return res.status(400).json({ success: false, message: "Status is required" });

    const booking = await Booking.findById(req.params.id);

    if (!booking)
      return res.status(404).json({ success: false, message: "Booking not found" });

    booking.status = status;

    await booking.save();

    res.json({ success: true, booking });
  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -------------------- RESCHEDULE BOOKING -------------------- */
router.patch("/:id/reschedule", protect(), async (req, res) => {
  try {
    const { scheduledAt } = req.body;

    if (!scheduledAt)
      return res.status(400).json({
        success: false,
        message: "scheduledAt is required",
      });

    const booking = await Booking.findById(req.params.id);

    if (!booking)
      return res.status(404).json({ success: false, message: "Booking not found" });

    const newDate = new Date(scheduledAt);

    const conflict = await Booking.findOne({
      provider: booking.provider,
      scheduledAt: newDate,
      status: { $in: ["pending", "accepted", "in_progress"] },
      _id: { $ne: booking._id },
    });

    if (conflict)
      return res.status(400).json({
        success: false,
        message: "Provider already has a booking at this time",
      });

    booking.scheduledAt = newDate;

    await booking.save();

    res.json({ success: true, booking });
  } catch (err) {
    console.error("RESCHEDULE BOOKING ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
