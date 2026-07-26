import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import {
  createClass,
  createDepartment,
  deleteClass,
  deleteDepartment,
  getAttendanceOptions,
  syncAttendanceOptions,
  updateDepartment
} from "../src/controllers/attendanceOptionController.js";
import {
  createStudent,
  importStudentsFromCsv
} from "../src/controllers/attendanceStudentController.js";
import { createAttendanceSheet } from "../src/controllers/attendanceSheetController.js";
import AttendanceClass from "../src/models/AttendanceClass.js";
import AttendanceDepartment from "../src/models/AttendanceDepartment.js";
import AttendanceSheet from "../src/models/AttendanceSheet.js";
import AttendanceStudent from "../src/models/AttendanceStudent.js";
import {
  normalizeClassName,
  normalizeDepartmentName,
  normalizeDisplayName
} from "../src/utils/attendanceOptionUtils.js";

const createResponse = () => ({
  body: undefined,
  statusCode: 200,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

test("attendance option normalization preserves valid characters and rejects empty values", () => {
  assert.equal(normalizeDepartmentName("  ce/it   & (ict)  "), "CE/IT & (ICT)");
  assert.equal(normalizeClassName(" ece - 1 "), "ECE - 1");
  assert.equal(
    normalizeDisplayName("  Computer   Science and Engineering "),
    "Computer Science and Engineering"
  );
  assert.throws(() => normalizeDepartmentName("   "), /required/i);
  assert.throws(() => normalizeClassName("x".repeat(101)), /100 characters/i);

  const classIndexes = AttendanceClass.schema.indexes();
  assert.ok(classIndexes.some(([fields, options]) => {
    return fields.department === 1
      && fields.className === 1
      && options.unique === true;
  }));
});

test("department and class creation normalize values and prevent scoped duplicates", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalDepartmentFindOne = AttendanceDepartment.findOne;
  const originalDepartmentCreate = AttendanceDepartment.create;
  const originalDepartmentExists = AttendanceDepartment.exists;
  const originalClassFindOne = AttendanceClass.findOne;
  const originalClassCreate = AttendanceClass.create;
  const originalStudentExists = AttendanceStudent.exists;
  const departments = [];
  const classes = [];

  mongoose.connection.readyState = 1;
  AttendanceDepartment.findOne = async ({ name }) => {
    return departments.find((department) => department.name === name) || null;
  };
  AttendanceDepartment.create = async (data) => {
    const department = {
      _id: new mongoose.Types.ObjectId(),
      ...data
    };
    departments.push(department);
    return department;
  };
  AttendanceDepartment.exists = async ({ name, isActive }) => {
    return departments.find((department) => {
      return department.name === name
        && (isActive === undefined || department.isActive === isActive);
    }) || null;
  };
  AttendanceClass.findOne = async ({ department, className }) => {
    return classes.find((attendanceClass) => {
      return attendanceClass.department === department
        && attendanceClass.className === className;
    }) || null;
  };
  AttendanceClass.create = async (data) => {
    const attendanceClass = {
      _id: new mongoose.Types.ObjectId(),
      ...data
    };
    classes.push(attendanceClass);
    return attendanceClass;
  };
  AttendanceStudent.exists = async () => null;

  try {
    const eceResponse = createResponse();
    await createDepartment({
      body: {
        name: " ece ",
        displayName: " Electronics   and Communication Engineering "
      }
    }, eceResponse);

    assert.equal(eceResponse.statusCode, 201);
    assert.equal(eceResponse.body.data.name, "ECE");
    assert.equal(
      eceResponse.body.data.displayName,
      "Electronics and Communication Engineering"
    );

    const cseResponse = createResponse();
    await createDepartment({
      body: {
        name: "CSE",
        displayName: "Computer Science and Engineering"
      }
    }, cseResponse);
    assert.equal(cseResponse.statusCode, 201);

    const duplicateDepartmentResponse = createResponse();
    await createDepartment({
      body: {
        name: "ece",
        displayName: "Duplicate ECE"
      }
    }, duplicateDepartmentResponse);
    assert.equal(duplicateDepartmentResponse.statusCode, 409);

    const eceClassResponse = createResponse();
    await createClass({
      body: {
        department: "ece",
        className: "ece1",
        displayName: "ECE 1"
      }
    }, eceClassResponse);
    assert.equal(eceClassResponse.statusCode, 201);
    assert.equal(eceClassResponse.body.data.className, "ECE1");

    const duplicateClassResponse = createResponse();
    await createClass({
      body: {
        department: "ECE",
        className: "ECE1",
        displayName: "Duplicate ECE 1"
      }
    }, duplicateClassResponse);
    assert.equal(duplicateClassResponse.statusCode, 409);

    const similarClassResponse = createResponse();
    await createClass({
      body: {
        department: "CSE",
        className: "ECE1",
        displayName: "ECE 1 in CSE"
      }
    }, similarClassResponse);
    assert.equal(similarClassResponse.statusCode, 201);
    assert.equal(similarClassResponse.body.data.department, "CSE");
  } finally {
    AttendanceDepartment.findOne = originalDepartmentFindOne;
    AttendanceDepartment.create = originalDepartmentCreate;
    AttendanceDepartment.exists = originalDepartmentExists;
    AttendanceClass.findOne = originalClassFindOne;
    AttendanceClass.create = originalClassCreate;
    AttendanceStudent.exists = originalStudentExists;
    mongoose.connection.readyState = originalReadyState;
  }
});

test("active master options support student creation and CSV import", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalDepartmentExists = AttendanceDepartment.exists;
  const originalClassExists = AttendanceClass.exists;
  const originalStudentCreate = AttendanceStudent.create;
  const originalStudentExists = AttendanceStudent.exists;
  const originalStudentFind = AttendanceStudent.find;
  const originalStudentBulkWrite = AttendanceStudent.bulkWrite;
  const insertedStudents = [];

  mongoose.connection.readyState = 1;
  AttendanceDepartment.exists = async (filters) => {
    return filters.name === "ECE" && filters.isActive === true
      ? { _id: new mongoose.Types.ObjectId() }
      : null;
  };
  AttendanceClass.exists = async (filters) => {
    return filters.department === "ECE"
      && filters.className === "ECE1"
      && filters.isActive === true
      ? { _id: new mongoose.Types.ObjectId() }
      : null;
  };
  AttendanceStudent.create = async (data) => ({
    _id: new mongoose.Types.ObjectId(),
    ...data
  });
  AttendanceStudent.exists = async () => null;
  AttendanceStudent.find = (filters) => {
    if (filters._id?.$in) {
      return {
        sort: async () => insertedStudents
      };
    }

    return {
      select: async () => []
    };
  };
  AttendanceStudent.bulkWrite = async (operations) => {
    const upsertedIds = {};

    operations.forEach((operation, index) => {
      const _id = new mongoose.Types.ObjectId();
      insertedStudents.push({
        _id,
        ...operation.updateOne.update.$setOnInsert
      });
      upsertedIds[index] = _id;
    });

    return {
      upsertedIds
    };
  };

  try {
    const createResponseResult = createResponse();
    await createStudent({
      body: {
        enrollmentNo: "24SE02EC001",
        studentName: "ECE STUDENT",
        department: "ece",
        className: "ece1"
      }
    }, createResponseResult);

    assert.equal(createResponseResult.statusCode, 201);
    assert.equal(createResponseResult.body.data.department, "ECE");
    assert.equal(createResponseResult.body.data.className, "ECE1");

    const csvResponse = createResponse();
    await importStudentsFromCsv({
      body: {
        department: "ECE",
        className: "ECE1"
      },
      file: {
        buffer: Buffer.from(
          "enrollmentNo,studentName\n24SE02EC002,CSV ECE STUDENT"
        )
      }
    }, csvResponse);

    assert.equal(csvResponse.statusCode, 200);
    assert.equal(csvResponse.body.data.insertedCount, 1);
    assert.equal(csvResponse.body.data.insertedStudents[0].department, "ECE");
    assert.equal(csvResponse.body.data.insertedStudents[0].className, "ECE1");

    AttendanceDepartment.exists = async () => null;
    AttendanceClass.exists = async () => null;
    const unknownOptionResponse = createResponse();
    await createStudent({
      body: {
        enrollmentNo: "24SE02XX001",
        studentName: "UNKNOWN OPTION STUDENT",
        department: "UNKNOWN",
        className: "UNKNOWN1"
      }
    }, unknownOptionResponse);

    assert.equal(unknownOptionResponse.statusCode, 400);
    assert.equal(
      unknownOptionResponse.body.message,
      "The selected department or class does not exist. Please create it first."
    );
  } finally {
    AttendanceDepartment.exists = originalDepartmentExists;
    AttendanceClass.exists = originalClassExists;
    AttendanceStudent.create = originalStudentCreate;
    AttendanceStudent.exists = originalStudentExists;
    AttendanceStudent.find = originalStudentFind;
    AttendanceStudent.bulkWrite = originalStudentBulkWrite;
    mongoose.connection.readyState = originalReadyState;
  }
});

