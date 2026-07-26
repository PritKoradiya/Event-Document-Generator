import mongoose from "mongoose";
import {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_OPTION_NAME_LENGTH,
  normalizeDepartmentName,
  normalizeDisplayName
} from "../utils/attendanceOptionUtils.js";

const attendanceDepartmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: MAX_OPTION_NAME_LENGTH,
      set: normalizeDepartmentName
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_DISPLAY_NAME_LENGTH,
      set: normalizeDisplayName
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const AttendanceDepartment = mongoose.model(
  "AttendanceDepartment",
  attendanceDepartmentSchema
);

export default AttendanceDepartment;
