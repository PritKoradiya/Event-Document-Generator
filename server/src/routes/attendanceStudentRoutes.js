import express from "express";
import {
  bulkCreateStudents,
  createStudent,
  deleteStudent,
  deleteStudentsByClass,
  downloadStudentCsvTemplate,
  getStudents,
  importStudentsFromCsv,
  updateStudent
} from "../controllers/attendanceStudentController.js";
import uploadStudentCsv from "../middleware/uploadStudentCsv.js";
import validateObjectId from "../middleware/validateObjectId.js";

const router = express.Router();

router.param("id", validateObjectId);

router.get("/csv-template", downloadStudentCsvTemplate);
router.post("/import-csv", uploadStudentCsv, importStudentsFromCsv);
router.post("/bulk", bulkCreateStudents);
router.post("/", createStudent);
router.get("/", getStudents);
router.put("/:id", updateStudent);
router.delete("/class", deleteStudentsByClass);
router.delete("/:id", deleteStudent);

export default router;