test("attendance sheet generation accepts ECE and ECE1 without changing its snapshot format", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalStudentFind = AttendanceStudent.find;
  const originalSheetFindOne = AttendanceSheet.findOne;
  const originalSheetCreate = AttendanceSheet.create;
  const students = [
    {
      enrollmentNo: "24SE02EC001",
      studentName: "ECE STUDENT"
    }
  ];

  mongoose.connection.readyState = 1;
  AttendanceStudent.find = () => ({
    sort: async () => students
  });
  AttendanceSheet.findOne = () => ({
    sort: async () => null
  });
  AttendanceSheet.create = async (data) => ({
    _id: new mongoose.Types.ObjectId(),
    ...data
  });

  try {
    const response = createResponse();
    await createAttendanceSheet({
      body: {
        department: "ece",
        className: "ece1",
        heading: "ECE EVENT",
        attendanceDate: "2026-07-26",
        eventCoordinatorName: "COORDINATOR"
      }
    }, response);

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.data.department, "ECE");
    assert.equal(response.body.data.className, "ECE1");
    assert.deepEqual(response.body.data.students, [
      {
        serialNo: 1,
        enrollmentNo: "24SE02EC001",
        studentName: "ECE STUDENT",
        signature: ""
      }
    ]);
  } finally {
    AttendanceStudent.find = originalStudentFind;
    AttendanceSheet.findOne = originalSheetFindOne;
    AttendanceSheet.create = originalSheetCreate;
    mongoose.connection.readyState = originalReadyState;
  }
});

