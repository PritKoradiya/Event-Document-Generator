import { ATTENDANCE_LAYOUT, ATTENDANCE_TYPOGRAPHY } from "../config/attendanceSheetLayout.js";

/**
 * Converts PDF font size points to SVG user units (mm for A4 210x297 viewBox).
 * 1 point = 25.4 / 72 mm ≈ 0.352778 mm.
 */
export const ptToSvgUnit = (points) => points * 0.352778;

/**
 * Resolves single-source-of-truth deterministic metrics for Attendance Sheet layout.
 * Every page (Page 1, middle pages, and final partial page) uses the EXACT SAME
 * fixed row height (5.65mm) and geometry. No adaptive stretching or vertical offsets.
 */
export const resolveAttendancePageMetrics = ({ rowsOnPage = 39, isLastPage = false }) => {
  const safeRows = Math.max(1, Math.min(39, rowsOnPage || 1));

  const tableX = ATTENDANCE_LAYOUT.tableX; // 12 mm
  const tableWidth = ATTENDANCE_LAYOUT.tableWidth; // 186 mm

  const schoolY = ATTENDANCE_LAYOUT.schoolY; // 14.5 mm
  const departmentY = ATTENDANCE_LAYOUT.departmentY; // 21.0 mm
  const headingY = ATTENDANCE_LAYOUT.headingY; // 27.5 mm
  const documentTitleY = ATTENDANCE_LAYOUT.documentTitleY; // 34.0 mm
  const classDateY = ATTENDANCE_LAYOUT.classDateY; // 42.5 mm

  const tableY = ATTENDANCE_LAYOUT.tableY; // 47.0 mm
  const tableHeaderHeight = ATTENDANCE_LAYOUT.tableHeaderHeight; // 8.5 mm
  const studentRowsY = ATTENDANCE_LAYOUT.studentRowsY; // 55.5 mm

  // FIXED row height for all pages
  const rowHeight = ATTENDANCE_LAYOUT.studentRowHeight; // 5.65 mm

  const tableBottomY = studentRowsY + safeRows * rowHeight;
  const coordinatorY = tableBottomY + ATTENDANCE_LAYOUT.coordinatorGap; // 12.0 mm gap below final table

  return {
    tableX,
    tableWidth,
    schoolY,
    departmentY,
    headingY,
    documentTitleY,
    classDateY,
    tableY,
    tableHeaderHeight,
    studentRowsY,
    rowHeight,
    tableBottomY: Number(tableBottomY.toFixed(2)),
    coordinatorY: Number(coordinatorY.toFixed(2)),
    serialFontSize: ATTENDANCE_TYPOGRAPHY.student.size, // 10.5 pt
    enrollmentFontSize: ATTENDANCE_TYPOGRAPHY.student.size, // 10.5 pt
    studentNameFontSize: ATTENDANCE_TYPOGRAPHY.student.size, // 10.5 pt
    columnHeaderFontSize: ATTENDANCE_TYPOGRAPHY.tableHeader.size // 10.5 pt
  };
};

export default resolveAttendancePageMetrics;
