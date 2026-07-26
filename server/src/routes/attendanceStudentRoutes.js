import express from "express";
import {
  bulkDeleteStudents,
  bulkCreateStudents,
  createStudent,
  deleteStudent,
  deleteStudentsByClass,
  downloadStudentCsvTemplate,
  getStudentFilterSummary,
  getStudents,
  importStudentsFromCsv,
  updateStudent
} from "../controllers/attendanceStudentController.js";
import uploadStudentCsv from "../middleware/uploadStudentCsv.js";
import validateObjectId from "../middleware/validateObjectId.js";

const router = express.Router();

router.param("id", validateObjectId);

router.get("/csv-template", downloadStudentCsvTemplate);
router.get("/filter-summary", getStudentFilterSummary);
router.post("/import-csv", uploadStudentCsv, importStudentsFromCsv);
router.post("/bulk-delete", bulkDeleteStudents);
router.post("/bulk", bulkCreateStudents);
router.post("/", createStudent);
router.get("/", getStudents);
router.put("/:id", updateStudent);
router.delete("/class", deleteStudentsByClass);
router.delete("/:id", deleteStudent);

export default router;
