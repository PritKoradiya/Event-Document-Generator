import { getStudents } from "./attendanceStudentApi.js";
import { toApiDate } from "../utils/attendanceErrorUtils.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const LOCAL_SHEETS_KEY = "attendance_sheets_records";

const getLocalSheets = () => {
  try {
    const raw = localStorage.getItem(LOCAL_SHEETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalSheets = (sheets) => {
  try {
    localStorage.setItem(LOCAL_SHEETS_KEY, JSON.stringify(sheets));
  } catch (e) {
    console.error("Failed to save attendance sheets to localStorage", e);
  }
};

const normalizeSheetResponse = (data) => {
  if (!data) return null;
  const sheet = data.data || data;
  if (!sheet || typeof sheet !== "object") return sheet;

  const studentsSnapshot = Array.isArray(sheet.studentsSnapshot)
    ? sheet.studentsSnapshot
    : Array.isArray(sheet.students)
    ? sheet.students
    : [];

  return {
    ...sheet,
    id: sheet.id || sheet._id,
    eventHeading: sheet.eventHeading || sheet.heading || "",
    heading: sheet.eventHeading || sheet.heading || "",
    eventDate: sheet.eventDate || sheet.attendanceDate || sheet.date || "",
    date: sheet.eventDate || sheet.attendanceDate || sheet.date || "",
    coordinatorName: sheet.coordinatorName || sheet.eventCoordinatorName || "",
    eventCoordinatorName: sheet.coordinatorName || sheet.eventCoordinatorName || "",
    students: studentsSnapshot,
    studentsSnapshot,
    studentCount: sheet.studentCount ?? studentsSnapshot.length,
    pageCount: sheet.pageCount ?? (Math.ceil(studentsSnapshot.length / 39) || 1)
  };
};

export const getAttendanceSheets = async (params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/attendance-sheets${query ? `?${query}` : ""}`);
    if (response.ok) {
      const res = await response.json();
      const list = (res.data || res || []).map(normalizeSheetResponse);
      return { success: true, data: list, total: list.length };
    }
  } catch (e) {
    // Fallback to localStorage
  }

  let list = getLocalSheets().map(normalizeSheetResponse);
  if (params.department && params.department !== "All") {
    list = list.filter((s) => (s.department || "").toLowerCase() === params.department.toLowerCase());
  }
  if (params.className && params.className !== "All") {
    list = list.filter((s) => (s.className || "").toLowerCase() === params.className.toLowerCase());
  }
  if (params.status && params.status !== "All") {
    list = list.filter((s) => (s.status || "").toLowerCase() === params.status.toLowerCase());
  }

  return { success: true, data: list, total: list.length };
};

export const getAttendanceSheetById = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance-sheets/${id}`);
    if (response.ok) {
      const res = await response.json();
      return { success: true, data: normalizeSheetResponse(res.data || res) };
    }
  } catch (e) {
    // Fallback
  }

  const list = getLocalSheets().map(normalizeSheetResponse);
  const found = list.find((s) => s.id === id || s._id === id);
  if (!found) {
    throw new Error("Attendance sheet record not found.");
  }
  return { success: true, data: found };
};

export const createAttendanceSheet = async (sheetData) => {
  const payload = {
    department: sheetData.department,
    className: sheetData.className,
    eventHeading: (sheetData.eventHeading || sheetData.heading || "").trim(),
    heading: (sheetData.eventHeading || sheetData.heading || "").trim(),
    eventDate: toApiDate(sheetData.eventDate || sheetData.date),
    date: toApiDate(sheetData.eventDate || sheetData.date),
    coordinatorName: (sheetData.coordinatorName || sheetData.eventCoordinatorName || "").trim(),
    eventCoordinatorName: (sheetData.coordinatorName || sheetData.eventCoordinatorName || "").trim(),
    students: sheetData.students || sheetData.studentsSnapshot || []
  };

  try {
    const response = await fetch(`${API_BASE_URL}/attendance-sheets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      const res = await response.json();
      const normalized = normalizeSheetResponse(res.data || res);
      return { success: true, data: normalized, message: "Attendance sheet generated successfully." };
    }
  } catch (e) {
    // Fallback
  }

  const list = getLocalSheets();
  const students = payload.students;
  const studentCount = students.length;
  const pageCount = Math.ceil(studentCount / 39) || 1;

  const newSheet = {
    id: `att_sheet_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    schoolName: "School of Engineering, PPSU",
    department: payload.department,
    className: payload.className,
    eventHeading: payload.eventHeading,
    heading: payload.eventHeading,
    eventDate: payload.eventDate,
    date: payload.eventDate,
    coordinatorName: payload.coordinatorName,
    eventCoordinatorName: payload.coordinatorName,
    students,
    studentsSnapshot: students,
    studentCount,
    pageCount,
    status: "Generated",
    createdAt: new Date().toISOString()
  };

  list.unshift(newSheet);
  saveLocalSheets(list);
  return { success: true, data: normalizeSheetResponse(newSheet), message: "Attendance sheet generated successfully." };
};

export const saveAttendanceDraft = async (sheetData) => {
  const payload = {
    department: sheetData.department || "",
    className: sheetData.className || "",
    eventHeading: (sheetData.eventHeading || sheetData.heading || "").trim(),
    heading: (sheetData.eventHeading || sheetData.heading || "").trim(),
    eventDate: toApiDate(sheetData.eventDate || sheetData.date),
    date: toApiDate(sheetData.eventDate || sheetData.date),
    coordinatorName: (sheetData.coordinatorName || sheetData.eventCoordinatorName || "").trim(),
    eventCoordinatorName: (sheetData.coordinatorName || sheetData.eventCoordinatorName || "").trim(),
    students: sheetData.students || sheetData.studentsSnapshot || [],
    status: "Draft"
  };

  try {
    const response = await fetch(`${API_BASE_URL}/attendance-sheets/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      const res = await response.json();
      const normalized = normalizeSheetResponse(res.data || res);
      return { success: true, data: normalized, message: "Draft attendance sheet saved." };
    }
  } catch (e) {
    // Fallback
  }

  const list = getLocalSheets();
  const students = payload.students;
  const studentCount = students.length;
  const pageCount = Math.ceil(studentCount / 39) || 1;

  const draftSheet = {
    id: `att_draft_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    schoolName: "School of Engineering, PPSU",
    department: payload.department,
    className: payload.className,
    eventHeading: payload.eventHeading,
    heading: payload.eventHeading,
    eventDate: payload.eventDate,
    date: payload.eventDate,
    coordinatorName: payload.coordinatorName,
    eventCoordinatorName: payload.coordinatorName,
    students,
    studentsSnapshot: students,
    studentCount,
    pageCount,
    status: "Draft",
    createdAt: new Date().toISOString()
  };

  list.unshift(draftSheet);
  saveLocalSheets(list);
  return { success: true, data: normalizeSheetResponse(draftSheet), message: "Draft attendance sheet saved." };
};

export const saveDraftAttendanceSheet = saveAttendanceDraft;

export const regenerateAttendanceSheet = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance-sheets/${id}/regenerate`, {
      method: "POST"
    });
    if (response.ok) {
      const res = await response.json();
      return { success: true, data: normalizeSheetResponse(res.data || res), message: "Attendance sheet regenerated with current active student roster." };
    }
  } catch (e) {
    // Fallback
  }

  const list = getLocalSheets();
  const index = list.findIndex((s) => s.id === id || s._id === id);
  if (index === -1) {
    throw new Error("Attendance sheet record not found.");
  }

  const currentSheet = list[index];
  const activeStudentsRes = await getStudents({
    department: currentSheet.department,
    className: currentSheet.className
  });
  const activeStudents = activeStudentsRes.data || [];

  const studentCount = activeStudents.length;
  const pageCount = Math.ceil(studentCount / 39) || 1;

  list[index] = {
    ...currentSheet,
    students: activeStudents,
    studentsSnapshot: activeStudents,
    studentCount,
    pageCount,
    updatedAt: new Date().toISOString()
  };

  saveLocalSheets(list);
  return {
    success: true,
    data: normalizeSheetResponse(list[index]),
    message: "Attendance sheet regenerated with current active student roster."
  };
};

export const duplicateAttendanceSheet = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance-sheets/${id}/duplicate`, {
      method: "POST"
    });
    if (response.ok) {
      const res = await response.json();
      return { success: true, data: normalizeSheetResponse(res.data || res), message: "Attendance sheet duplicated as draft." };
    }
  } catch (e) {
    // Fallback
  }

  const list = getLocalSheets();
  const original = list.find((s) => s.id === id || s._id === id);
  if (!original) {
    throw new Error("Attendance sheet record not found.");
  }

  const duplicateSheet = {
    ...original,
    id: `att_sheet_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    eventHeading: `${original.eventHeading || original.heading || "Event"} (Copy)`,
    heading: `${original.eventHeading || original.heading || "Event"} (Copy)`,
    status: "Draft",
    createdAt: new Date().toISOString()
  };

  list.unshift(duplicateSheet);
  saveLocalSheets(list);
  return {
    success: true,
    data: normalizeSheetResponse(duplicateSheet),
    message: "Attendance sheet duplicated as draft."
  };
};

export const updateAttendanceSheet = async (id, sheetData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance-sheets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sheetData)
    });
    if (response.ok) {
      const res = await response.json();
      return { success: true, data: normalizeSheetResponse(res.data || res), message: "Attendance sheet updated." };
    }
  } catch (e) {
    // Fallback
  }

  const list = getLocalSheets();
  const index = list.findIndex((s) => s.id === id || s._id === id);
  if (index === -1) {
    throw new Error("Attendance sheet not found.");
  }

  const students = sheetData.students || sheetData.studentsSnapshot || list[index].studentsSnapshot || [];
  const studentCount = students.length;
  const pageCount = Math.ceil(studentCount / 39) || 1;

  list[index] = {
    ...list[index],
    ...sheetData,
    students,
    studentsSnapshot: students,
    studentCount,
    pageCount,
    updatedAt: new Date().toISOString()
  };

  saveLocalSheets(list);
  return { success: true, data: normalizeSheetResponse(list[index]), message: "Attendance sheet updated." };
};

export const deleteAttendanceSheet = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance-sheets/${id}`, {
      method: "DELETE"
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // Fallback
  }

  const list = getLocalSheets().filter((s) => s.id !== id && s._id !== id);
  saveLocalSheets(list);
  return { success: true, message: "Attendance sheet record deleted." };
};
