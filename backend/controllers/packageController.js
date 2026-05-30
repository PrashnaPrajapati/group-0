const Package = require("../models/packageModel");

const parseServiceIds = (value, fieldName = "service_ids") => {
  try {
    return value ? JSON.parse(value) : [];
  } catch {
    const error = new Error(`Invalid ${fieldName} format`);
    error.status = 400;
    throw error;
  }
};

const createPackage = async (req, res) => {
  try {
    const { name, description, price, duration, status = "active", service_ids } = req.body;
    const image = req.file?.imageUrl || null;
    const servicesArray = parseServiceIds(service_ids, "services");

    if (!name || !price || !servicesArray || !Array.isArray(servicesArray)) {
      return res.status(400).json({ message: "Name, price and services required" });
    }

    const existingPackage = await Package.findByName(name);
    if (existingPackage) {
      return res.status(400).json({ message: "Package name already exists" });
    }

    const packageId = await Package.createPackage({
      name,
      description,
      price,
      duration,
      status,
      image,
    });

    await Package.replacePackageServices(packageId, servicesArray);
    res.json({ message: "Package created successfully" });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    res.status(500).json({ message: "DB error", error: err });
  }
};

const updatePackage = async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    const name = req.body?.name;
    const description = req.body?.description;
    const price = req.body?.price;
    const duration = req.body?.duration;
    const serviceIds = parseServiceIds(req.body?.service_ids);
    const packageId = req.params.id;

    await Package.updatePackage({
      id: packageId,
      name,
      description,
      price,
      duration,
      status: "active",
      image: req.file?.imageUrl,
    });

    await Package.replacePackageServices(packageId, serviceIds);
    res.json({ message: "Package updated successfully" });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error(err);
    res.status(500).json({ message: "DB error updating package" });
  }
};

const getAdminPackages = async (req, res) => {
  try {
    const packages = await Package.findAdminPackages();
    res.json(packages);
  } catch (err) {
    res.status(500).json({ message: "DB error", error: err });
  }
};

const getPackages = async (req, res) => {
  try {
    const packages = await Package.findActivePackages();
    res.json(packages);
  } catch (err) {
    res.status(500).json({ message: "DB error", error: err });
  }
};

const getPackageReviews = async (req, res) => {
  try {
    const reviews = await Package.findReviewsByPackageId(req.params.id);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
};

const getPackageById = async (req, res) => {
  try {
    const pkg = await Package.findActivePackageById(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });
    res.json(pkg);
  } catch (err) {
    res.status(500).json({ message: "DB error", error: err });
  }
};

const getAdminPackageById = async (req, res) => {
  try {
    const pkg = await Package.findAdminPackageById(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });
    res.json(pkg);
  } catch (err) {
    res.status(500).json({ message: "DB error", error: err });
  }
};

const deletePackage = async (req, res) => {
  try {
    await Package.deletePackage(req.params.id);
    res.json({ message: "Package deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete package" });
  }
};

const updatePackageStatus = async (req, res) => {
  try {
    const status = req.params.status;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    await Package.updateStatus(req.params.id, status);
    res.json({ message: `Package ${status} successfully` });
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
};

module.exports = {
  createPackage,
  deletePackage,
  getAdminPackageById,
  getAdminPackages,
  getPackageById,
  getPackageReviews,
  getPackages,
  updatePackage,
  updatePackageStatus,
};
