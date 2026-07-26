import mongoose from "mongoose";
import AttendanceSheet from "../models/AttendanceSheet.js";
import AttendanceStudent from "../models/AttendanceStudent.js";
import {
  createCaseInsensitiveExactPattern,
  isAttendanceOptionPairValid
} from "../services/attendanceOptionService.js";
import {
  normalizeClassName,
  normalizeDepartmentName
} from "../utils/attendanceOptionUtils.js";

const ROWS_PER_PAGE = 39;
const REQUIRED_FIELDS = [
  "department",
  "heading",
  "className",
  "attendanceDate",
  "eventCoordinatorName"
];
const EDITABLE_FIELDS = [...REQUIRED_FIELDS, "status"];

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

const normalizeSheetField = (field, value) => {
  if (typeof value !== "string") {
    return value;
  }

  if (field === "department") {
    return normalizeDepartmentName(value);
  }

  if (field === "className") {
    return normalizeClassName(value);
  }

  return value.trim();
};

const createAttendanceSheetIdFromNumber = (year, number) => {
  return `ATT-${year}-${String(number).padStart(4, "0")}`;
};

const generateAttendanceSheetId = async () => {
  const year = new Date().getFullYear();
  const sheetIdPrefix = `ATT-${year}-`;
  const latestSheet = await AttendanceSheet.findOne({
    sheetId: new RegExp(`^${sheetIdPrefix}`)
  }).sort({ sheetId: -1 });

  if (!latestSheet?.sheetId) {
    return createAttendanceSheetIdFromNumber(year, 1);
  }

  const latestNumber = Number(latestSheet.sheetId.replace(sheetIdPrefix, ""));
  const nextNumber = Number.isNaN(latestNumber) ? 1 : latestNumber + 1;

  return createAttendanceSheetIdFromNumber(year, nextNumber);
};

const isDuplicateSheetIdError = (error) => {
  return error?.code === 11000 && Boolean(error?.keyPattern?.sheetId);
};

const createAttendanceSheetRecord = async (sheetData) => {
  const maximumAttempts = 5;

  for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
    const sheetId = await generateAttendanceSheetId();

    try {
      return await AttendanceSheet.create({
        ...sheetData,
        sheetId
      });
    } catch (error) {
      if (!isDuplicateSheetIdError(error) || attempt === maximumAttempts - 1) {
        throw error;
      }
    }
  }

  throw new Error("Unable to generate a unique attendance sheet ID.");
};

const getStudentSnapshot = async (department, className) => {
  const students = await AttendanceStudent.find({
    department: createCaseInsensitiveExactPattern(department),
    className: createCaseInsensitiveExactPattern(className),
    isActive: true
  }).sort({
    enrollmentNo: 1,
    studentName: 1
  });

  return students.map((student, index) => ({
    serialNo: index + 1,
    enrollmentNo: student.enrollmentNo,
    studentName: student.studentName,
    signature: ""
  }));
};

const getPaginationData = (students) => {
  return {
    totalStudents: students.length,
    rowsPerPage: ROWS_PER_PAGE,
    totalPages: students.length > 0
      ? Math.ceil(students.length / ROWS_PER_PAGE)
      : 0
  };
};

const copyStudentSnapshot = (students) => {
  return students.map((student, index) => ({
    serialNo: index + 1,
    enrollmentNo: student.enrollmentNo,
    studentName: student.studentName,
    signature: ""
  }));
};

