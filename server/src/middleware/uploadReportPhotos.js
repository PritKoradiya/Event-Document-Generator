import { randomUUID } from "crypto";
import { mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDirectory = path.join(__dirname, "../../uploads/event-reports");

mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (req, file, callback) => {
    const extensionsByMimeType = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp"
    };
    const extension = extensionsByMimeType[file.mimetype];
    const fileName = `report-photo-${Date.now()}-${randomUUID()}${extension}`;

    callback(null, fileName);
  }
});

const allowedImageTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

const fileFilter = (req, file, callback) => {
  if (allowedImageTypes.includes(file.mimetype)) {
    return callback(null, true);
  }

  const error = new Error("Only JPG, PNG, and WebP images are allowed.");
  error.status = 400;
  return callback(error);
};

const uploadReportPhotos = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

export default uploadReportPhotos;
