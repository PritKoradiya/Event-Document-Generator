import mongoose from "mongoose";
import AttendanceSheet from "../models/AttendanceSheet.js";
import AttendanceStudent from "../models/AttendanceStudent.js";
import {
  createCaseInsensitiveExactPattern,
  getAttendanceOptionErrorMessage,
  getAttendanceOptionPairStatus
} from "../services/attendanceOptionService.js";
import {
  normalizeClassName,
  normalizeDepartmentName,
  resolveClassName
} from "../utils/attendanceOptionUtils.js";

const ROWS_PER_PAGE = 39;
const REQUIRED_FIELDS = [
  "department",
  "className",
  "eventHeading",
  "eventDate",
  "coordinatorName"
];

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
  if (field === "department") {
    return normalizeDepartmentName(value);
  }

  if (field === "className") {
    return normalizeClassName(value);
  }

  return String(value ?? "").trim();
};

const getSheetRequestData = (body = {}) => {
  const sourceValues = {
    department: body.department,
    className: resolveClassName(body),
    eventHeading: body.eventHeading ?? body.heading,
    eventDate: body.eventDate ?? body.attendanceDate,
    coordinatorName: body.coordinatorName ?? body.eventCoordinatorName
  };

  return Object.fromEntries(
    Object.entries(sourceValues)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([field, value]) => [field, normalizeSheetField(field, value)])
  );
};

const getStoredSnapshot = (attendanceSheet) => {
  if (Array.isArray(attendanceSheet.studentsSnapshot)) {
    return attendanceSheet.studentsSnapshot;
  }

  return Array.isArray(attendanceSheet.students)
    ? attendanceSheet.students
    : [];
};

const serializeAttendanceSheet = (attendanceSheet) => {
  const plainSheet = typeof attendanceSheet?.toObject === "function"
    ? attendanceSheet.toObject()
    : { ...attendanceSheet };
  const serializedSheet = {
    ...plainSheet,
    eventHeading: plainSheet.eventHeading ?? plainSheet.heading ?? "",
    eventDate: plainSheet.eventDate ?? plainSheet.attendanceDate ?? "",
    coordinatorName: plainSheet.coordinatorName
      ?? plainSheet.eventCoordinatorName
      ?? "",
    studentsSnapshot: Array.isArray(plainSheet.studentsSnapshot)
      ? plainSheet.studentsSnapshot
      : (plainSheet.students || [])
  };

  delete serializedSheet.heading;
  delete serializedSheet.attendanceDate;
  delete serializedSheet.eventCoordinatorName;
  delete serializedSheet.students;

  return serializedSheet;
};

const LEGACY_SHEET_FIELDS = {
  eventHeading: "heading",
  eventDate: "attendanceDate",
  coordinatorName: "eventCoordinatorName"
};

const usesLegacySheetStorage = (attendanceSheet) => {
  return attendanceSheet.eventHeading === undefined
    && (
      attendanceSheet.heading !== undefined
      || attendanceSheet.attendanceDate !== undefined
      || attendanceSheet.eventCoordinatorName !== undefined
      || attendanceSheet.students !== undefined
    );
};

const getAttendanceSheetValue = (attendanceSheet, field) => {
  const legacyField = LEGACY_SHEET_FIELDS[field];

  if (attendanceSheet[field] !== undefined && attendanceSheet[field] !== null) {
    return attendanceSheet[field];
  }

  return legacyField ? attendanceSheet[legacyField] : undefined;
};