const controllerErrorResponse = (res, error, fallbackMessage) => {
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

export const createAttendanceSheet = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    const body = req.body || {};
    const missingFields = REQUIRED_FIELDS.filter((field) => isMissingRequiredValue(body[field]));

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`
      });
    }

    const sheetData = Object.fromEntries(REQUIRED_FIELDS.map((field) => [
      field,
      normalizeSheetField(field, body[field])
    ]));
    const students = await getStudentSnapshot(sheetData.department, sheetData.className);

    if (students.length === 0) {
      const attendanceOptionIsValid = await isAttendanceOptionPairValid(
        sheetData.department,
        sheetData.className
      );

      if (!attendanceOptionIsValid) {
        return res.status(400).json({
          success: false,
          message: "The selected department or class does not exist. Please create it first."
        });
      }

      return res.status(404).json({
        success: false,
        message: "No students found for the selected department and class."
      });
    }

    const attendanceSheet = await createAttendanceSheetRecord({
      ...sheetData,
      students,
      ...getPaginationData(students),
      status: "Generated"
    });

    return res.status(201).json({
      success: true,
      message: "Attendance sheet generated successfully",
      data: attendanceSheet
    });
  } catch (error) {
    return controllerErrorResponse(res, error, "Failed to generate attendance sheet");
  }
};

export const saveDraftAttendanceSheet = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    const draftData = {};

    REQUIRED_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        draftData[field] = normalizeSheetField(field, req.body[field]);
      }
    });

    const attendanceSheet = await createAttendanceSheetRecord({
      ...draftData,
      ...getPaginationData([]),
      status: "Draft"
    });

    return res.status(201).json({
      success: true,
      message: "Attendance sheet draft saved successfully",
      data: attendanceSheet
    });
  } catch (error) {
    return controllerErrorResponse(res, error, "Failed to save attendance sheet draft");
  }
};

export const getAttendanceSheets = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    const filters = {};
    const filterFields = ["department", "className", "attendanceDate", "status"];

    filterFields.forEach((field) => {
      if (typeof req.query[field] === "string" && req.query[field].trim()) {
        filters[field] = normalizeSheetField(field, req.query[field]);
      }
    });

    const attendanceSheets = await AttendanceSheet.find(filters).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: attendanceSheets.length,
      data: attendanceSheets
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance sheets"
    });
  }
};

export const getAttendanceSheetById = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: "Attendance sheet not found"
      });
    }

    const attendanceSheet = await AttendanceSheet.findById(req.params.id);

    if (!attendanceSheet) {
      return res.status(404).json({
        success: false,
        message: "Attendance sheet not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Attendance sheet fetched successfully",
      data: attendanceSheet
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance sheet"
    });
  }
};

export const updateAttendanceSheet = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: "Attendance sheet not found"
      });
    }

    const attendanceSheet = await AttendanceSheet.findById(req.params.id);

    if (!attendanceSheet) {
      return res.status(404).json({
        success: false,
        message: "Attendance sheet not found"
      });
    }

    EDITABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        attendanceSheet[field] = normalizeSheetField(field, req.body[field]);
      }
    });

    if (attendanceSheet.status === "Generated") {
      const missingFields = REQUIRED_FIELDS.filter((field) => {
        return isMissingRequiredValue(attendanceSheet[field]);
      });

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(", ")}`
        });
      }
    }

    if (attendanceSheet.status === "Generated" && attendanceSheet.students.length === 0) {
      return res.status(400).json({
        success: false,
        message: "A generated attendance sheet must contain students."
      });
    }

    await attendanceSheet.save();

    return res.status(200).json({
      success: true,
      message: "Attendance sheet updated successfully",
      data: attendanceSheet
    });
  } catch (error) {
    return controllerErrorResponse(res, error, "Failed to update attendance sheet");
  }
};

export const regenerateAttendanceSheet = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: "Attendance sheet not found"
      });
    }

    const attendanceSheet = await AttendanceSheet.findById(req.params.id);

    if (!attendanceSheet) {
      return res.status(404).json({
        success: false,
        message: "Attendance sheet not found"
      });
    }

    if (
      isMissingRequiredValue(attendanceSheet.department)
      || isMissingRequiredValue(attendanceSheet.className)
    ) {
      return res.status(400).json({
        success: false,
        message: "Department and className are required to regenerate the attendance sheet."
      });
    }

    const students = await getStudentSnapshot(
      attendanceSheet.department,
      attendanceSheet.className
    );

    if (attendanceSheet.status === "Generated" && students.length === 0) {
      const attendanceOptionIsValid = await isAttendanceOptionPairValid(
        attendanceSheet.department,
        attendanceSheet.className
      );

      if (!attendanceOptionIsValid) {
        return res.status(400).json({
          success: false,
          message: "The selected department or class does not exist. Please create it first."
        });
      }

      return res.status(404).json({
        success: false,
        message: "No students found for the selected department and class."
      });
    }

    attendanceSheet.students = students;
    Object.assign(attendanceSheet, getPaginationData(students));
    await attendanceSheet.save();

    return res.status(200).json({
      success: true,
      message: "Attendance sheet regenerated successfully",
      data: attendanceSheet
    });
  } catch (error) {
    return controllerErrorResponse(res, error, "Failed to regenerate attendance sheet");
  }
};

export const duplicateAttendanceSheet = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: "Attendance sheet not found"
      });
    }

    const sourceSheet = await AttendanceSheet.findById(req.params.id);

    if (!sourceSheet) {
      return res.status(404).json({
        success: false,
        message: "Attendance sheet not found"
      });
    }

    const students = copyStudentSnapshot(sourceSheet.students);
    const duplicatedSheet = await createAttendanceSheetRecord({
      schoolName: sourceSheet.schoolName,
      department: sourceSheet.department,
      heading: sourceSheet.heading,
      className: sourceSheet.className,
      attendanceDate: sourceSheet.attendanceDate,
      eventCoordinatorName: sourceSheet.eventCoordinatorName,
      documentTitle: sourceSheet.documentTitle,
      students,
      ...getPaginationData(students),
      status: "Draft"
    });

    return res.status(201).json({
      success: true,
      message: "Attendance sheet duplicated as draft successfully",
      data: duplicatedSheet
    });
  } catch (error) {
    return controllerErrorResponse(res, error, "Failed to duplicate attendance sheet");
  }
};

export const deleteAttendanceSheet = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: "Attendance sheet not found"
      });
    }

    const attendanceSheet = await AttendanceSheet.findByIdAndDelete(req.params.id);

    if (!attendanceSheet) {
      return res.status(404).json({
        success: false,
        message: "Attendance sheet not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Attendance sheet deleted successfully",
      data: attendanceSheet
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete attendance sheet"
    });
  }
};
