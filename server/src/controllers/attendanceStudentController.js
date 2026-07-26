import mongoose from "mongoose";
import { parse } from "csv-parse/sync";
import AttendanceStudent from "../models/AttendanceStudent.js";
import { isAttendanceOptionPairValid } from "../services/attendanceOptionService.js";
import {
  normalizeClassName,
  normalizeDepartmentName
} from "../utils/attendanceOptionUtils.js";

const INVALID_ATTENDANCE_OPTION_MESSAGE = "The selected department or class does not exist. Please create it first.";

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const databaseUnavailableResponse = (res) => {
  return res.status(503).json({
    success: false,
    message: "Database is not connected. Please set MONGO_URI and restart the server."
  });
};

const isMissingRequiredValue = (value) => {
  return value === undefined || value === null || (
    typeof value === "string" && !value.trim()
  );
};

const normalizeStudentData = ({
  enrollmentNo,
  studentName,
  department,
  className,
  isActive
}) => {
  const normalizedData = {
    enrollmentNo: String(enrollmentNo).trim().toUpperCase(),
    studentName: String(studentName).trim().toUpperCase(),
    department: normalizeDepartmentName(department),
    className: normalizeClassName(className)
  };

  if (typeof isActive === "boolean") {
    normalizedData.isActive = isActive;
  }

  return normalizedData;
};

const duplicateStudentResponse = (res) => {
  return res.status(409).json({
    success: false,
    message: "This enrollment number already exists in the selected department and class."
  });
};

