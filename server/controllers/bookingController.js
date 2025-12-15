const Booking = require("../models/Booking");

// Create booking
exports.createBooking = async (req, res) => {
  try {
    const { provider, service, scheduledAt, notes, location } = req.body;

    const booking = await Booking.create({
      customer: req.user.id,
      provider,
      service,
      scheduledAt,
      notes,
      location,
    });

    res.status(201).json({ message: "Booking created", booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get bookings of user
exports.getBookings = async (req, res) => {
  try {
    let bookings;
    if (req.user.role === "customer") {
      bookings = await Booking.find({ customer: req.user.id }).populate("service provider");
    } else if (req.user.role === "provider") {
      bookings = await Booking.find({ provider: req.user.id }).populate("service customer");
    } else {
      bookings = await Booking.find().populate("service provider customer");
    }

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update booking status
exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const { status } = req.body;
    booking.status = status || booking.status;
    await booking.save();

    res.json({ message: "Booking updated", booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
