import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { validateEnvironment } from "../config/env.js";
import AttendanceClass from "../models/AttendanceClass.js";
import AttendanceDepartment from "../models/AttendanceDepartment.js";

const defaultOptions = [
  {
    name: "CE/IT",
    displayName: "CE/IT",
    classes: ["CE1", "CE2", "CE3", "CE4"]
  },
  {
    name: "CSE",
    displayName: "Computer Science and Engineering",
    classes: ["CSE1", "CSE2", "CSE3", "CSE4"]
  },
  {
    name: "AIML",
    displayName: "Artificial Intelligence and Machine Learning",
    classes: ["AIML1", "AIML2", "AIML3", "AIML4"]
  }
];

const seedAttendanceOptions = async () => {
  let insertedDepartmentCount = 0;
  let insertedClassCount = 0;

  try {
    validateEnvironment();
    await connectDB();

    for (const option of defaultOptions) {
      const departmentResult = await AttendanceDepartment.updateOne(
        {
          name: option.name
        },
        {
          $setOnInsert: {
            name: option.name,
            displayName: option.displayName,
            description: "",
            isActive: true
          }
        },
        {
          upsert: true
        }
      );

      insertedDepartmentCount += departmentResult.upsertedCount || 0;

      for (const className of option.classes) {
        const classResult = await AttendanceClass.updateOne(
          {
            department: option.name,
            className
          },
          {
            $setOnInsert: {
              department: option.name,
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

        insertedClassCount += classResult.upsertedCount || 0;
      }
    }

    console.log(
      `Attendance options seeded successfully: ${insertedDepartmentCount} department(s), ${insertedClassCount} class(es) inserted.`
    );
  } catch (error) {
    console.error(`Attendance option seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
};

seedAttendanceOptions();