test("department and class dependencies block deletion while deactivation remains available", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalDepartmentFindById = AttendanceDepartment.findById;
  const originalClassFindById = AttendanceClass.findById;
  const originalStudentExists = AttendanceStudent.exists;
  const originalClassExists = AttendanceClass.exists;
  const originalSheetExists = AttendanceSheet.exists;
  const departmentId = new mongoose.Types.ObjectId().toString();
  const classId = new mongoose.Types.ObjectId().toString();
  const department = {
    _id: departmentId,
    name: "ECE",
    displayName: "ECE",
    isActive: true,
    async save() {
      return this;
    },
    async deleteOne() {
      throw new Error("A dependent department must not be deleted");
    }
  };
  const attendanceClass = {
    _id: classId,
    department: "ECE",
    className: "ECE1",
    async deleteOne() {
      throw new Error("A dependent class must not be deleted");
    }
  };

  mongoose.connection.readyState = 1;
  AttendanceDepartment.findById = async () => department;
  AttendanceClass.findById = async () => attendanceClass;
  AttendanceStudent.exists = async () => ({ _id: new mongoose.Types.ObjectId() });
  AttendanceClass.exists = async () => null;
  AttendanceSheet.exists = async () => null;

  try {
    const deactivateResponse = createResponse();
    await updateDepartment({
      params: {
        id: departmentId
      },
      body: {
        isActive: false
      }
    }, deactivateResponse);

    assert.equal(deactivateResponse.statusCode, 200);
    assert.equal(department.isActive, false);

    const deleteDepartmentResponse = createResponse();
    await deleteDepartment({
      params: {
        id: departmentId
      }
    }, deleteDepartmentResponse);

    assert.equal(deleteDepartmentResponse.statusCode, 409);
    assert.match(deleteDepartmentResponse.body.message, /deactivate it instead/i);

    const deleteClassResponse = createResponse();
    await deleteClass({
      params: {
        id: classId
      }
    }, deleteClassResponse);

    assert.equal(deleteClassResponse.statusCode, 409);
    assert.match(deleteClassResponse.body.message, /deactivate it instead/i);
  } finally {
    AttendanceDepartment.findById = originalDepartmentFindById;
    AttendanceClass.findById = originalClassFindById;
    AttendanceStudent.exists = originalStudentExists;
    AttendanceClass.exists = originalClassExists;
    AttendanceSheet.exists = originalSheetExists;
    mongoose.connection.readyState = originalReadyState;
  }
});

