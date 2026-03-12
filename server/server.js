
import dotenv from "dotenv";

/* ======================
   Load Environment Variables FIRST
====================== */
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";

/* ======================
   Connect Database
====================== */
await connectDB();

const app = express();

/* ======================
   __dirname Fix (ESM)
====================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ======================
   Middleware
====================== */
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

/* ======================
   Static Files
====================== */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ======================
   Import Routes AFTER dotenv
====================== */
const authRoutes = (await import("./routes/authRoutes.js")).default;
const providerRoutes = (await import("./routes/providerRoutes.js")).default;
const serviceRoutes = (await import("./routes/serviceRoutes.js")).default;
const bookingRoutes = (await import("./routes/bookingRoutes.js")).default;
const searchProxy = (await import("./routes/searchProxy.js")).default;

/* ======================
   API Routes
====================== */
app.use("/api/auth", authRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api", searchProxy);

/* ======================
   Health Check
====================== */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ServLink API is running 🚀",
  });
});

/* ======================
   404 Handler
====================== */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

/* ======================
   Global Error Handler
====================== */
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Server Error",
  });
});

/* ======================
   Start Server
====================== */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

