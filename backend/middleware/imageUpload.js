const path = require("path");
const multer = require("multer");
const { toFile } = require("@imagekit/nodejs");
const { getImageKitClient } = require("../config/imageKit");

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, WEBP, and GIF images are allowed"));
    }

    cb(null, true);
  },
});

const safeFileName = (file) => {
  const extension = path.extname(file.originalname) || ".jpg";
  const baseName = path
    .basename(file.originalname, extension)
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .slice(0, 60);

  return `${baseName || "image"}-${Date.now()}${extension}`;
};

const uploadImageToImageKit = (folder) => async (req, res, next) => {
  if (!req.file) return next();

  try {
    const client = getImageKitClient();
    const fileName = safeFileName(req.file);
    const uploadFolder = folder.startsWith("/") ? folder : `/${folder}`;

    const result = await client.files.upload({
      file: await toFile(req.file.buffer, fileName),
      fileName,
      folder: uploadFolder,
      useUniqueFileName: true,
    });

    req.file.imageKit = result;
    req.file.imageUrl = result.url;
    req.file.fileId = result.fileId;
    req.file.filePath = result.filePath;

    next();
  } catch (err) {
    next(err);
  }
};

const imageUpload = (fieldName, folder) => [
  memoryUpload.single(fieldName),
  uploadImageToImageKit(folder),
];

module.exports = {
  imageUpload,
};
