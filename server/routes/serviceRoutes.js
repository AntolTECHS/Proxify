import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addService,
  getProviderServices,
  getAllServices,
} from "../controllers/serviceController.js";

const router = express.Router();

// Provider adds a service
router.post("/add", protect("provider"), addService);

// Get services by provider
router.get("/provider/:providerId", getProviderServices);

// Get all services
router.get("/", getAllServices);

export default router;