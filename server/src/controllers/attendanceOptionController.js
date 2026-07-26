import mongoose from "mongoose";
import AttendanceClass from "../models/AttendanceClass.js";
import AttendanceDepartment from "../models/AttendanceDepartment.js";
import AttendanceSheet from "../models/AttendanceSheet.js";
import AttendanceStudent from "../models/AttendanceStudent.js";
import {
  createCaseInsensitiveExactPattern,
  getLegacyAttendancePairs,
  isAttendanceDepartmentKnown
} from "../services/attendanceOptionService.js";
import {
  normalizeClassName,
  normalizeDepartmentName,
  normalizeDisplayName
} from "../utils/attendanceOptionUtils.js";

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const databaseUnavailableResponse = (res) => {
  return res.status(503).json({
    success: false,
    message: "Database is not connected. Please set MONGO_URI and restart the server."
  });
};

const normalizeDescription = (value = "") => {
  if (typeof value !== "string") {
    const error = new Error("Description must be a string.");
    error.status = 400;
    throw error;
  }

  return value.trim();
};

const validateIsActive = (value) => {
  if (value !== undefined && typeof value !== "boolean") {
    const error = new Error("isActive must be true or false.");
    error.status = 400;
    throw error;
  }
};

const controllerErrorResponse = (res, error, fallbackMessage) => {
  if (error?.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "An attendance option with these values already exists."
    });
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

const hasValidMongoId = (id) => mongoose.Types.ObjectId.isValid(id);

const getDepartmentDependencies = async (department) => {
  const departmentPattern = createCaseInsensitiveExactPattern(department);
  const [students, classes, attendanceSheets] = await Promise.all([
    AttendanceStudent.exists({
      department: departmentPattern
    }),
    AttendanceClass.exists({
      department
    }),
    AttendanceSheet.exists({
      department: departmentPattern
    })
  ]);

  return {
    students: Boolean(students),
    classes: Boolean(classes),
    attendanceSheets: Boolean(attendanceSheets)
  };
};

const getClassDependencies = async (department, className) => {
  const departmentPattern = createCaseInsensitiveExactPattern(department);
  const classPattern = createCaseInsensitiveExactPattern(className);
  const [students, attendanceSheets] = await Promise.all([
    AttendanceStudent.exists({
      department: departmentPattern,
      className: classPattern
    }),
    AttendanceSheet.exists({
      department: departmentPattern,
      className: classPattern
    })
  ]);

  return {
    students: Boolean(students),
    attendanceSheets: Boolean(attendanceSheets)
  };
};

const hasDependencies = (dependencies) => {
  return Object.values(dependencies).some(Boolean);
};

export const getAttendanceOptions = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    const [masterDepartments, masterClasses, legacyPairs] = await Promise.all([
      AttendanceDepartment.find({
        isActive: true
      }).sort({
        name: 1
      }),
      AttendanceClass.find({
        isActive: true
      }).sort({
        department: 1,
        className: 1
      }),
      getLegacyAttendancePairs()
    ]);
    const departmentsByName = new Map();

    masterDepartments.forEach((department) => {
      departmentsByName.set(department.name, {
        _id: department._id,
        name: department.name,
        displayName: department.displayName,
        classes: []
      });
    });

    legacyPairs.forEach(({ department }) => {
      if (!departmentsByName.has(department)) {
        departmentsByName.set(department, {
          name: department,
          displayName: department,
          classes: []
        });
      }
    });

    const classKeys = new Set();

    masterClasses.forEach((attendanceClass) => {
      const department = departmentsByName.get(attendanceClass.department);

      if (!department) {
        return;
      }

      const key = `${attendanceClass.department}\u0000${attendanceClass.className}`;
      classKeys.add(key);
      department.classes.push({
        _id: attendanceClass._id,
        className: attendanceClass.className,
        displayName: attendanceClass.displayName
      });
    });

    legacyPairs.forEach(({ department, className }) => {
      const key = `${department}\u0000${className}`;

      if (classKeys.has(key)) {
        return;
      }

      departmentsByName.get(department).classes.push({
        className,
        displayName: className
      });
      classKeys.add(key);
    });

    const departments = [...departmentsByName.values()]
      .map((department) => ({
        ...department,
        classes: department.classes.sort((firstClass, secondClass) => {
          return firstClass.className.localeCompare(secondClass.className);
        })
      }))
      .sort((firstDepartment, secondDepartment) => {
        return firstDepartment.name.localeCompare(secondDepartment.name);
      });

    return res.status(200).json({
      success: true,
      message: "Attendance options fetched successfully",
      data: {
        departments
      }
    });
  } catch (error) {
    return controllerErrorResponse(res, error, "Failed to fetch attendance options");
  }
};

