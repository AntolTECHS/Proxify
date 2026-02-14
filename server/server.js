// server.js - ServLink / Proxify Backend

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

/* ===========================
   Middleware
=========================== */

// Enable CORS
app.use(cors({
  origin: process.env.CLIENT_URL || "*", // allow frontend origin
}));

// Body parser
app.use(express.json());

// Logging requests (only in development)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Serve uploaded files (images, docs, etc.)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ===========================
   API Routes
=========================== */
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/providers", require("./routes/providerRoutes"));
app.use("/api/services", require("./routes/serviceRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/discussions", require("./routes/discussionRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

/* ===========================
   Health Check
=========================== */
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "ServLink API is running..." });
});

/* ===========================
   404 Not Found
=========================== */
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Endpoint not found" });
});

/* ===========================
   Global Error Handler
=========================== */
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

/* ===========================
   Start Server
=========================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});
