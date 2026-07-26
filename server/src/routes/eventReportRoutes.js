import express from "express";
import {
  createEventReport,
  deleteEventReport,
  getEventReportById,
  getEventReports,
  saveDraftEventReport,
  updateEventReport
} from "../controllers/eventReportController.js";
import uploadReportPhotos from "../middleware/uploadReportPhotos.js";
import validateObjectId from "../middleware/validateObjectId.js";

const router = express.Router();

router.param("id", validateObjectId);

router.post("/draft", uploadReportPhotos.array("photos", 4), saveDraftEventReport);
router.post("/", uploadReportPhotos.array("photos", 4), createEventReport);
router.get("/", getEventReports);
router.get("/:id", getEventReportById);
router.put("/:id", uploadReportPhotos.array("photos", 4), updateEventReport);
router.delete("/:id", deleteEventReport);

export default router;
