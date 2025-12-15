const express = require("express");
const { getAllUsers, getAllBookings } = require("../controllers/adminController");
const auth = require("../middleware/authMiddleware");
const router = express.Router();

// Only admin should access - can add role check in controller
router.get("/users", auth, getAllUsers);
router.get("/bookings", auth, getAllBookings);

module.exports = router;