const validationErrorResponse = (res, error, fallbackMessage) => {
  if (error?.code === 11000) {
    return duplicateStudentResponse(res);
  }

  if (error?.status === 400 || error?.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  return res.status(500).json({
    success: false,
    message: fallbackMessage
  });
};

const normalizeCsvHeader = (header) => {
  const normalizedHeader = String(header ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (["enrollmentno", "enrollmentnumber"].includes(normalizedHeader)) {
    return "enrollmentNo";
  }

  if (["studentname", "name"].includes(normalizedHeader)) {
    return "studentName";
  }

  return normalizedHeader;
};

const escapeRegularExpression = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const downloadStudentCsvTemplate = (req, res) => {
  const csvTemplate = [
    "enrollmentNo,studentName",
    "24SE02CE001,STUDENT NAME ONE",
    "24SE02CE002,STUDENT NAME TWO"
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="attendance_student_template.csv"'
  );

  return res.status(200).send(csvTemplate);
};

export const importStudentsFromCsv = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    const { department, className } = req.body || {};

    if (isMissingRequiredValue(department) || isMissingRequiredValue(className)) {
      return res.status(400).json({
        success: false,
        message: "Department and className are required."
      });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: "Student CSV file is required."
      });
    }

    let parsedRows;

    try {
      parsedRows = parse(req.file.buffer, {
        bom: true,
        info: true,
        relax_column_count: true,
        skip_empty_lines: false
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: `Invalid CSV file: ${error.message}`
      });
    }

    const nonEmptyParsedRows = parsedRows.filter(({ record }) => {
      return record.some((value) => String(value ?? "").trim());
    });

    if (nonEmptyParsedRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "CSV file is empty."
      });
    }

    const headers = nonEmptyParsedRows[0].record.map(normalizeCsvHeader);
    const enrollmentNoIndex = headers.indexOf("enrollmentNo");
    const studentNameIndex = headers.indexOf("studentName");

    if (enrollmentNoIndex === -1 || studentNameIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "CSV must contain enrollmentNo and studentName headers."
      });
    }

    const dataRows = nonEmptyParsedRows.slice(1);

    if (dataRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "CSV does not contain any student rows."
      });
    }

    const normalizedDepartment = normalizeDepartmentName(department);
    const normalizedClassName = normalizeClassName(className);
    const attendanceOptionIsValid = await isAttendanceOptionPairValid(
      normalizedDepartment,
      normalizedClassName
    );

    if (!attendanceOptionIsValid) {
      return res.status(400).json({
        success: false,
        message: INVALID_ATTENDANCE_OPTION_MESSAGE
      });
    }

    const invalidRows = [];
    const skippedRows = [];
    const uniqueRows = [];
    const enrollmentNumbersInCsv = new Set();

    dataRows.forEach(({ record, info }) => {
      const enrollmentNo = String(record[enrollmentNoIndex] ?? "").trim().toUpperCase();
      const studentName = String(record[studentNameIndex] ?? "").trim().toUpperCase();
      const rowNumber = info.lines;

      if (!enrollmentNo) {
        invalidRows.push({
          rowNumber,
          reason: "Enrollment number is missing"
        });
        return;
      }

      if (!studentName) {
        invalidRows.push({
          rowNumber,
          enrollmentNo,
          reason: "Student name is missing"
        });
        return;
      }

      if (enrollmentNumbersInCsv.has(enrollmentNo)) {
        skippedRows.push({
          rowNumber,
          enrollmentNo,
          reason: "Duplicate enrollment number"
        });
        return;
      }

      enrollmentNumbersInCsv.add(enrollmentNo);
      uniqueRows.push({
        rowNumber,
        enrollmentNo,
        studentData: {
          enrollmentNo,
          studentName,
          department: normalizedDepartment,
          className: normalizedClassName
        }
      });
    });

    const existingStudents = uniqueRows.length > 0
      ? await AttendanceStudent.find({
        department: normalizedDepartment,
        className: normalizedClassName,
        enrollmentNo: {
          $in: uniqueRows.map((row) => row.enrollmentNo)
        }
      }).select("enrollmentNo")
      : [];
    const existingEnrollmentNumbers = new Set(
      existingStudents.map((student) => student.enrollmentNo)
    );
    const rowsToInsert = [];

    uniqueRows.forEach((row) => {
      if (existingEnrollmentNumbers.has(row.enrollmentNo)) {
        skippedRows.push({
          rowNumber: row.rowNumber,
          enrollmentNo: row.enrollmentNo,
          reason: "Duplicate enrollment number"
        });
        return;
      }

      rowsToInsert.push(row);
    });

    const operations = rowsToInsert.map((row) => ({
      updateOne: {
        filter: {
          department: normalizedDepartment,
          className: normalizedClassName,
          enrollmentNo: row.enrollmentNo
        },
        update: {
          $setOnInsert: row.studentData
        },
        upsert: true
      }
    }));
    const result = operations.length > 0
      ? await AttendanceStudent.bulkWrite(operations, { ordered: false })
      : { upsertedIds: {} };
    const upsertedIds = result.upsertedIds || {};
    const insertedOperationIndexes = new Set(
      Object.keys(upsertedIds).map((index) => Number(index))
    );

    rowsToInsert.forEach((row, index) => {
      if (!insertedOperationIndexes.has(index)) {
        skippedRows.push({
          rowNumber: row.rowNumber,
          enrollmentNo: row.enrollmentNo,
          reason: "Duplicate enrollment number"
        });
      }
    });

    const insertedIds = Object.values(upsertedIds);
    const insertedStudents = insertedIds.length > 0
      ? await AttendanceStudent.find({
        _id: {
          $in: insertedIds
        }
      }).sort({
        enrollmentNo: 1,
        studentName: 1
      })
      : [];

    skippedRows.sort((firstRow, secondRow) => firstRow.rowNumber - secondRow.rowNumber);
    invalidRows.sort((firstRow, secondRow) => firstRow.rowNumber - secondRow.rowNumber);

    return res.status(200).json({
      success: true,
      message: "Student CSV import completed",
      data: {
        totalRows: dataRows.length,
        insertedCount: insertedStudents.length,
        skippedCount: skippedRows.length,
        invalidCount: invalidRows.length,
        insertedStudents,
        skippedRows,
        invalidRows
      }
    });
  } catch (error) {
    return validationErrorResponse(res, error, "Failed to import students from CSV");
  }
};

