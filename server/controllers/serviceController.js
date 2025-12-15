const Service = require("../models/Service");

// Add service
exports.addService = async (req, res) => {
  try {
    const { name, description, cost } = req.body;

    const service = await Service.create({
      name,
      description,
      cost,
      provider: req.user.id,
    });

    res.status(201).json({ message: "Service added", service });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all services of a provider
exports.getProviderServices = async (req, res) => {
  try {
    const services = await Service.find({ provider: req.params.providerId });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all services
exports.getAllServices = async (req, res) => {
  try {
    const services = await Service.find().populate("provider", "name email");
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
