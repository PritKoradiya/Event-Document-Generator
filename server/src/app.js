import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { allowedOrigins } from "./config/env.js";
import { apiNotFound, errorHandler } from "./middleware/errorHandler.js";
import attendanceOptionRoutes from "./routes/attendanceOptionRoutes.js";
import attendanceSheetRoutes from "./routes/attendanceSheetRoutes.js";
import attendanceStudentRoutes from "./routes/attendanceStudentRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import eventReportRoutes from "./routes/eventReportRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import posterRoutes from "./routes/posterRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const corsError = new Error("Origin is not allowed by CORS.");
    corsError.status = 403;
    return callback(corsError);
  }
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads"), {
  dotfiles: "deny",
  index: false
}));

app.use("/api/health", healthRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/attendance-options", attendanceOptionRoutes);
app.use("/api/attendance-students", attendanceStudentRoutes);
app.use("/api/attendance-sheets", attendanceSheetRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/event-reports", eventReportRoutes);
app.use("/api/posters", posterRoutes);

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Event Document Generator API"
  });
});

app.use("/api", apiNotFound);
app.use(errorHandler);

export default app;
