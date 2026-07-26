import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import {
  bulkDeleteStudents,
  deleteStudent,
  deleteStudentsByClass,
  getStudentFilterSummary
} from "../src/controllers/attendanceStudentController.js";
import AttendanceClass from "../src/models/AttendanceClass.js";
import AttendanceDepartment from "../src/models/AttendanceDepartment.js";
import AttendanceSheet from "../src/models/AttendanceSheet.js";
import AttendanceStudent from "../src/models/AttendanceStudent.js";

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

test("bulk deletion removes three selected students and reports accurate counts", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalFind = AttendanceStudent.find;
  const originalDeleteMany = AttendanceStudent.deleteMany;
  const studentIds = Array.from({ length: 3 }, () => new mongoose.Types.ObjectId().toString());
  let deleteFilters;

  mongoose.connection.readyState = 1;
  AttendanceStudent.find = (filters) => ({
    select: async () => filters._id.$in.map((_id) => ({ _id }))
  });
  AttendanceStudent.deleteMany = async (filters) => {
    deleteFilters = filters;
    return { deletedCount: 3 };
  };

  try {
    const response = createResponse();
    await bulkDeleteStudents({
      body: {
        studentIds
      }
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.deepEqual(response.body.data, {
      requestedCount: 3,
      matchedCount: 3,
      deletedCount: 3,
      missingIds: []
    });
    assert.deepEqual(deleteFilters._id.$in, studentIds);
  } finally {
    AttendanceStudent.find = originalFind;
    AttendanceStudent.deleteMany = originalDeleteMany;
    mongoose.connection.readyState = originalReadyState;
  }
});

test("bulk deletion deduplicates IDs and reports a missing student", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalFind = AttendanceStudent.find;
  const originalDeleteMany = AttendanceStudent.deleteMany;
  const existingId = new mongoose.Types.ObjectId().toString();
  const missingId = new mongoose.Types.ObjectId().toString();

  mongoose.connection.readyState = 1;
  AttendanceStudent.find = () => ({
    select: async () => [{ _id: existingId }]
  });
  AttendanceStudent.deleteMany = async () => ({ deletedCount: 1 });

  try {
    const response = createResponse();
    await bulkDeleteStudents({
      body: {
        studentIds: [existingId, existingId, missingId]
      }
    }, response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body.data, {
      requestedCount: 2,
      matchedCount: 1,
      deletedCount: 1,
      missingIds: [missingId]
    });
  } finally {
    AttendanceStudent.find = originalFind;
    AttendanceStudent.deleteMany = originalDeleteMany;
    mongoose.connection.readyState = originalReadyState;
  }
});

test("bulk deletion rejects invalid, empty, and oversized selections before database changes", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalFind = AttendanceStudent.find;
  const originalDeleteMany = AttendanceStudent.deleteMany;
  const validId = new mongoose.Types.ObjectId().toString();
  let databaseCalls = 0;

  mongoose.connection.readyState = 1;
  AttendanceStudent.find = () => {
    databaseCalls += 1;
    throw new Error("find must not run");
  };
  AttendanceStudent.deleteMany = async () => {
    databaseCalls += 1;
    throw new Error("deleteMany must not run");
  };

  try {
    const invalidResponse = createResponse();
    await bulkDeleteStudents({
      body: {
        studentIds: [validId, "not-a-mongodb-id"]
      }
    }, invalidResponse);

    assert.equal(invalidResponse.statusCode, 400);
    assert.deepEqual(invalidResponse.body.data.invalidIds, ["not-a-mongodb-id"]);

    const emptyResponse = createResponse();
    await bulkDeleteStudents({
      body: {
        studentIds: []
      }
    }, emptyResponse);

    assert.equal(emptyResponse.statusCode, 400);
    assert.match(emptyResponse.body.message, /at least one/i);

    const oversizedResponse = createResponse();
    await bulkDeleteStudents({
      body: {
        studentIds: Array.from({ length: 501 }, () => validId)
      }
    }, oversizedResponse);

    assert.equal(oversizedResponse.statusCode, 400);
    assert.match(oversizedResponse.body.message, /maximum of 500/i);
    assert.equal(databaseCalls, 0);
  } finally {
    AttendanceStudent.find = originalFind;
    AttendanceStudent.deleteMany = originalDeleteMany;
    mongoose.connection.readyState = originalReadyState;
  }
});

test("bulk deletion returns a clear error when no selected students match", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalFind = AttendanceStudent.find;
  const originalDeleteMany = AttendanceStudent.deleteMany;
  let deleteCalled = false;

  mongoose.connection.readyState = 1;
  AttendanceStudent.find = () => ({
    select: async () => []
  });
  AttendanceStudent.deleteMany = async () => {
    deleteCalled = true;
    return { deletedCount: 0 };
  };

  try {
    const response = createResponse();
    await bulkDeleteStudents({
      body: {
        studentIds: [new mongoose.Types.ObjectId().toString()]
      }
    }, response);

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.message, "No matching students were found");
    assert.equal(deleteCalled, false);
  } finally {
    AttendanceStudent.find = originalFind;
    AttendanceStudent.deleteMany = originalDeleteMany;
    mongoose.connection.readyState = originalReadyState;
  }
});

