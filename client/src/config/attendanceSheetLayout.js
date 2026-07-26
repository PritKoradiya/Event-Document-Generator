export const ATTENDANCE_PAGE = {
  width: 210,
  height: 297,
  marginLeft: 12,
  marginRight: 12,
  marginTop: 10,
  marginBottom: 12
};

export const ATTENDANCE_LAYOUT = {
  tableX: 12,
  tableWidth: 186,

  // Header Y Baselines (mm)
  schoolY: 14.5,
  departmentY: 21.0,
  headingY: 27.5,
  documentTitleY: 34.0,
  classDateY: 42.5,

  // Table Start & Row Geometry (mm)
  tableY: 47.0,
  tableHeaderHeight: 8.5,
  studentRowsY: 55.5, // 47.0 + 8.5
  studentRowHeight: 5.65, // Single fixed row height across ALL pages (Page 1, middle, final partial page)

  rowsPerPage: 39,

  coordinatorGap: 12.0, // Gap below final table bottom (mm)

  columns: {
    serial: 15,
    enrollment: 43,
    name: 105,
    sign: 23
  }
};

export const ATTENDANCE_TYPOGRAPHY = {
  fontFamily: "times",
  svgFontFamily: "'Times New Roman', Times, serif",

  school: {
    size: 15.0,
    weight: "bold"
  },

  department: {
    size: 13.0,
    weight: "bold"
  },

  heading: {
    size: 12.5,
    weight: "bold"
  },

  documentTitle: {
    size: 12.0,
    weight: "bold"
  },

  classDate: {
    size: 11.5,
    weight: "bold"
  },

  tableHeader: {
    size: 10.5,
    weight: "bold"
  },

  student: {
    size: 10.5,
    minimumSize: 8.5
  },

  coordinator: {
    size: 11.5,
    weight: "bold"
  }
};
