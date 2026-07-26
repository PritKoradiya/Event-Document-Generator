import mongoose from "mongoose";

const isRequiredForGeneratedSheet = function () {
  return this.status !== "Draft";
};

const isRequiredWhenLegacyFieldIsMissing = (legacyField) => {
  return function () {
    return this.status !== "Draft" && !this[legacyField];
  };
};

const attendanceSheetStudentSchema = new mongoose.Schema(
  {
    serialNo: Number,
    enrollmentNo: String,
    studentName: String,
    signature: {
      type: String,
      default: ""
    }
  },
  {
    _id: false
  }
);

const attendanceSheetSchema = new mongoose.Schema(
  {
    sheetId: {
      type: String,
      required: true,
      unique: true
    },
    schoolName: {
      type: String,
      default: "School of Engineering, PPSU"
    },
    department: {
      type: String,
      required: isRequiredForGeneratedSheet,
      trim: true,
      uppercase: true
    },
    eventHeading: {
      type: String,
      required: isRequiredWhenLegacyFieldIsMissing("heading"),
      trim: true
    },
    className: {
      type: String,
      required: isRequiredForGeneratedSheet,
      trim: true,
      uppercase: true
    },
    eventDate: {
      type: String,
      required: isRequiredWhenLegacyFieldIsMissing("attendanceDate"),
      trim: true
    },
    coordinatorName: {
      type: String,
      required: isRequiredWhenLegacyFieldIsMissing("eventCoordinatorName"),
      trim: true
    },
    documentTitle: {
      type: String,
      default: "Attendance Sheet"
    },
    studentsSnapshot: {
      type: [attendanceSheetStudentSchema],
      default: undefined,
      validate: [
        {
          validator: (students) => students.every((student, index) => {
            return student.serialNo === index + 1;
          }),
          message: "Student serial numbers must be continuous."
        },
        {
          validator: (students) => students.every((student) => {
            return !student.signature;
          }),
          message: "Student signatures must remain blank."
        }
      ]
    },
    // Legacy fields remain readable so old saved records are never migrated or altered implicitly.
    heading: {
      type: String,
      trim: true
    },
    attendanceDate: {
      type: String,
      trim: true
    },
    eventCoordinatorName: {
      type: String,
      trim: true
    },
    students: {
      type: [attendanceSheetStudentSchema],
      default: undefined
    },
    totalStudents: {
      type: Number,
      default: 0
    },
    rowsPerPage: {
      type: Number,
      default: 39,
      enum: [39]
    },
    totalPages: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ["Draft", "Generated"],
      default: "Generated"
    }
  },
  {
    timestamps: true
  }
);

attendanceSheetSchema.pre("validate", function () {
  const snapshot = this.studentsSnapshot?.length
    ? this.studentsSnapshot
    : this.students;

  if (this.status !== "Draft" && (!snapshot || snapshot.length === 0)) {
    this.invalidate(
      "studentsSnapshot",
      "A generated attendance sheet must contain students."
    );
  }
});

const AttendanceSheet = mongoose.model("AttendanceSheet", attendanceSheetSchema);

export default AttendanceSheet;