test("options response merges legacy student pairs without duplicates and sorts them", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalDepartmentFind = AttendanceDepartment.find;
  const originalClassFind = AttendanceClass.find;
  const originalStudentAggregate = AttendanceStudent.aggregate;

  mongoose.connection.readyState = 1;
  AttendanceDepartment.find = () => ({
    sort: async () => [{
      _id: new mongoose.Types.ObjectId(),
      name: "CE/IT",
      displayName: "CE/IT"
    }]
  });
  AttendanceClass.find = () => ({
    sort: async () => [{
      _id: new mongoose.Types.ObjectId(),
      department: "CE/IT",
      className: "CE4",
      displayName: "CE4"
    }]
  });
  AttendanceStudent.aggregate = async () => [
    {
      _id: {
        department: " ce/it ",
        className: "ce4"
      }
    },
    {
      _id: {
        department: "AIML",
        className: "AIML1"
      }
    }
  ];

  try {
    const response = createResponse();
    await getAttendanceOptions({}, response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(
      response.body.data.departments.map((department) => department.name),
      ["AIML", "CE/IT"]
    );
    assert.deepEqual(
      response.body.data.departments[1].classes.map((attendanceClass) => {
        return attendanceClass.className;
      }),
      ["CE4"]
    );
  } finally {
    AttendanceDepartment.find = originalDepartmentFind;
    AttendanceClass.find = originalClassFind;
    AttendanceStudent.aggregate = originalStudentAggregate;
    mongoose.connection.readyState = originalReadyState;
  }
});

test("sync creates missing CE/IT, CSE, and AIML master records once", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalStudentAggregate = AttendanceStudent.aggregate;
  const originalDepartmentUpdateOne = AttendanceDepartment.updateOne;
  const originalClassUpdateOne = AttendanceClass.updateOne;
  const insertedDepartments = new Set();
  const insertedClasses = new Set();

  mongoose.connection.readyState = 1;
  AttendanceStudent.aggregate = async () => [
    { _id: { department: "CE/IT", className: "CE4" } },
    { _id: { department: "CSE", className: "CSE1" } },
    { _id: { department: "AIML", className: "AIML1" } },
    { _id: { department: "aiml", className: "aiml1" } }
  ];
  AttendanceDepartment.updateOne = async ({ name }) => {
    const wasInserted = !insertedDepartments.has(name);
    insertedDepartments.add(name);
    return {
      upsertedCount: wasInserted ? 1 : 0
    };
  };
  AttendanceClass.updateOne = async ({ department, className }) => {
    const key = `${department}:${className}`;
    const wasInserted = !insertedClasses.has(key);
    insertedClasses.add(key);
    return {
      upsertedCount: wasInserted ? 1 : 0
    };
  };

  try {
    const response = createResponse();
    await syncAttendanceOptions({}, response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body.data, {
      insertedDepartmentCount: 3,
      insertedClassCount: 3
    });
    assert.deepEqual([...insertedDepartments].sort(), ["AIML", "CE/IT", "CSE"]);
  } finally {
    AttendanceStudent.aggregate = originalStudentAggregate;
    AttendanceDepartment.updateOne = originalDepartmentUpdateOne;
    AttendanceClass.updateOne = originalClassUpdateOne;
    mongoose.connection.readyState = originalReadyState;
  }
});