export const createStudent = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    const body = req.body || {};
    const requiredFields = ["enrollmentNo", "studentName", "department", "className"];
    const missingFields = requiredFields.filter((field) => isMissingRequiredValue(body[field]));

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`
      });
    }

    const normalizedStudent = normalizeStudentData(body);
    const attendanceOptionIsValid = await isAttendanceOptionPairValid(
      normalizedStudent.department,
      normalizedStudent.className
    );

    if (!attendanceOptionIsValid) {
      return res.status(400).json({
        success: false,
        message: INVALID_ATTENDANCE_OPTION_MESSAGE
      });
    }

    const student = await AttendanceStudent.create(normalizedStudent);

    return res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: student
    });
  } catch (error) {
    return validationErrorResponse(res, error, "Failed to create student");
  }
};

export const bulkCreateStudents = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    const { department, className, students } = req.body || {};

    if (isMissingRequiredValue(department) || isMissingRequiredValue(className)) {
      return res.status(400).json({
        success: false,
        message: "Department and className are required."
      });
    }

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Students must be a non-empty array."
      });
    }

    const invalidRows = students.reduce((rows, student, index) => {
      if (
        !student
        || typeof student !== "object"
        || isMissingRequiredValue(student.enrollmentNo)
        || isMissingRequiredValue(student.studentName)
      ) {
        rows.push(index + 1);
      }

      return rows;
    }, []);

    if (invalidRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Every student requires enrollmentNo and studentName. Invalid rows: ${invalidRows.join(", ")}`
      });
    }

    const normalizedDepartment = normalizeDepartmentName(department);
    const normalizedClassName = normalizeClassName(className);
    const attendanceOptionIsValid = await isAttendanceOptionPairValid(
      normalizedDepartment,
      normalizedClassName
    );

    if (!attendanceOptionIsValid) {
      return res.status(400).json({
        success: false,
        message: INVALID_ATTENDANCE_OPTION_MESSAGE
      });
    }

    const normalizedStudents = students.map((student) => normalizeStudentData({
      ...student,
      department: normalizedDepartment,
      className: normalizedClassName
    }));
    const uniqueStudentsByEnrollment = new Map();
    const duplicateEnrollmentNumbers = [];

    normalizedStudents.forEach((student) => {
      if (uniqueStudentsByEnrollment.has(student.enrollmentNo)) {
        duplicateEnrollmentNumbers.push(student.enrollmentNo);
        return;
      }

      uniqueStudentsByEnrollment.set(student.enrollmentNo, student);
    });

    const uniqueStudents = [...uniqueStudentsByEnrollment.values()];
    const existingStudents = await AttendanceStudent.find({
      department: normalizedDepartment,
      className: normalizedClassName,
      enrollmentNo: {
        $in: uniqueStudents.map((student) => student.enrollmentNo)
      }
    }).select("enrollmentNo");
    const existingEnrollmentNumbers = existingStudents.map((student) => student.enrollmentNo);
    const existingEnrollmentNumberSet = new Set(existingEnrollmentNumbers);
    const studentsToInsert = uniqueStudents.filter((student) => {
      return !existingEnrollmentNumberSet.has(student.enrollmentNo);
    });
    const operations = studentsToInsert.map((student) => ({
      updateOne: {
        filter: {
          department: student.department,
          className: student.className,
          enrollmentNo: student.enrollmentNo
        },
        update: {
          $setOnInsert: student
        },
        upsert: true
      }
    }));
    const result = operations.length > 0
      ? await AttendanceStudent.bulkWrite(operations, { ordered: false })
      : { upsertedIds: {} };
    const insertedIds = Object.values(result.upsertedIds || {});
    const insertedRecords = insertedIds.length > 0
      ? await AttendanceStudent.find({ _id: { $in: insertedIds } }).sort({
        enrollmentNo: 1,
        studentName: 1
      })
      : [];
    const skippedCount = students.length - insertedRecords.length;

    return res.status(201).json({
      success: true,
      message: "Student bulk insertion completed",
      data: {
        insertedCount: insertedRecords.length,
        skippedCount,
        insertedRecords,
        duplicateEnrollmentNumbers: [
          ...new Set([...duplicateEnrollmentNumbers, ...existingEnrollmentNumbers])
        ]
      }
    });
  } catch (error) {
    return validationErrorResponse(res, error, "Failed to create students");
  }
};

export const getStudents = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    const filters = {};

    if (typeof req.query.department === "string" && req.query.department.trim()) {
      filters.department = req.query.department.trim();
    }

    if (typeof req.query.className === "string" && req.query.className.trim()) {
      filters.className = req.query.className.trim().toUpperCase();
    }

    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const searchPattern = new RegExp(
        escapeRegularExpression(req.query.search.trim()),
        "i"
      );

      filters.$or = [
        { enrollmentNo: searchPattern },
        { studentName: searchPattern }
      ];
    }

    const students = await AttendanceStudent.find(filters).sort({
      enrollmentNo: 1,
      studentName: 1
    });

    return res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch students"
    });
  }
};

export const getStudentFilterSummary = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    if (isMissingRequiredValue(req.query.department)) {
      return res.status(400).json({
        success: false,
        message: "Department is required."
      });
    }

    if (isMissingRequiredValue(req.query.className)) {
      return res.status(400).json({
        success: false,
        message: "Class name is required."
      });
    }

    const department = String(req.query.department).trim();
    const className = String(req.query.className).trim().toUpperCase();
    const totalStudents = await AttendanceStudent.countDocuments({
      department,
      className
    });

    return res.status(200).json({
      success: true,
      data: {
        department,
        className,
        totalStudents
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch the student filter summary"
    });
  }
};

