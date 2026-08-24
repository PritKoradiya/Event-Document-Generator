import multer from "multer";
import { isDevelopment } from "../config/env.js";

const getFileSizeMessage = (req) => {
  if (req.originalUrl.startsWith("/api/posters")) {
    return "Poster asset must be smaller than 5MB.";
  }

  if (req.originalUrl.startsWith("/api/attendance-students/import-csv")) {
    return "CSV file must be smaller than 2MB.";
  }

  return "Image size must be less than 5MB.";
};

const apiNotFound = (req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found"
  });
};

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = Number.isInteger(error.status) ? error.status : 500;
  let message = error.message || "Internal server error";

  if (error.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON payload.";
  } else if (error.type === "entity.too.large" || error.status === 413) {
    statusCode = 413;
    message = "Bulk request is too large. Please reduce signature image size or participant batch size.";
  } else if (error instanceof multer.MulterError) {
    statusCode = 400;
    message = error.code === "LIMIT_FILE_SIZE"
      ? getFileSizeMessage(req)
      : error.message;
  } else if (error.name === "CastError" && error.kind === "ObjectId") {
    statusCode = 400;
    message = "Invalid resource ID.";
  } else if (error.code === 11000) {
    statusCode = 409;
    message = "A record with this value already exists.";
  } else if (error.name === "ValidationError") {
    statusCode = 400;
  }

  if (isDevelopment && statusCode >= 500) {
    console.error(error.stack || error);
  }

  if (statusCode >= 500) {
    message = "Internal server error";
  }

  return res.status(statusCode).json({
    success: false,
    message
  });
};

export {
  apiNotFound,
  errorHandler
};
