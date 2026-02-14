const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const Service = require("../models/Service");
const Booking = require("../models/Booking");

// ---------- Add a new service ----------
router.post("/services", protect("provider"), async (req, res) => {
  try {
    const { name, description, cost } = req.body;

    const service = await Service.create({
      name,
      description,
      cost,
      provider: req.user._id,
    });

    res.status(201).json({ message: "Service added", service });
  } catch (err) {
    res.status(500).json({ message: "Failed to add service", error: err.message });
  }
});

// ---------- Update a service ----------
router.put("/services/:id", protect("provider"), async (req, res) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, provider: req.user._id });
    if (!service) return res.status(404).json({ message: "Service not found" });

    const { name, description, cost } = req.body;
    if (name) service.name = name;
    if (description) service.description = description;
    if (cost) service.cost = cost;

    await service.save();
    res.status(200).json({ message: "Service updated", service });
  } catch (err) {
    res.status(500).json({ message: "Failed to update service", error: err.message });
  }
});

// ---------- Delete a service ----------
router.delete("/services/:id", protect("provider"), async (req, res) => {
  try {
    const service = await Service.findOneAndDelete({ _id: req.params.id, provider: req.user._id });
    if (!service) return res.status(404).json({ message: "Service not found" });

    res.status(200).json({ message: "Service deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete service", error: err.message });
  }
});

// ---------- Get provider's own services ----------
router.get("/services", protect("provider"), async (req, res) => {
  try {
    const services = await Service.find({ provider: req.user._id });
    res.status(200).json(services);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch services", error: err.message });
  }
});

// ---------- Get provider's bookings ----------
router.get("/bookings", protect("provider"), async (req, res) => {
  try {
    const bookings = await Booking.find({ provider: req.user._id })
      .populate("customer", "name email")
      .populate("service", "name description cost")
      .sort({ scheduledAt: -1 });

    res.status(200).json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch bookings", error: err.message });
  }
});

module.exports = router;
