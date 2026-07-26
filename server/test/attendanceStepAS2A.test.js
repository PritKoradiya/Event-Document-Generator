import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import mongoose from "mongoose";
import app from "../src/app.js";
import {
  downloadStudentCsvTemplate,
  getStudents,
  importStudentsFromCsv
} from "../src/controllers/attendanceStudentController.js";
import {
  createAttendanceSheet,
  duplicateAttendanceSheet,
  regenerateAttendanceSheet,
  updateAttendanceSheet
} from "../src/controllers/attendanceSheetController.js";
import AttendanceClass from "../src/models/AttendanceClass.js";
import AttendanceDepartment from "../src/models/AttendanceDepartment.js";
import AttendanceSheet from "../src/models/AttendanceSheet.js";
import AttendanceStudent from "../src/models/AttendanceStudent.js";

const createResponse = () => ({
  body: undefined,
  headers: {},
  statusCode: 200,
  setHeader(name, value) {
    this.headers[name.toLowerCase()] = value;
  },
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
  send(body) {
    this.body = body;
    return this;
  }
});

const runCsvImport = async (csv, body = { department: "CE/IT", className: "CE4" }) => {
  const response = createResponse();

  await importStudentsFromCsv({
    body,
    file: {
      buffer: Buffer.from(csv)
    }
  }, response);

  return response;
};

test("CSV template returns the required downloadable content", () => {
  const response = createResponse();

  downloadStudentCsvTemplate({}, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["content-type"], "text/csv");
  assert.equal(
    response.headers["content-disposition"],
    'attachment; filename="attendance_student_template.csv"'
  );
  assert.match(response.body, /^enrollmentNo,studentName/);
});

test("CSV import handles valid, duplicate, invalid, empty, and wrong-header rows", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalFind = AttendanceStudent.find;
  const originalBulkWrite = AttendanceStudent.bulkWrite;
  const originalClassExists = AttendanceClass.exists;
  const originalDepartmentExists = AttendanceDepartment.exists;
  const storedStudents = [];

  mongoose.connection.readyState = 1;
  AttendanceClass.exists = async () => ({ _id: new mongoose.Types.ObjectId() });
  AttendanceDepartment.exists = async () => ({ _id: new mongoose.Types.ObjectId() });
  AttendanceStudent.find = (filters) => {
    let matchedStudents = storedStudents;

    if (filters.department) {
      matchedStudents = matchedStudents.filter((student) => {
        return student.department === filters.department
          && student.className === filters.className;
      });
    }

    if (filters.enrollmentNo?.$in) {
      matchedStudents = matchedStudents.filter((student) => {
        return filters.enrollmentNo.$in.includes(student.enrollmentNo);
      });
    }

    if (filters._id?.$in) {
      const requestedIds = new Set(filters._id.$in.map(String));
      matchedStudents = matchedStudents.filter((student) => {
        return requestedIds.has(String(student._id));
      });
    }

    return {
      select: async () => matchedStudents,
      sort: async () => [...matchedStudents].sort((firstStudent, secondStudent) => {
        return firstStudent.enrollmentNo.localeCompare(secondStudent.enrollmentNo)
          || firstStudent.studentName.localeCompare(secondStudent.studentName);
      })
    };
  };
  AttendanceStudent.bulkWrite = async (operations) => {
    const upsertedIds = {};

    operations.forEach((operation, index) => {
      const studentData = operation.updateOne.update.$setOnInsert;
      const alreadyExists = storedStudents.some((student) => {
        return student.department === studentData.department
          && student.className === studentData.className
          && student.enrollmentNo === studentData.enrollmentNo;
      });

      if (!alreadyExists) {
        const _id = new mongoose.Types.ObjectId();
        storedStudents.push({
          _id,
          ...studentData
        });
        upsertedIds[index] = _id;
      }
    });

    return { upsertedIds };
  };

  try {
    const validRows = Array.from({ length: 45 }, (_, index) => {
      const number = String(index + 1).padStart(3, "0");
      return `24SE02CE${number},Student ${number}`;
    });
    const validResponse = await runCsvImport([
      "",
      "Enrollment No,Student Name",
      ...validRows
    ].join("\n"));

    assert.equal(validResponse.statusCode, 200);
    assert.equal(validResponse.body.data.totalRows, 45);
    assert.equal(validResponse.body.data.insertedCount, 45);
    assert.equal(validResponse.body.data.insertedStudents[0].studentName, "STUDENT 001");

    const mixedResponse = await runCsvImport([
      "Enrollment Number,Name",
      "24SE02CE001,Existing Student",
      "24SE02CE046,Student Forty Six",
      "24SE02CE046,Duplicate Student",
      ",Missing Enrollment",
      "24SE02CE047,"
    ].join("\n"));

    assert.equal(mixedResponse.statusCode, 200);
    assert.equal(mixedResponse.body.data.totalRows, 5);
    assert.equal(mixedResponse.body.data.insertedCount, 1);
    assert.equal(mixedResponse.body.data.skippedCount, 2);
    assert.equal(mixedResponse.body.data.invalidCount, 2);
    assert.deepEqual(
      mixedResponse.body.data.skippedRows.map((row) => row.rowNumber),
      [2, 4]
    );
    assert.deepEqual(
      mixedResponse.body.data.invalidRows.map((row) => row.reason),
      ["Enrollment number is missing", "Student name is missing"]
    );

    const wrongHeadersResponse = await runCsvImport("rollNo,fullName\n1,Student");
    assert.equal(wrongHeadersResponse.statusCode, 400);
    assert.match(wrongHeadersResponse.body.message, /must contain/i);

    const emptyResponse = await runCsvImport("\n,\n");
    assert.equal(emptyResponse.statusCode, 400);
    assert.equal(emptyResponse.body.message, "CSV file is empty.");
  } finally {
    AttendanceStudent.find = originalFind;
    AttendanceStudent.bulkWrite = originalBulkWrite;
    AttendanceClass.exists = originalClassExists;
    AttendanceDepartment.exists = originalDepartmentExists;
    mongoose.connection.readyState = originalReadyState;
  }
});

