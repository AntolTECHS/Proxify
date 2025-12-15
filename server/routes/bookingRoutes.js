const express = require("express");
const { createBooking, getBookings, updateBooking } = require("../controllers/bookingController");
const auth = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/", auth, createBooking);
router.get("/", auth, getBookings);
router.put("/:id", auth, updateBooking);

module.exports = router;
