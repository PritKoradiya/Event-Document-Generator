import React from "react";
import { ATTENDANCE_LAYOUT, ATTENDANCE_TYPOGRAPHY } from "../../config/attendanceSheetLayout.js";
import { ptToSvgUnit } from "../../utils/resolveAttendancePageMetrics.js";
import { fitSvgTextAndString } from "../../utils/attendanceTextLayout.js";

function AttendanceSheetTable({ studentsChunk = [], startSrNo = 1, metrics }) {
  const tableX = metrics ? metrics.tableX : ATTENDANCE_LAYOUT.tableX; // 12
  const tableWidth = metrics ? metrics.tableWidth : ATTENDANCE_LAYOUT.tableWidth; // 186
  const tableY = metrics ? metrics.tableY : ATTENDANCE_LAYOUT.tableY; // 47.0
  const tableHeaderHeight = metrics ? metrics.tableHeaderHeight : ATTENDANCE_LAYOUT.tableHeaderHeight; // 8.5
  const studentRowsY = metrics ? metrics.studentRowsY : ATTENDANCE_LAYOUT.studentRowsY; // 55.5
  const rowHeight = metrics ? metrics.rowHeight : ATTENDANCE_LAYOUT.studentRowHeight; // 5.65

  const fontFam = ATTENDANCE_TYPOGRAPHY.svgFontFamily;

  const colSrW = ATTENDANCE_LAYOUT.columns.serial; // 15
  const colEnrollW = ATTENDANCE_LAYOUT.columns.enrollment; // 43
  const colNameW = ATTENDANCE_LAYOUT.columns.name; // 105
  const colSignW = ATTENDANCE_LAYOUT.columns.sign; // 23

  const xSr = tableX; // 12
  const xEnroll = xSr + colSrW; // 27
  const xName = xEnroll + colEnrollW; // 70
  const xSign = xName + colNameW; // 175
  const xEnd = tableX + tableWidth; // 198

  const totalTableHeight = tableHeaderHeight + studentsChunk.length * rowHeight;
  const headerBaselineY = tableY + 5.6;

  return (
    <g className="attendance-sheet-table">
      {/* Outer Border Frame (0.5mm solid black) */}
      <rect
        x={tableX}
        y={tableY}
        width={tableWidth}
        height={totalTableHeight}
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="0.5"
      />

      {/* Header Row Rect (0.35mm inner line) */}
      <rect
        x={tableX}
        y={tableY}
        width={tableWidth}
        height={tableHeaderHeight}
        fill="#ffffff"
        stroke="#000000"
        strokeWidth="0.35"
      />

      {/* Header Vertical Lines */}
      <line x1={xEnroll} y1={tableY} x2={xEnroll} y2={tableY + tableHeaderHeight} stroke="#000000" strokeWidth="0.35" />
      <line x1={xName} y1={tableY} x2={xName} y2={tableY + tableHeaderHeight} stroke="#000000" strokeWidth="0.35" />
      <line x1={xSign} y1={tableY} x2={xSign} y2={tableY + tableHeaderHeight} stroke="#000000" strokeWidth="0.35" />

      {/* Header Titles */}
      <text
        x={xSr + colSrW / 2}
        y={headerBaselineY}
        textAnchor="middle"
        fontFamily={fontFam}
        fontSize={ptToSvgUnit(ATTENDANCE_TYPOGRAPHY.tableHeader.size)}
        fontWeight="bold"
        fill="#000000"
      >
        Sr. No.
      </text>

      <text
        x={xEnroll + colEnrollW / 2}
        y={headerBaselineY}
        textAnchor="middle"
        fontFamily={fontFam}
        fontSize={ptToSvgUnit(ATTENDANCE_TYPOGRAPHY.tableHeader.size)}
        fontWeight="bold"
        fill="#000000"
      >
        Enrollment No.
      </text>

      <text
        x={xName + colNameW / 2}
        y={headerBaselineY}
        textAnchor="middle"
        fontFamily={fontFam}
        fontSize={ptToSvgUnit(ATTENDANCE_TYPOGRAPHY.tableHeader.size)}
        fontWeight="bold"
        fill="#000000"
      >
        Name
      </text>

      <text
        x={xSign + colSignW / 2}
        y={headerBaselineY}
        textAnchor="middle"
        fontFamily={fontFam}
        fontSize={ptToSvgUnit(ATTENDANCE_TYPOGRAPHY.tableHeader.size)}
        fontWeight="bold"
        fill="#000000"
      >
        Sign
      </text>

      {/* Student Data Rows */}
      {studentsChunk.map((student, idx) => {
        const rowTopY = studentRowsY + idx * rowHeight;
        const baselineY = rowTopY + rowHeight * 0.68;
        const srNo = startSrNo + idx;
        const enrollNo = (student.enrollmentNo || "").toUpperCase();
        const rawName = (student.studentName || "").toUpperCase();

        const nameFit = fitSvgTextAndString({
          text: rawName,
          preferredSize: ATTENDANCE_TYPOGRAPHY.student.size,
          minimumSize: ATTENDANCE_TYPOGRAPHY.student.minimumSize,
          maxWidth: colNameW - 5,
          fontFamily: fontFam,
          fontWeight: "normal"
        });

        const enrollFit = fitSvgTextAndString({
          text: enrollNo,
          preferredSize: ATTENDANCE_TYPOGRAPHY.student.size,
          minimumSize: 8.5,
          maxWidth: colEnrollW - 5,
          fontFamily: fontFam,
          fontWeight: "normal"
        });

        return (
          <g key={student.id || idx}>
            {/* Horizontal Line for Row Bottom */}
            <line
              x1={tableX}
              y1={rowTopY + rowHeight}
              x2={xEnd}
              y2={rowTopY + rowHeight}
              stroke="#000000"
              strokeWidth="0.35"
            />

            {/* Vertical Lines for Row */}
            <line x1={xEnroll} y1={rowTopY} x2={xEnroll} y2={rowTopY + rowHeight} stroke="#000000" strokeWidth="0.35" />
            <line x1={xName} y1={rowTopY} x2={xName} y2={rowTopY + rowHeight} stroke="#000000" strokeWidth="0.35" />
            <line x1={xSign} y1={rowTopY} x2={xSign} y2={rowTopY + rowHeight} stroke="#000000" strokeWidth="0.35" />

            {/* Sr. No. */}
            <text
              x={xSr + colSrW / 2}
              y={baselineY}
              textAnchor="middle"
              fontFamily={fontFam}
              fontSize={ptToSvgUnit(ATTENDANCE_TYPOGRAPHY.student.size)}
              fill="#000000"
            >
              {srNo}
            </text>

            {/* Enrollment No. (Left aligned with 2.5mm padding) */}
            <text
              x={xEnroll + 2.5}
              y={baselineY}
              textAnchor="start"
              fontFamily={fontFam}
              fontSize={ptToSvgUnit(enrollFit.fontSize)}
              fill="#000000"
            >
              {enrollFit.text}
            </text>

            {/* Student Name (Left aligned with 2.5mm padding) */}
            <text
              x={xName + 2.5}
              y={baselineY}
              textAnchor="start"
              fontFamily={fontFam}
              fontSize={ptToSvgUnit(nameFit.fontSize)}
              fill="#000000"
            >
              {nameFit.text}
            </text>

            {/* Sign Cell remains COMPLETELY BLANK */}
          </g>
        );
      })}
    </g>
  );
}

export default AttendanceSheetTable;
