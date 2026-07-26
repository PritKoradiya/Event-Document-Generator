import "dotenv/config";

const baseUrl = (
  process.env.ATTENDANCE_TEST_BASE_URL || "http://localhost:5000"
).replace(/\/$/, "");

const requestApi = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.message || `Request failed with status ${response.status}`);
  }

  return body;
};

const runAttendanceFlow = async () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The attendance development flow cannot run in production.");
  }

  let createdDepartmentId;
  let createdClassId;
  let createdStudentId;
  let createdSheetId;

  try {
    let options = await requestApi("/api/attendance-options");
    let department = options.data.departments.find(({ name }) => name === "CSE");

    if (!department) {
      const result = await requestApi("/api/attendance-options/departments", {
        method: "POST",
        body: JSON.stringify({
          name: "CSE",
          displayName: "Computer Science and Engineering",
          description: "Created by the attendance development flow"
        })
      });
      department = result.data;
      createdDepartmentId = result.data._id;
    }

    if (department.isActive === false) {
      throw new Error("CSE exists but is inactive. Activate it before running this flow.");
    }

    options = await requestApi("/api/attendance-options");
    department = options.data.departments.find(({ name }) => name === "CSE");
    let attendanceClass = department?.classes.find(({ className }) => {
      return className === "CSE1";
    });

    if (!attendanceClass) {
      const result = await requestApi("/api/attendance-options/classes", {
        method: "POST",
        body: JSON.stringify({
          department: "CSE",
          className: "CSE1",
          displayName: "CSE1",
          description: "Created by the attendance development flow"
        })
      });
      attendanceClass = result.data;
      createdClassId = result.data._id;
    }

    if (attendanceClass.isActive === false) {
      throw new Error("CSE1 exists but is inactive. Activate it before running this flow.");
    }

    const enrollmentNo = `DEVTEST${Date.now()}`;
    const studentResult = await requestApi("/api/attendance-students", {
      method: "POST",
      body: JSON.stringify({
        enrollmentNo,
        studentName: "ATTENDANCE FLOW TEST STUDENT",
        department: "CSE",
        className: "CSE1"
      })
    });
    createdStudentId = studentResult.data._id;

    options = await requestApi("/api/attendance-options");

    if (!options.data.departments.some(({ name }) => name === "CSE")) {
      throw new Error("CSE was not returned by the attendance options API.");
    }

    const roster = await requestApi(
      `/api/attendance-students?department=CSE&className=CSE1&search=${enrollmentNo}`
    );

    if (roster.count !== 1) {
      throw new Error(`Expected one test student but found ${roster.count}.`);
    }

    const completeRoster = await requestApi(
      "/api/attendance-students?department=CSE&className=CSE1"
    );
    const sheetResult = await requestApi("/api/attendance-sheets", {
      method: "POST",
      body: JSON.stringify({
        department: "CSE",
        className: "CSE1",
        eventHeading: "Attendance Development Flow",
        eventDate: new Date().toISOString().slice(0, 10),
        coordinatorName: "Development Test Coordinator"
      })
    });
    createdSheetId = sheetResult.data._id;

    if (sheetResult.data.studentsSnapshot.length !== completeRoster.count) {
      throw new Error(
        `Expected ${completeRoster.count} snapshot student(s) but found ${sheetResult.data.studentsSnapshot.length}.`
      );
    }

    console.log("Attendance development flow passed successfully.");
  } finally {
    if (createdSheetId) {
      await requestApi(`/api/attendance-sheets/${createdSheetId}`, {
        method: "DELETE"
      }).catch((error) => {
        console.error(`Unable to remove the test attendance sheet: ${error.message}`);
        process.exitCode = 1;
      });
    }

    if (createdStudentId) {
      await requestApi(`/api/attendance-students/${createdStudentId}`, {
        method: "DELETE"
      }).catch((error) => {
        console.error(`Unable to remove the test student: ${error.message}`);
        process.exitCode = 1;
      });
    }

    if (createdClassId) {
      await requestApi(`/api/attendance-options/classes/${createdClassId}`, {
        method: "DELETE"
      }).catch((error) => {
        console.error(`Unable to remove the test class: ${error.message}`);
        process.exitCode = 1;
      });
    }

    if (createdDepartmentId) {
      await requestApi(
        `/api/attendance-options/departments/${createdDepartmentId}`,
        {
          method: "DELETE"
        }
      ).catch((error) => {
        console.error(`Unable to remove the test department: ${error.message}`);
        process.exitCode = 1;
      });
    }
  }
};

runAttendanceFlow().catch((error) => {
  console.error(`Attendance development flow failed: ${error.message}`);
  process.exitCode = 1;
});
