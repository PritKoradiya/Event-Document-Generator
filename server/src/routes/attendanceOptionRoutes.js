import express from "express";
import {
  createClass,
  createDepartment,
  deleteClass,
  deleteDepartment,
  getAttendanceOptions,
  syncAttendanceOptions,
  updateClass,
  updateDepartment
} from "../controllers/attendanceOptionController.js";
import validateObjectId from "../middleware/validateObjectId.js";

const router = express.Router();

router.param("id", validateObjectId);

router.get("/", getAttendanceOptions);
router.post("/sync-existing", syncAttendanceOptions);

router.post("/departments", createDepartment);
router.put("/departments/:id", updateDepartment);
router.delete("/departments/:id", deleteDepartment);

router.post("/classes", createClass);
router.put("/classes/:id", updateClass);
router.delete("/classes/:id", deleteClass);

export default router;
