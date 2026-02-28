// server/middleware/uploadMiddleware.js
import multer from "multer";
import path from "path";

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // make sure this folder exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Filter: only allow certain files (optional)
const fileFilter = (req, file, cb) => {
  // accept any file type, or filter by mimetype
  cb(null, true);
};

export const upload = multer({ storage, fileFilter });