export const createDepartment = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    const name = normalizeDepartmentName(req.body?.name);
    const displayName = normalizeDisplayName(req.body?.displayName);
    const description = normalizeDescription(req.body?.description);
    const duplicateDepartment = await AttendanceDepartment.findOne({
      name
    });

    if (duplicateDepartment) {
      return res.status(409).json({
        success: false,
        message: "This department already exists."
      });
    }

    const department = await AttendanceDepartment.create({
      name,
      displayName,
      description,
      isActive: true
    });

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department
    });
  } catch (error) {
    return controllerErrorResponse(res, error, "Failed to create department");
  }
};

export const updateDepartment = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    if (!hasValidMongoId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource ID."
      });
    }

    const department = await AttendanceDepartment.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found."
      });
    }

    validateIsActive(req.body?.isActive);

    if (req.body?.name !== undefined) {
      const nextName = normalizeDepartmentName(req.body.name);

      if (nextName !== department.name) {
        const dependencies = await getDepartmentDependencies(department.name);

        if (hasDependencies(dependencies)) {
          return res.status(409).json({
            success: false,
            message: "Department name cannot be changed while students, classes, or attendance sheets are using it."
          });
        }

        const duplicateDepartment = await AttendanceDepartment.findOne({
          _id: {
            $ne: department._id
          },
          name: nextName
        });

        if (duplicateDepartment) {
          return res.status(409).json({
            success: false,
            message: "This department already exists."
          });
        }

        department.name = nextName;
      }
    }

    if (req.body?.displayName !== undefined) {
      department.displayName = normalizeDisplayName(req.body.displayName);
    }

    if (req.body?.description !== undefined) {
      department.description = normalizeDescription(req.body.description);
    }

    if (req.body?.isActive !== undefined) {
      department.isActive = req.body.isActive;
    }

    await department.save();

    return res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: department
    });
  } catch (error) {
    return controllerErrorResponse(res, error, "Failed to update department");
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    if (!hasValidMongoId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource ID."
      });
    }

    const department = await AttendanceDepartment.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found."
      });
    }

    const dependencies = await getDepartmentDependencies(department.name);

    if (hasDependencies(dependencies)) {
      return res.status(409).json({
        success: false,
        message: "This department cannot be deleted because students, classes, or attendance sheets are using it. Deactivate it instead."
      });
    }

    await department.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Department deleted successfully",
      data: department
    });
  } catch (error) {
    return controllerErrorResponse(res, error, "Failed to delete department");
  }
};

export const createClass = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    const department = normalizeDepartmentName(req.body?.department);
    const className = normalizeClassName(req.body?.className);
    const displayName = normalizeDisplayName(req.body?.displayName);
    const description = normalizeDescription(req.body?.description);
    const departmentExists = await isAttendanceDepartmentKnown(department);

    if (!departmentExists) {
      return res.status(400).json({
        success: false,
        message: "The selected department does not exist. Please create it first."
      });
    }

    const duplicateClass = await AttendanceClass.findOne({
      department,
      className
    });

    if (duplicateClass) {
      return res.status(409).json({
        success: false,
        message: "This class already exists in the selected department."
      });
    }

    const attendanceClass = await AttendanceClass.create({
      department,
      className,
      displayName,
      description,
      isActive: true
    });

    return res.status(201).json({
      success: true,
      message: "Class created successfully",
      data: attendanceClass
    });
  } catch (error) {
    return controllerErrorResponse(res, error, "Failed to create class");
  }
};

