import AttendanceClass from "../models/AttendanceClass.js";
import AttendanceDepartment from "../models/AttendanceDepartment.js";
import AttendanceStudent from "../models/AttendanceStudent.js";
import {
  normalizeClassName,
  normalizeDepartmentName
} from "../utils/attendanceOptionUtils.js";

const escapeRegularExpression = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const createCaseInsensitiveExactPattern = (value) => {
  return new RegExp(`^${escapeRegularExpression(value)}$`, "i");
};

const normalizeLegacyPairs = (records) => {
  const pairs = new Map();

  records.forEach((record) => {
    try {
      const department = normalizeDepartmentName(
        record.department ?? record._id?.department
      );
      const className = normalizeClassName(
        record.className ?? record._id?.className
      );
      const key = `${department}\u0000${className}`;

      if (!pairs.has(key)) {
        pairs.set(key, {
          department,
          className
        });
      }
    } catch {
      // Invalid historical values are skipped rather than breaking all options.
    }
  });

  return [...pairs.values()];
};

const getLegacyAttendancePairs = async () => {
  const records = await AttendanceStudent.aggregate([
    {
      $match: {
        department: {
          $type: "string",
          $ne: ""
        },
        className: {
          $type: "string",
          $ne: ""
        }
      }
    },
    {
      $group: {
        _id: {
          department: "$department",
          className: "$className"
        }
      }
    }
  ]);

  return normalizeLegacyPairs(records);
};

const isLegacyDepartment = async (department) => {
  return Boolean(await AttendanceStudent.exists({
    department: createCaseInsensitiveExactPattern(department)
  }));
};

const isLegacyAttendancePair = async (department, className) => {
  return Boolean(await AttendanceStudent.exists({
    department: createCaseInsensitiveExactPattern(department),
    className: createCaseInsensitiveExactPattern(className)
  }));
};

const getAttendanceDepartmentState = async (departmentValue) => {
  const department = normalizeDepartmentName(departmentValue);
  const [departmentRecord, activeDepartment] = await Promise.all([
    AttendanceDepartment.exists({
      name: department
    }),
    AttendanceDepartment.exists({
      name: department,
      isActive: true
    })
  ]);

  if (departmentRecord) {
    return {
      exists: true,
      isActive: Boolean(activeDepartment),
      source: "master"
    };
  }

  const legacyDepartment = await isLegacyDepartment(department);

  return {
    exists: legacyDepartment,
    isActive: legacyDepartment,
    source: legacyDepartment ? "legacy" : null
  };
};

const getAttendanceOptionPairStatus = async (departmentValue, classNameValue) => {
  const department = normalizeDepartmentName(departmentValue);
  const className = normalizeClassName(classNameValue);
  const [
    departmentRecord,
    activeDepartment,
    classRecord,
    activeClass
  ] = await Promise.all([
    AttendanceDepartment.exists({
      name: department
    }),
    AttendanceDepartment.exists({
      name: department,
      isActive: true
    }),
    AttendanceClass.exists({
      department,
      className
    }),
    AttendanceClass.exists({
      department,
      className,
      isActive: true
    })
  ]);

  if (departmentRecord && !activeDepartment) {
    return {
      isValid: false,
      reason: "departmentInactive"
    };
  }

  if (classRecord && !activeClass) {
    return {
      isValid: false,
      reason: "classInactive"
    };
  }

  if (activeDepartment && activeClass) {
    return {
      isValid: true,
      reason: null
    };
  }

  const [legacyDepartment, legacyPair] = await Promise.all([
    isLegacyDepartment(department),
    isLegacyAttendancePair(department, className)
  ]);

  if (!departmentRecord && !legacyDepartment) {
    return {
      isValid: false,
      reason: "department"
    };
  }

  if (legacyPair) {
    return {
      isValid: true,
      reason: null
    };
  }

  return {
    isValid: false,
    reason: "class"
  };
};

const isAttendanceOptionPairValid = async (departmentValue, classNameValue) => {
  const status = await getAttendanceOptionPairStatus(
    departmentValue,
    classNameValue
  );

  return status.isValid;
};

const getAttendanceOptionErrorMessage = (status) => {
  if (status.reason === "department") {
    return "The selected department does not exist.";
  }

  if (status.reason === "departmentInactive") {
    return "The selected department is inactive.";
  }

  if (status.reason === "classInactive") {
    return "The selected class is inactive.";
  }

  return "The selected class does not belong to this department.";
};

export {
  createCaseInsensitiveExactPattern,
  getAttendanceDepartmentState,
  getAttendanceOptionErrorMessage,
  getAttendanceOptionPairStatus,
  getLegacyAttendancePairs,
  isAttendanceOptionPairValid,
  normalizeLegacyPairs
};