export const updateStudent = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const student = await AttendanceStudent.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const editableFields = ["enrollmentNo", "studentName", "department", "className"];
    const providedFields = editableFields.filter((field) => req.body[field] !== undefined);
    const emptyFields = providedFields.filter((field) => isMissingRequiredValue(req.body[field]));

    if (emptyFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Fields cannot be empty: ${emptyFields.join(", ")}`
      });
    }

    const currentValues = {
      enrollmentNo: student.enrollmentNo,
      studentName: student.studentName,
      department: student.department,
      className: student.className,
      isActive: student.isActive
    };
    const normalizedData = normalizeStudentData({
      ...currentValues,
      ...Object.fromEntries(providedFields.map((field) => [field, req.body[field]])),
      isActive: typeof req.body.isActive === "boolean" ? req.body.isActive : student.isActive
    });
    const attendanceOptionIsValid = await isAttendanceOptionPairValid(
      normalizedData.department,
      normalizedData.className
    );

    if (!attendanceOptionIsValid) {
      return res.status(400).json({
        success: false,
        message: INVALID_ATTENDANCE_OPTION_MESSAGE
      });
    }

    student.set(normalizedData);
    await student.save();

    return res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: student
    });
  } catch (error) {
    return validationErrorResponse(res, error, "Failed to update student");
  }
};

export const bulkDeleteStudents = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    const { studentIds } = req.body || {};

    if (!Array.isArray(studentIds)) {
      return res.status(400).json({
        success: false,
        message: "studentIds must be an array."
      });
    }

    if (studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one student to delete."
      });
    }

    if (studentIds.length > 500) {
      return res.status(400).json({
        success: false,
        message: "A maximum of 500 student IDs can be deleted in one request."
      });
    }

    const uniqueIds = [];
    const uniqueIdSet = new Set();
    const invalidIds = [];

    studentIds.forEach((studentId) => {
      if (
        typeof studentId !== "string"
        || !mongoose.Types.ObjectId.isValid(studentId.trim())
      ) {
        invalidIds.push(studentId);
        return;
      }

      const normalizedId = new mongoose.Types.ObjectId(studentId.trim()).toString();

      if (!uniqueIdSet.has(normalizedId)) {
        uniqueIdSet.add(normalizedId);
        uniqueIds.push(normalizedId);
      }
    });

    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "One or more student IDs are invalid.",
        data: {
          invalidIds
        }
      });
    }

    const matchingStudents = await AttendanceStudent.find({
      _id: {
        $in: uniqueIds
      }
    }).select("_id");
    const matchingIds = matchingStudents.map((student) => student._id.toString());

    if (matchingIds.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No matching students were found"
      });
    }

    const matchingIdSet = new Set(matchingIds);
    const missingIds = uniqueIds.filter((studentId) => !matchingIdSet.has(studentId));

    // Student-master deletions never alter the student snapshots stored in AttendanceSheet records.
    const result = await AttendanceStudent.deleteMany({
      _id: {
        $in: matchingIds
      }
    });

    return res.status(200).json({
      success: true,
      message: "Selected students deleted successfully",
      data: {
        requestedCount: uniqueIds.length,
        matchedCount: matchingIds.length,
        deletedCount: result.deletedCount,
        missingIds
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete selected students"
    });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const student = await AttendanceStudent.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student deleted successfully",
      data: student
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete student"
    });
  }
};

export const deleteStudentsByClass = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    const { department, className, confirmationText } = req.body || {};

    if (isMissingRequiredValue(department)) {
      return res.status(400).json({
        success: false,
        message: "Department is required."
      });
    }

    if (isMissingRequiredValue(className)) {
      return res.status(400).json({
        success: false,
        message: "Class name is required."
      });
    }

    if (isMissingRequiredValue(confirmationText)) {
      return res.status(400).json({
        success: false,
        message: "Confirmation text is required."
      });
    }

    const normalizedDepartment = String(department).trim();
    const normalizedClassName = String(className).trim().toUpperCase();
    const expectedConfirmation = `DELETE ${normalizedDepartment} ${normalizedClassName}`;

    if (confirmationText !== expectedConfirmation) {
      return res.status(400).json({
        success: false,
        message: `Confirmation text must exactly match "${expectedConfirmation}".`
      });
    }

    const filters = {
      department: normalizedDepartment,
      className: normalizedClassName
    };
    const matchingCount = await AttendanceStudent.countDocuments(filters);

    if (matchingCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No matching students were found"
      });
    }

    // AttendanceSheet records own independent snapshots and are intentionally not updated here.
    const result = await AttendanceStudent.deleteMany(filters);

    return res.status(200).json({
      success: true,
      message: `All students from ${normalizedDepartment} - ${normalizedClassName} deleted successfully`,
      data: {
        department: normalizedDepartment,
        className: normalizedClassName,
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete students"
    });
  }
};