export const updateClass = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    if (!hasValidMongoId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource ID."
      });
    }

    const attendanceClass = await AttendanceClass.findById(req.params.id);

    if (!attendanceClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found."
      });
    }

    validateIsActive(req.body?.isActive);

    const nextDepartment = req.body?.department === undefined
      ? attendanceClass.department
      : normalizeDepartmentName(req.body.department);
    const nextClassName = req.body?.className === undefined
      ? attendanceClass.className
      : normalizeClassName(req.body.className);
    const identityChanged = nextDepartment !== attendanceClass.department
      || nextClassName !== attendanceClass.className;

    if (identityChanged) {
      const dependencies = await getClassDependencies(
        attendanceClass.department,
        attendanceClass.className
      );

      if (hasDependencies(dependencies)) {
        return res.status(409).json({
          success: false,
          message: "Department or class name cannot be changed while students or attendance sheets are using this class."
        });
      }

      const departmentExists = await isAttendanceDepartmentKnown(nextDepartment);

      if (!departmentExists) {
        return res.status(400).json({
          success: false,
          message: "The selected department does not exist. Please create it first."
        });
      }

      const duplicateClass = await AttendanceClass.findOne({
        _id: {
          $ne: attendanceClass._id
        },
        department: nextDepartment,
        className: nextClassName
      });

      if (duplicateClass) {
        return res.status(409).json({
          success: false,
          message: "This class already exists in the selected department."
        });
      }

      attendanceClass.department = nextDepartment;
      attendanceClass.className = nextClassName;
    }

    if (req.body?.displayName !== undefined) {
      attendanceClass.displayName = normalizeDisplayName(req.body.displayName);
    }

    if (req.body?.description !== undefined) {
      attendanceClass.description = normalizeDescription(req.body.description);
    }

    if (req.body?.isActive !== undefined) {
      attendanceClass.isActive = req.body.isActive;
    }

    await attendanceClass.save();

    return res.status(200).json({
      success: true,
      message: "Class updated successfully",
      data: attendanceClass
    });
  } catch (error) {
    return controllerErrorResponse(res, error, "Failed to update class");
  }
};

export const deleteClass = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    if (!hasValidMongoId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resource ID."
      });
    }

    const attendanceClass = await AttendanceClass.findById(req.params.id);

    if (!attendanceClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found."
      });
    }

    const dependencies = await getClassDependencies(
      attendanceClass.department,
      attendanceClass.className
    );

    if (hasDependencies(dependencies)) {
      return res.status(409).json({
        success: false,
        message: "This class cannot be deleted because students or attendance sheets are using it. Deactivate it instead."
      });
    }

    await attendanceClass.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Class deleted successfully",
      data: attendanceClass
    });
  } catch (error) {
    return controllerErrorResponse(res, error, "Failed to delete class");
  }
};

export const syncAttendanceOptions = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    const legacyPairs = await getLegacyAttendancePairs();
    const departmentNames = [...new Set(
      legacyPairs.map(({ department }) => department)
    )];
    let insertedDepartmentCount = 0;
    let insertedClassCount = 0;

    for (const name of departmentNames) {
      const result = await AttendanceDepartment.updateOne(
        {
          name
        },
        {
          $setOnInsert: {
            name,
            displayName: name,
            description: "",
            isActive: true
          }
        },
        {
          upsert: true
        }
      );

      insertedDepartmentCount += result.upsertedCount || 0;
    }

    for (const { department, className } of legacyPairs) {
      const result = await AttendanceClass.updateOne(
        {
          department,
          className
        },
        {
          $setOnInsert: {
            department,
            className,
            displayName: className,
            description: "",
            isActive: true
          }
        },
        {
          upsert: true
        }
      );

      insertedClassCount += result.upsertedCount || 0;
    }

    return res.status(200).json({
      success: true,
      message: "Existing attendance options synchronized successfully",
      data: {
        insertedDepartmentCount,
        insertedClassCount
      }
    });
  } catch (error) {
    return controllerErrorResponse(
      res,
      error,
      "Failed to synchronize existing attendance options"
    );
  }
};
