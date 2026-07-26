/**
 * Error handling & formatting utilities for Attendance Module
 */

export const getReadableAttendanceError = (error) => {
  if (!error) return "";
  const msg = typeof error === "string" ? error : error.message || "";

  if (msg.includes("createAttendanceSheet is not defined") || msg.includes("ReferenceError")) {
    return "Unable to generate the attendance sheet. Please try again.";
  }
  if (msg.includes("already exists") && msg.toLowerCase().includes("department")) {
    return "This department already exists.";
  }
  if (msg.includes("already exists") && msg.toLowerCase().includes("class")) {
    return "This class already exists in the selected department.";
  }
  if (msg.includes("does not belong")) {
    return "The selected class does not belong to this department.";
  }
  if (msg.includes("No students") || msg.includes("no students")) {
    return "No students were found for the selected department and class.";
  }
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("Network")) {
    return "Unable to load departments and classes.";
  }
  if (msg.includes("Failed to generate") || msg.includes("Cannot export")) {
    return "Unable to generate the attendance sheet.";
  }

  return msg || "An unexpected error occurred. Please try again.";
};

/**
 * Format clean department name without malformed hyphens (e.g. "- CSE" -> "CSE")
 */
export const getCleanDepartmentLabel = (d) => {
  if (!d) return "";
  if (typeof d === "string") {
    return d.replace(/^[-_\s]+/, "").trim();
  }
  const code = (d.code || "").replace(/^[-_\s]+/, "").trim();
  const name = (d.name || "").replace(/^[-_\s]+/, "").trim();
  const displayName = (d.displayName || "").replace(/^[-_\s]+/, "").trim();

  if (code && name && code.toUpperCase() !== name.toUpperCase() && !name.startsWith("-")) {
    return `${code} - ${name}`;
  }
  return code || name || displayName || "";
};

/**
 * Date formatting helpers for HTML inputs vs backend API / PDF display
 */
export const toInputDate = (val) => {
  if (!val) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
    const [dd, mm, yyyy] = val.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return "";
};

export const toDisplayDate = (val) => {
  if (!val) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [yyyy, mm, dd] = val.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy}`;
  }
  return String(val);
};

export const toApiDate = (val) => {
  return toDisplayDate(val) || val;
};
