const express = require("express");
const { 
  createService,
  getAdminServices,
  getServiceById,
  getServiceReviews,
  getServices,
  markServiceActive,
  markServiceInactive,
  updateService,
} = require("../controllers/serviceController");
const { verifyAdmin } = require("../middleware/authMiddleware");
const { imageUpload } = require("../middleware/imageUpload");

const router = express.Router();
 
router.get("/services", getServices);
router.get("/services/:id", getServiceById);
router.get("/services/:id/reviews", getServiceReviews);
router.post("/admin/services", verifyAdmin, imageUpload("image", "/services"), createService);
router.get("/admin/services", verifyAdmin, getAdminServices);
router.put("/admin/services/:id", verifyAdmin, imageUpload("image", "/services"), updateService);
router.put("/admin/services/:id/inactive", verifyAdmin, markServiceInactive);
router.put("/admin/services/:id/active", verifyAdmin, markServiceActive);

module.exports = router;