test("confirmed class deletion removes only the exact roster and preserves sheet snapshots", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalCountDocuments = AttendanceStudent.countDocuments;
  const originalDeleteMany = AttendanceStudent.deleteMany;
  const originalSheetUpdateMany = AttendanceSheet.updateMany;
  const storedSnapshot = {
    students: [
      {
        enrollmentNo: "24SE02CE001",
        studentName: "STUDENT ONE"
      }
    ]
  };
  const snapshotBeforeDeletion = structuredClone(storedSnapshot);
  let receivedCountFilters;
  let receivedDeleteFilters;
  let sheetUpdateCalled = false;

  mongoose.connection.readyState = 1;
  AttendanceStudent.countDocuments = async (filters) => {
    receivedCountFilters = filters;
    return 45;
  };
  AttendanceStudent.deleteMany = async (filters) => {
    receivedDeleteFilters = filters;
    return { deletedCount: 45 };
  };
  AttendanceSheet.updateMany = async () => {
    sheetUpdateCalled = true;
  };

  try {
    const response = createResponse();
    await deleteStudentsByClass({
      body: {
        department: "CE/IT",
        className: "ce4",
        confirmationText: "DELETE CE/IT CE4"
      }
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(
      response.body.message,
      "All students from CE/IT - CE4 deleted successfully"
    );
    assert.deepEqual(response.body.data, {
      department: "CE/IT",
      className: "CE4",
      deletedCount: 45
    });
    assert.equal(receivedCountFilters.department.source, "^CE\\/IT$");
    assert.equal(receivedCountFilters.className.source, "^CE4$");
    assert.deepEqual(receivedDeleteFilters, receivedCountFilters);
    assert.equal(sheetUpdateCalled, false);
    assert.deepEqual(storedSnapshot, snapshotBeforeDeletion);
  } finally {
    AttendanceStudent.countDocuments = originalCountDocuments;
    AttendanceStudent.deleteMany = originalDeleteMany;
    AttendanceSheet.updateMany = originalSheetUpdateMany;
    mongoose.connection.readyState = originalReadyState;
  }
});

test("class deletion rejects incorrect confirmation and department-only requests", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalCountDocuments = AttendanceStudent.countDocuments;
  const originalDeleteMany = AttendanceStudent.deleteMany;
  let databaseCalls = 0;

  mongoose.connection.readyState = 1;
  AttendanceStudent.countDocuments = async () => {
    databaseCalls += 1;
    return 1;
  };
  AttendanceStudent.deleteMany = async () => {
    databaseCalls += 1;
    return { deletedCount: 1 };
  };

  try {
    const incorrectConfirmationResponse = createResponse();
    await deleteStudentsByClass({
      body: {
        department: "CE/IT",
        className: "CE4",
        confirmationText: "DELETE CE4"
      }
    }, incorrectConfirmationResponse);

    assert.equal(incorrectConfirmationResponse.statusCode, 400);
    assert.match(incorrectConfirmationResponse.body.message, /exactly match/i);

    const departmentOnlyResponse = createResponse();
    await deleteStudentsByClass({
      body: {
        department: "CE/IT",
        confirmationText: "DELETE CE/IT"
      }
    }, departmentOnlyResponse);

    assert.equal(departmentOnlyResponse.statusCode, 400);
    assert.match(departmentOnlyResponse.body.message, /class name is required/i);
    assert.equal(databaseCalls, 0);
  } finally {
    AttendanceStudent.countDocuments = originalCountDocuments;
    AttendanceStudent.deleteMany = originalDeleteMany;
    mongoose.connection.readyState = originalReadyState;
  }
});

test("filter summary requires both filters and returns the exact roster count", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalCountDocuments = AttendanceStudent.countDocuments;
  const originalClassExists = AttendanceClass.exists;
  const originalDepartmentExists = AttendanceDepartment.exists;
  let receivedFilters;

  mongoose.connection.readyState = 1;
  AttendanceClass.exists = async () => ({ _id: new mongoose.Types.ObjectId() });
  AttendanceDepartment.exists = async () => ({ _id: new mongoose.Types.ObjectId() });
  AttendanceStudent.countDocuments = async (filters) => {
    receivedFilters = filters;
    return 45;
  };

  try {
    const missingClassResponse = createResponse();
    await getStudentFilterSummary({
      query: {
        department: "CE/IT"
      }
    }, missingClassResponse);

    assert.equal(missingClassResponse.statusCode, 400);

    const summaryResponse = createResponse();
    await getStudentFilterSummary({
      query: {
        department: "CE/IT",
        className: "ce4"
      }
    }, summaryResponse);

    assert.equal(summaryResponse.statusCode, 200);
    assert.equal(receivedFilters.department.source, "^CE\\/IT$");
    assert.equal(receivedFilters.className.source, "^CE4$");
    assert.deepEqual(summaryResponse.body.data, {
      department: "CE/IT",
      className: "CE4",
      totalStudents: 45
    });
  } finally {
    AttendanceStudent.countDocuments = originalCountDocuments;
    AttendanceClass.exists = originalClassExists;
    AttendanceDepartment.exists = originalDepartmentExists;
    mongoose.connection.readyState = originalReadyState;
  }
});

test("single-student deletion remains unchanged", async () => {
  const originalReadyState = mongoose.connection.readyState;
  const originalFindByIdAndDelete = AttendanceStudent.findByIdAndDelete;
  const studentId = new mongoose.Types.ObjectId().toString();
  const storedStudent = {
    _id: studentId,
    enrollmentNo: "24SE02CE001"
  };

  mongoose.connection.readyState = 1;
  AttendanceStudent.findByIdAndDelete = async (id) => {
    assert.equal(id, studentId);
    return storedStudent;
  };

  try {
    const response = createResponse();
    await deleteStudent({
      params: {
        id: studentId
      }
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.message, "Student deleted successfully");
    assert.equal(response.body.data, storedStudent);
  } finally {
    AttendanceStudent.findByIdAndDelete = originalFindByIdAndDelete;
    mongoose.connection.readyState = originalReadyState;
  }
});
