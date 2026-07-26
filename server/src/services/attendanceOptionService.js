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

const isAttendanceDepartmentKnown = async (departmentValue) => {
  const department = normalizeDepartmentName(departmentValue);
  const departmentRecord = await AttendanceDepartment.exists({
    name: department
  });

  return Boolean(departmentRecord) || isLegacyDepartment(department);
};

const isAttendanceOptionPairValid = async (departmentValue, classNameValue) => {
  const department = normalizeDepartmentName(departmentValue);
  const className = normalizeClassName(classNameValue);
  const [activeDepartment, activeClass] = await Promise.all([
    AttendanceDepartment.exists({
      name: department,
      isActive: true
    }),
    AttendanceClass.exists({
      department,
      className,
      isActive: true
    })
  ]);

  if (activeDepartment && activeClass) {
    return true;
  }

  return isLegacyAttendancePair(department, className);
};

export {
  createCaseInsensitiveExactPattern,
  getLegacyAttendancePairs,
  isAttendanceDepartmentKnown,
  isAttendanceOptionPairValid,
  normalizeLegacyPairs
};
