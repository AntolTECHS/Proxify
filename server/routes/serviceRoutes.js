const express = require("express");
const { addService, getProviderServices, getAllServices } = require("../controllers/serviceController");
const auth = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/add", auth, addService);
router.get("/provider/:providerId", getProviderServices);
router.get("/", getAllServices);

module.exports = router;