const setAttendanceSheetValue = (attendanceSheet, field, value) => {
  const legacyField = LEGACY_SHEET_FIELDS[field];

  if (legacyField && usesLegacySheetStorage(attendanceSheet)) {
    attendanceSheet[legacyField] = value;
    return;
  }

  attendanceSheet[field] = value;
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
    const sheetData = getSheetRequestData(body);
    const missingFields = REQUIRED_FIELDS.filter((field) => {
      return isMissingRequiredValue(sheetData[field]);
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`
      });
    }

    const attendanceOptionStatus = await getAttendanceOptionPairStatus(
      sheetData.department,
      sheetData.className
    );

    if (!attendanceOptionStatus.isValid) {
      return res.status(400).json({
        success: false,
        message: getAttendanceOptionErrorMessage(attendanceOptionStatus)
      });
    }

    const students = await getStudentSnapshot(sheetData.department, sheetData.className);

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No students were found for ${sheetData.department} - ${sheetData.className}.`
      });
    }

    const attendanceSheet = await createAttendanceSheetRecord({
      ...sheetData,
      studentsSnapshot: students,
      ...getPaginationData(students),
      status: "Generated"
    });

    return res.status(201).json({
      success: true,
      message: "Attendance sheet generated successfully",
      data: serializeAttendanceSheet(attendanceSheet)
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

    const draftData = getSheetRequestData(req.body || {});

    if (draftData.department && draftData.className) {
      const attendanceOptionStatus = await getAttendanceOptionPairStatus(
        draftData.department,
        draftData.className
      );

      if (!attendanceOptionStatus.isValid) {
        return res.status(400).json({
          success: false,
          message: getAttendanceOptionErrorMessage(attendanceOptionStatus)
        });
      }
    }

    const attendanceSheet = await createAttendanceSheetRecord({
      ...draftData,
      ...getPaginationData([]),
      status: "Draft"
    });

    return res.status(201).json({
      success: true,
      message: "Attendance sheet draft saved successfully",
      data: serializeAttendanceSheet(attendanceSheet)
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

    const query = req.query || {};
    const conditions = [];

    if (!isMissingRequiredValue(query.department)) {
      const department = normalizeDepartmentName(query.department);
      conditions.push({
        department: createCaseInsensitiveExactPattern(department)
      });
    }

    const requestedClassName = resolveClassName(query);

    if (!isMissingRequiredValue(requestedClassName)) {
      const className = normalizeClassName(requestedClassName);
      conditions.push({
        className: createCaseInsensitiveExactPattern(className)
      });
    }

    const requestedEventDate = query.eventDate ?? query.attendanceDate;

    if (!isMissingRequiredValue(requestedEventDate)) {
      const eventDate = normalizeSheetField("eventDate", requestedEventDate);
      conditions.push({
        $or: [
          {
            eventDate
          },
          {
            attendanceDate: eventDate
          }
        ]
      });
    }

    if (!isMissingRequiredValue(query.status)) {
      conditions.push({
        status: String(query.status).trim()
      });
    }

    const filters = conditions.length > 0
      ? {
        $and: conditions
      }
      : {};
    const attendanceSheets = await AttendanceSheet.find(filters).sort({ createdAt: -1 });
    const serializedSheets = attendanceSheets.map(serializeAttendanceSheet);

    return res.status(200).json({
      success: true,
      count: serializedSheets.length,
      data: serializedSheets
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
      data: serializeAttendanceSheet(attendanceSheet)
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

    const body = req.body || {};
    const requestedData = getSheetRequestData(body);
    const currentDepartment = normalizeDepartmentName(attendanceSheet.department);
    const currentClassName = normalizeClassName(attendanceSheet.className);
    const nextDepartment = requestedData.department ?? currentDepartment;
    const nextClassName = requestedData.className ?? currentClassName;
    const optionPairChanged = nextDepartment !== currentDepartment
      || nextClassName !== currentClassName;

    if (attendanceSheet.status === "Generated" && optionPairChanged) {
      return res.status(400).json({
        success: false,
        message: "Regenerate the attendance sheet to change its department or class."
      });
    }

    if (optionPairChanged || body.status === "Generated") {
      const attendanceOptionStatus = await getAttendanceOptionPairStatus(
        nextDepartment,
        nextClassName
      );

      if (!attendanceOptionStatus.isValid) {
        return res.status(400).json({
          success: false,
          message: getAttendanceOptionErrorMessage(attendanceOptionStatus)
        });
      }
    }

    Object.entries(requestedData).forEach(([field, value]) => {
      setAttendanceSheetValue(attendanceSheet, field, value);
    });

    if (body.status !== undefined) {
      attendanceSheet.status = body.status;
    }

    if (attendanceSheet.status === "Generated") {
      const missingFields = REQUIRED_FIELDS.filter((field) => {
        const value = ["eventHeading", "eventDate", "coordinatorName"].includes(field)
          ? getAttendanceSheetValue(attendanceSheet, field)
          : attendanceSheet[field];
        return isMissingRequiredValue(value);
      });

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(", ")}`
        });
      }
    }

    if (
      attendanceSheet.status === "Generated"
      && getStoredSnapshot(attendanceSheet).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A generated attendance sheet must contain students."
      });
    }

    await attendanceSheet.save();

    return res.status(200).json({
      success: true,
      message: "Attendance sheet updated successfully",
      data: serializeAttendanceSheet(attendanceSheet)
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

    const attendanceOptionStatus = await getAttendanceOptionPairStatus(
      attendanceSheet.department,
      attendanceSheet.className
    );

    if (!attendanceOptionStatus.isValid) {
      return res.status(400).json({
        success: false,
        message: getAttendanceOptionErrorMessage(attendanceOptionStatus)
      });
    }

    const students = await getStudentSnapshot(
      attendanceSheet.department,
      attendanceSheet.className
    );

    if (attendanceSheet.status === "Generated" && students.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No students were found for ${attendanceSheet.department} - ${attendanceSheet.className}.`
      });
    }

    if (usesLegacySheetStorage(attendanceSheet)) {
      attendanceSheet.students = students;
    } else {
      attendanceSheet.studentsSnapshot = students;
    }
    Object.assign(attendanceSheet, getPaginationData(students));
    await attendanceSheet.save();

    return res.status(200).json({
      success: true,
      message: "Attendance sheet regenerated successfully",
      data: serializeAttendanceSheet(attendanceSheet)
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

    const studentsSnapshot = copyStudentSnapshot(getStoredSnapshot(sourceSheet));
    const duplicatedSheet = await createAttendanceSheetRecord({
      schoolName: sourceSheet.schoolName,
      department: sourceSheet.department,
      className: sourceSheet.className,
      eventHeading: getAttendanceSheetValue(sourceSheet, "eventHeading"),
      eventDate: getAttendanceSheetValue(sourceSheet, "eventDate"),
      coordinatorName: getAttendanceSheetValue(sourceSheet, "coordinatorName"),
      documentTitle: sourceSheet.documentTitle,
      studentsSnapshot,
      ...getPaginationData(studentsSnapshot),
      status: "Draft"
    });

    return res.status(201).json({
      success: true,
      message: "Attendance sheet duplicated as draft successfully",
      data: serializeAttendanceSheet(duplicatedSheet)
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
      data: serializeAttendanceSheet(attendanceSheet)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete attendance sheet"
    });
  }
};
