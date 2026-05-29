const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
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

const router = express.Router();

const packageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/packages";

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

const packageUpload = multer({ storage: packageStorage });

router.post("/admin/packages", verifyAdmin, packageUpload.single("image"), createPackage);
router.put("/admin/packages/:id", verifyAdmin, packageUpload.single("image"), updatePackage);
router.get("/admin/packages", verifyAdmin, getAdminPackages);
router.get("/admin/packages/:id", verifyAdmin, getAdminPackageById);
router.delete("/admin/packages/:id", verifyAdmin, deletePackage);
router.get("/packages", getPackages);
router.get("/packages/:id/reviews", getPackageReviews);
router.get("/packages/:id", getPackageById);
router.put("/packages/:id/:status", verifyAdmin, updatePackageStatus);

module.exports = router;
