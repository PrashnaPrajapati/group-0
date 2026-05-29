const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
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

const router = express.Router();

const serviceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/services";

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName = Date.now() + ext;
    cb(null, fileName);
  },
});

const serviceUpload = multer({ storage: serviceStorage });

router.get("/services", getServices);
router.get("/services/:id", getServiceById);
router.get("/services/:id/reviews", getServiceReviews);
router.post("/admin/services", verifyAdmin, serviceUpload.single("image"), createService);
router.get("/admin/services", verifyAdmin, getAdminServices);
router.put("/admin/services/:id", verifyAdmin, serviceUpload.single("image"), updateService);
router.put("/admin/services/:id/inactive", verifyAdmin, markServiceInactive);
router.put("/admin/services/:id/active", verifyAdmin, markServiceActive);

module.exports = router;