test("student list combines filters, escaped search, and default sorting", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalFind = AttendanceStudent.find;
  let receivedFilters;
  let receivedSort;

  mongoose.connection.readyState = 1;
  AttendanceStudent.find = (filters) => {
    receivedFilters = filters;

    return {
      sort: async (sort) => {
        receivedSort = sort;
        return [];
      }
    };
  };

  try {
    const response = createResponse();
    await getStudents({
      query: {
        department: "CE/IT",
        className: "ce4",
        search: "prit."
      }
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(receivedFilters.department, "CE/IT");
    assert.equal(receivedFilters.className, "CE4");
    assert.equal(receivedFilters.$or[0].enrollmentNo.source, "prit\\.");
    assert.equal(receivedFilters.$or[1].studentName.flags, "i");
    assert.deepEqual(receivedSort, {
      enrollmentNo: 1,
      studentName: 1
    });
  } finally {
    AttendanceStudent.find = originalFind;
    mongoose.connection.readyState = originalReadyState;
  }
});

test("CSV upload rejects files larger than 2MB", async () => {
  const server = app.listen(0);
  await once(server, "listening");

  try {
    const address = server.address();
    const formData = new FormData();
    formData.append("department", "CE/IT");
    formData.append("className", "CE4");
    formData.append(
      "studentCsv",
      new Blob([Buffer.alloc((2 * 1024 * 1024) + 1)], { type: "text/csv" }),
      "students.csv"
    );

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/attendance-students/import-csv`,
      {
        method: "POST",
        body: formData
      }
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.message, "CSV file must be smaller than 2MB.");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test("attendance generation, update, regeneration, and duplication preserve snapshots correctly", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalStudentFind = AttendanceStudent.find;
  const originalSheetCreate = AttendanceSheet.create;
  const originalSheetFindById = AttendanceSheet.findById;
  const originalSheetFindOne = AttendanceSheet.findOne;
  const currentStudents = Array.from({ length: 45 }, (_, index) => {
    const number = String(index + 1).padStart(3, "0");
    return {
      enrollmentNo: `24SE02CE${number}`,
      studentName: `STUDENT ${number}`,
      department: "CE/IT",
      className: "CE4",
      isActive: true
    };
  });
  const savedSheets = new Map();
  let latestSheet = null;

  mongoose.connection.readyState = 1;
  AttendanceStudent.find = (filters) => ({
    sort: async () => currentStudents.filter((student) => {
      const departmentMatches = filters.department instanceof RegExp
        ? filters.department.test(student.department)
        : student.department === filters.department;
      const classMatches = filters.className instanceof RegExp
        ? filters.className.test(student.className)
        : student.className === filters.className;

      return departmentMatches
        && classMatches
        && student.isActive === filters.isActive;
    })
  });
  AttendanceSheet.findOne = () => ({
    sort: async () => latestSheet
  });
  AttendanceSheet.findById = async (id) => savedSheets.get(String(id)) || null;
  AttendanceSheet.create = async (sheetData) => {
    const _id = new mongoose.Types.ObjectId();
    const sheet = {
      _id,
      ...sheetData,
      async save() {
        savedSheets.set(String(this._id), this);
        return this;
      }
    };

    savedSheets.set(String(_id), sheet);
    latestSheet = sheet;
    return sheet;
  };

  try {
    const createResponseResult = createResponse();
    await createAttendanceSheet({
      body: {
        department: "CE/IT",
        heading: "TECHNICAL EVENT",
        className: "ce4",
        attendanceDate: "2026-07-23",
        eventCoordinatorName: "COORDINATOR"
      }
    }, createResponseResult);

    assert.equal(createResponseResult.statusCode, 201);
    const generatedSheet = createResponseResult.body.data;
    assert.equal(generatedSheet.totalStudents, 45);
    assert.equal(generatedSheet.rowsPerPage, 39);
    assert.equal(generatedSheet.totalPages, 2);
    assert.equal(generatedSheet.students[44].serialNo, 45);
    assert.ok(generatedSheet.students.every((student) => student.signature === ""));

    currentStudents.push({
      enrollmentNo: "24SE02CE046",
      studentName: "STUDENT 046",
      department: "CE/IT",
      className: "CE4",
      isActive: true
    });

    const updateResponseResult = createResponse();
    await updateAttendanceSheet({
      params: {
        id: String(generatedSheet._id)
      },
      body: {
        heading: "UPDATED EVENT",
        refreshStudents: true
      }
    }, updateResponseResult);

    assert.equal(updateResponseResult.statusCode, 200);
    assert.equal(generatedSheet.students.length, 45);

    const originalSheetId = generatedSheet.sheetId;
    const originalAttendanceDate = generatedSheet.attendanceDate;
    const originalCoordinator = generatedSheet.eventCoordinatorName;
    const regenerateResponseResult = createResponse();
    await regenerateAttendanceSheet({
      params: {
        id: String(generatedSheet._id)
      }
    }, regenerateResponseResult);

    assert.equal(regenerateResponseResult.statusCode, 200);
    assert.equal(generatedSheet.students.length, 46);
    assert.equal(generatedSheet.students[45].serialNo, 46);
    assert.equal(generatedSheet.sheetId, originalSheetId);
    assert.equal(generatedSheet.heading, "UPDATED EVENT");
    assert.equal(generatedSheet.attendanceDate, originalAttendanceDate);
    assert.equal(generatedSheet.eventCoordinatorName, originalCoordinator);

    const duplicateResponseResult = createResponse();
    await duplicateAttendanceSheet({
      params: {
        id: String(generatedSheet._id)
      }
    }, duplicateResponseResult);

    assert.equal(duplicateResponseResult.statusCode, 201);
    const duplicatedSheet = duplicateResponseResult.body.data;
    assert.equal(duplicatedSheet.status, "Draft");
    assert.notEqual(duplicatedSheet.sheetId, generatedSheet.sheetId);
    assert.equal(duplicatedSheet.students.length, 46);
    assert.ok(duplicatedSheet.students.every((student) => student.signature === ""));
  } finally {
    AttendanceStudent.find = originalStudentFind;
    AttendanceSheet.create = originalSheetCreate;
    AttendanceSheet.findById = originalSheetFindById;
    AttendanceSheet.findOne = originalSheetFindOne;
    mongoose.connection.readyState = originalReadyState;
  }
});

test("attendance sheet schema allows an empty draft but rejects an empty generated sheet", async () => {
  const commonData = {
    sheetId: "ATT-2026-9999",
    department: "CE/IT",
    heading: "EVENT",
    className: "CE4",
    attendanceDate: "2026-07-23",
    eventCoordinatorName: "COORDINATOR",
    students: [],
    totalStudents: 0,
    rowsPerPage: 39,
    totalPages: 0
  };
  const draft = new AttendanceSheet({
    ...commonData,
    status: "Draft"
  });
  const generated = new AttendanceSheet({
    ...commonData,
    sheetId: "ATT-2026-9998",
    status: "Generated"
  });

  await draft.validate();
  await assert.rejects(
    generated.validate(),
    /generated attendance sheet must contain students/i
  );
});
