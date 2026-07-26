import React from "react";
import { ATTENDANCE_LAYOUT, ATTENDANCE_TYPOGRAPHY } from "../../config/attendanceSheetLayout.js";
import { ptToSvgUnit } from "../../utils/resolveAttendancePageMetrics.js";
import { fitSvgAttendanceText } from "../../utils/attendanceTextLayout.js";

function AttendanceSheetHeader({
  department = "",
  heading = "",
  className = "",
  date = "",
  metrics
}) {
  const tableX = metrics ? metrics.tableX : ATTENDANCE_LAYOUT.tableX;
  const tableWidth = metrics ? metrics.tableWidth : ATTENDANCE_LAYOUT.tableWidth;
  const classDateY = metrics ? metrics.classDateY : ATTENDANCE_LAYOUT.classDateY;

  const fontFam = ATTENDANCE_TYPOGRAPHY.svgFontFamily;

  const formattedDepartment = department
    ? department.toLowerCase().includes("department")
      ? department
      : `${department} Department`
    : "Department";

  // Fit heading text if long
  const headingPt = fitSvgAttendanceText({
    text: heading || "Event Heading",
    preferredSize: ATTENDANCE_TYPOGRAPHY.heading.size,
    minimumSize: 8.5,
    maxWidth: tableWidth - 10,
    fontFamily: fontFam,
    fontWeight: "bold"
  });

  return (
    <g className="attendance-sheet-header">
      {/* 1. School Name */}
      <text
        x="105"
        y={ATTENDANCE_LAYOUT.schoolY}
        textAnchor="middle"
        fontFamily={fontFam}
        fontSize={ptToSvgUnit(ATTENDANCE_TYPOGRAPHY.school.size)}
        fontWeight={ATTENDANCE_TYPOGRAPHY.school.weight}
        fill="#000000"
      >
        School of Engineering, PPSU
      </text>

      {/* 2. Department Name */}
      <text
        x="105"
        y={ATTENDANCE_LAYOUT.departmentY}
        textAnchor="middle"
        fontFamily={fontFam}
        fontSize={ptToSvgUnit(ATTENDANCE_TYPOGRAPHY.department.size)}
        fontWeight={ATTENDANCE_TYPOGRAPHY.department.weight}
        fill="#000000"
      >
        {formattedDepartment}
      </text>

      {/* 3. Event Heading */}
      <text
        x="105"
        y={ATTENDANCE_LAYOUT.headingY}
        textAnchor="middle"
        fontFamily={fontFam}
        fontSize={ptToSvgUnit(headingPt)}
        fontWeight={ATTENDANCE_TYPOGRAPHY.heading.weight}
        fill="#000000"
      >
        {heading || "Event Heading"}
      </text>

      {/* 4. Document Title */}
      <text
        x="105"
        y={ATTENDANCE_LAYOUT.documentTitleY}
        textAnchor="middle"
        fontFamily={fontFam}
        fontSize={ptToSvgUnit(ATTENDANCE_TYPOGRAPHY.documentTitle.size)}
        fontWeight={ATTENDANCE_TYPOGRAPHY.documentTitle.weight}
        fill="#000000"
      >
        Attendance Sheet
      </text>

      {/* 5. Class (Left) & Date (Right) Row */}
      <text
        x={tableX}
        y={classDateY}
        textAnchor="start"
        fontFamily={fontFam}
        fontSize={ptToSvgUnit(ATTENDANCE_TYPOGRAPHY.classDate.size)}
        fontWeight={ATTENDANCE_TYPOGRAPHY.classDate.weight}
        fill="#000000"
      >
        Class- {className || "—"}
      </text>

      <text
        x={tableX + tableWidth}
        y={classDateY}
        textAnchor="end"
        fontFamily={fontFam}
        fontSize={ptToSvgUnit(ATTENDANCE_TYPOGRAPHY.classDate.size)}
        fontWeight={ATTENDANCE_TYPOGRAPHY.classDate.weight}
        fill="#000000"
      >
        Date : {date || "—"}
      </text>
    </g>
  );
}

export default AttendanceSheetHeader;
