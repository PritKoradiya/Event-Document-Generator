import { jsPDF } from "jspdf";
import { ATTENDANCE_LAYOUT, ATTENDANCE_TYPOGRAPHY } from "../config/attendanceSheetLayout.js";
import { resolveAttendancePageMetrics } from "./resolveAttendancePageMetrics.js";
import { fitPdfTextAndString } from "./attendanceTextLayout.js";
import { validateAttendanceSheetLayout } from "./validateAttendanceSheetLayout.js";

/**
 * Direct Vector Multipage A4 Attendance PDF Generator using jsPDF drawing methods.
 * Uses exact single source of truth deterministic metrics from resolveAttendancePageMetrics.
 * No canvas, no JPEG, no addImage, no html2canvas!
 */
export const downloadAttendanceSheetPdf = async ({ sheet, fileName = "Attendance_Sheet.pdf" }) => {
  if (!sheet) {
    throw new Error("Missing attendance sheet data for PDF export.");
  }

  // Pre-validate layout before generating PDF
  const validation = validateAttendanceSheetLayout(sheet);
  if (!validation.valid) {
    throw new Error(`Cannot export PDF due to layout validation errors: ${validation.errors.join("; ")}`);
  }

  const {
    schoolName = "School of Engineering, PPSU",
    department = "",
    heading = "",
    className = "",
    date = "",
    eventCoordinatorName = "",
    students = []
  } = sheet;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true
  });

  const fontFam = ATTENDANCE_TYPOGRAPHY.fontFamily; // "times"
  const rowsPerPage = ATTENDANCE_LAYOUT.rowsPerPage; // 39

  const formattedDepartment = department
    ? department.toLowerCase().includes("department")
      ? department
      : `${department} Department`
    : "Department";

  // Split students into chunks of 39
  const studentChunks = [];
  if (students.length === 0) {
    studentChunks.push([]);
  } else {
    for (let i = 0; i < students.length; i += rowsPerPage) {
      studentChunks.push(students.slice(i, i + rowsPerPage));
    }
  }

  const totalPages = studentChunks.length;

  studentChunks.forEach((chunk, pageIndex) => {
    if (pageIndex > 0) {
      pdf.addPage("a4", "portrait");
    }

    const isLastPage = pageIndex === totalPages - 1;
    const startSrNo = pageIndex * rowsPerPage + 1;

    // Resolve deterministic metrics for this page
    const metrics = resolveAttendancePageMetrics({
      rowsOnPage: chunk.length,
      isLastPage
    });

    const {
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
      tableBottomY,
      coordinatorY
    } = metrics;

    const colSrW = ATTENDANCE_LAYOUT.columns.serial; // 15
    const colEnrollW = ATTENDANCE_LAYOUT.columns.enrollment; // 43
    const colNameW = ATTENDANCE_LAYOUT.columns.name; // 105
    const colSignW = ATTENDANCE_LAYOUT.columns.sign; // 23

    const xSr = tableX; // 12
    const xEnroll = xSr + colSrW; // 27
    const xName = xEnroll + colEnrollW; // 70
    const xSign = xName + colNameW; // 175
    const xEnd = tableX + tableWidth; // 198

    // --- 1. DRAW REPEATED HEADER ---
    pdf.setFont(fontFam, ATTENDANCE_TYPOGRAPHY.school.weight);
    pdf.setFontSize(ATTENDANCE_TYPOGRAPHY.school.size); // 15pt
    pdf.text("School of Engineering, PPSU", 105, schoolY, { align: "center" });

    pdf.setFont(fontFam, ATTENDANCE_TYPOGRAPHY.department.weight);
    pdf.setFontSize(ATTENDANCE_TYPOGRAPHY.department.size); // 13pt
    pdf.text(formattedDepartment, 105, departmentY, { align: "center" });

    // Fit heading text if long
    const headingFit = fitPdfTextAndString({
      pdf,
      text: heading || "Event Heading",
      preferredSize: ATTENDANCE_TYPOGRAPHY.heading.size, // 12.5pt
      minimumSize: 8.5,
      maxWidth: tableWidth - 10,
      fontStyle: ATTENDANCE_TYPOGRAPHY.heading.weight
    });
    pdf.setFont(fontFam, ATTENDANCE_TYPOGRAPHY.heading.weight);
    pdf.setFontSize(headingFit.fontSize);
    pdf.text(headingFit.text, 105, headingY, { align: "center" });

    pdf.setFont(fontFam, ATTENDANCE_TYPOGRAPHY.documentTitle.weight);
    pdf.setFontSize(ATTENDANCE_TYPOGRAPHY.documentTitle.size); // 12pt
    pdf.text("Attendance Sheet", 105, documentTitleY, { align: "center" });

    // --- 2. CLASS (LEFT) AND DATE (RIGHT) ROW ---
    pdf.setFont(fontFam, ATTENDANCE_TYPOGRAPHY.classDate.weight);
    pdf.setFontSize(ATTENDANCE_TYPOGRAPHY.classDate.size); // 11.5pt
    pdf.text(`Class- ${className || "—"}`, tableX, classDateY, { align: "left" });
    pdf.text(`Date : ${date || "—"}`, xEnd, classDateY, { align: "right" });

    // --- 3. DRAW TABLE HEADERS ---
    const totalTableHeight = tableHeaderHeight + chunk.length * rowHeight;

    // Outer table border (0.5mm)
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(tableX, tableY, tableWidth, totalTableHeight);

    // Column header box (0.35mm inner line)
    pdf.setLineWidth(0.35);
    pdf.rect(tableX, tableY, tableWidth, tableHeaderHeight);

    // Header vertical lines
    pdf.line(xEnroll, tableY, xEnroll, tableY + tableHeaderHeight);
    pdf.line(xName, tableY, xName, tableY + tableHeaderHeight);
    pdf.line(xSign, tableY, xSign, tableY + tableHeaderHeight);

    const headerBaselineY = tableY + 5.6;
    pdf.setFont(fontFam, ATTENDANCE_TYPOGRAPHY.tableHeader.weight);
    pdf.setFontSize(ATTENDANCE_TYPOGRAPHY.tableHeader.size); // 10.5pt

    pdf.text("Sr. No.", xSr + colSrW / 2, headerBaselineY, { align: "center" });
    pdf.text("Enrollment No.", xEnroll + colEnrollW / 2, headerBaselineY, { align: "center" });
    pdf.text("Name", xName + colNameW / 2, headerBaselineY, { align: "center" });
    pdf.text("Sign", xSign + colSignW / 2, headerBaselineY, { align: "center" });

    // --- 4. DRAW STUDENT ROWS ---
    pdf.setFont(fontFam, "normal");
    pdf.setLineWidth(0.35);

    chunk.forEach((student, idx) => {
      const rowTopY = studentRowsY + idx * rowHeight;
      const baselineY = rowTopY + rowHeight * 0.68;
      const srNo = String(startSrNo + idx);
      const enrollNo = (student.enrollmentNo || "").toUpperCase();
      const rawName = (student.studentName || "").toUpperCase();

      // Horizontal line for row bottom
      pdf.line(tableX, rowTopY + rowHeight, xEnd, rowTopY + rowHeight);

      // Vertical lines for row
      pdf.line(xEnroll, rowTopY, xEnroll, rowTopY + rowHeight);
      pdf.line(xName, rowTopY, xName, rowTopY + rowHeight);
      pdf.line(xSign, rowTopY, xSign, rowTopY + rowHeight);

      // Sr. No.
      pdf.setFont(fontFam, "normal");
      pdf.setFontSize(ATTENDANCE_TYPOGRAPHY.student.size);
      pdf.text(srNo, xSr + colSrW / 2, baselineY, { align: "center" });

      // Enrollment No. (Left aligned with 2.5mm padding)
      const enrollFit = fitPdfTextAndString({
        pdf,
        text: enrollNo,
        preferredSize: ATTENDANCE_TYPOGRAPHY.student.size,
        minimumSize: 8.5,
        maxWidth: colEnrollW - 5,
        fontStyle: "normal"
      });
      pdf.setFontSize(enrollFit.fontSize);
      pdf.text(enrollFit.text, xEnroll + 2.5, baselineY, { align: "left" });

      // Student Name (Left aligned with 2.5mm padding)
      const nameFit = fitPdfTextAndString({
        pdf,
        text: rawName,
        preferredSize: ATTENDANCE_TYPOGRAPHY.student.size,
        minimumSize: ATTENDANCE_TYPOGRAPHY.student.minimumSize,
        maxWidth: colNameW - 5,
        fontStyle: "normal"
      });
      pdf.setFontSize(nameFit.fontSize);
      pdf.text(nameFit.text, xName + 2.5, baselineY, { align: "left" });

      // Sign column remains COMPLETELY BLANK
    });

    // --- 5. DRAW EVENT COORDINATOR (FINAL PAGE ONLY) ---
    if (isLastPage) {
      pdf.setFont(fontFam, ATTENDANCE_TYPOGRAPHY.coordinator.weight);
      pdf.setFontSize(ATTENDANCE_TYPOGRAPHY.coordinator.size); // 11.5pt
      pdf.text(`Event Coordinator : ${eventCoordinatorName || "—"}`, tableX, coordinatorY, { align: "left" });
    }
  });

  pdf.save(fileName);
};

export default downloadAttendanceSheetPdf;
