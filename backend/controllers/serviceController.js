const Service = require("../models/serviceModel");

const getServices = async (req, res) => {
  try {
    const services = await Service.findActiveServices();
    res.json(services);
  } catch (err) {
    console.error("SERVICES ERROR:", err);
    res.status(500).json({ message: "Database error" });
  }
};

const getServiceById = async (req, res) => {
  try {
    const service = await Service.findActiveServiceById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json(service);
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
};

const getServiceReviews = async (req, res) => {
  try {
    const reviews = await Service.findReviewsByServiceId(req.params.id);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
};

const createService = async (req, res) => {
  try {
    const { name, description, price, duration, gender, category } = req.body;

    if (!name || !price || !duration || !gender || !category) {
      return res.status(400).json({ message: "All fields required" });
    }

    const nameClean = name.trim();
    const imagePath = req.file?.imageUrl || null;

    const existingService = await Service.findByName(nameClean);
    if (existingService) {
      return res.status(400).json({ message: "Service with this name already exists" });
    }

    await Service.createService({
      name: nameClean,
      description,
      price,
      duration,
      gender,
      category,
      image: imagePath,
    });

    res.json({ message: "Service added successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "DB error" });
  }
};

const getAdminServices = async (req, res) => {
  try {
    const services = await Service.findAll();

    if (!services) {
      return res.status(500).json({ message: "No results found" });
    }

    res.json(services);
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
};

const updateService = async (req, res) => {
  try {
    const { name, description, price, duration, gender, category } = req.body;
    const serviceId = req.params.id;
    const imagePath = req.file?.imageUrl || null;
    const nameClean = name.trim();

    const duplicateService = await Service.findDuplicateName(nameClean, serviceId);
    if (duplicateService) {
      return res.status(400).json({ message: "Another service with this name already exists" });
    }

    await Service.updateService(serviceId, {
      name: nameClean,
      description,
      price,
      duration,
      gender,
      category,
      image: imagePath,
    });

    res.json({ message: "Service updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
};

const markServiceInactive = async (req, res) => {
  try {
    await Service.updateStatus(req.params.id, "inactive");
    res.json({ message: "Service marked as inactive" });
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
};

const markServiceActive = async (req, res) => {
  try {
    await Service.updateStatus(req.params.id, "active");
    res.json({ message: "Service marked as active" });
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
};

module.exports = {
  createService,
  getAdminServices,
  getServiceById,
  getServiceReviews,
  getServices,
  markServiceActive,
  markServiceInactive,
  updateService,
};
