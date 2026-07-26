import mongoose from "mongoose";
import {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_OPTION_NAME_LENGTH,
  normalizeClassName,
  normalizeDepartmentName,
  normalizeDisplayName
} from "../utils/attendanceOptionUtils.js";

const attendanceClassSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: MAX_OPTION_NAME_LENGTH,
      set: normalizeDepartmentName
    },
    className: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: MAX_OPTION_NAME_LENGTH,
      set: normalizeClassName
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

attendanceClassSchema.index(
  {
    department: 1,
    className: 1
  },
  {
    unique: true
  }
);

const AttendanceClass = mongoose.model("AttendanceClass", attendanceClassSchema);

export default AttendanceClass;
