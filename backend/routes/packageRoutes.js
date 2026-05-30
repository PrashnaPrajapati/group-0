const express = require("express");
const {
  createPackage,
  deletePackage,
  getAdminPackageById,
  getAdminPackages,
  getPackageById,
  getPackageReviews,
  getPackages,
  updatePackage,
  updatePackageStatus,
} = require("../controllers/packageController");
const { verifyAdmin } = require("../middleware/authMiddleware");
const { imageUpload } = require("../middleware/imageUpload");

const router = express.Router();

router.post("/admin/packages", verifyAdmin, imageUpload("image", "/packages"), createPackage);
router.put("/admin/packages/:id", verifyAdmin, imageUpload("image", "/packages"), updatePackage);
router.get("/admin/packages", verifyAdmin, getAdminPackages);
router.get("/admin/packages/:id", verifyAdmin, getAdminPackageById);
router.delete("/admin/packages/:id", verifyAdmin, deletePackage);
router.get("/packages", getPackages);
router.get("/packages/:id/reviews", getPackageReviews);
router.get("/packages/:id", getPackageById);
router.put("/packages/:id/:status", verifyAdmin, updatePackageStatus);

module.exports = router;
