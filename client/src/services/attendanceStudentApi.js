const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const LOCAL_STUDENTS_KEY = "attendance_students_master";

// Pre-seeded sample 45 students for CE/IT Class CE4 to enable instant multi-page testing (39 + 6 students = 2 pages)
const initialSampleStudents = Array.from({ length: 45 }, (_, i) => {
  const num = (i + 1).toString().padStart(3, "0");
  const names = [
    "DELVADIYA RAVIKUMAR SHAILESHBHAI", "KUSHI BALAR", "PATEL AARAV VIKRAMBHAI", "MEHTA DEV DINESHBHAI",
    "SHAH HETVI MANESH", "JOSHI KRISHNA SANJAYBHAI", "RATHOD YASH RAJESHBHAI", "PARAMAR PRIYA SURESHBHAI",
    "CHAVDA SMRUTI KISHOR", "SOLANKI HARSH SURESHBHAI", "GOHIL JAYESH PRAVINBHAI", "MAKWANA DIVYA HARESHBHAI",
    "VAGHELA PRATIK NARESHBHAI", "THAKKAR MANAV RAJESH", "TRIVEDI POOJA BHAVESHBHAI", "BHATT DARSHAN KAMLESH",
    "PANCHAL SAHIL KANTILAL", "DESAI RIYA MANOJBHAI", "DAVE NEEL PRADEEPBHAI", "PANDYA KAVYA ASHISH",
    "KAPADIA SMIT VIJAYBHAI", "SHARMA DEVANSHU SUNIL", "VERMA ADITI RAVINDRA", "GUPTA VISHAL ASHOK",
    "PATEL HET MANSUKHBHAI", "PATEL MANAN SANJAYBHAI", "PATEL DISHA JITENDRA", "PATEL DHRUV HEMANT",
    "SHAH JAY ASHVINBHAI", "MEHTA KRUTI ALPESH", "JOSHI KUNAL HITESH", "RATHOD RIYA DIPAK",
    "SOLANKI KARAN BHUPENDRA", "PANCHAL TANVI MAHESH", "TRIVEDI MEET MAHENDRA", "BHATT DISHA CHETAN",
    "GOHIL VISHWA GAURANG", "MAKWANA ROHIT NIRANJAN", "VAGHELA BHOOMI PARESH", "CHAVDA ALOK SUBHASH",
    "PANDYA PARTH KAUSHIK", "DESAI KAVITA HARSHAD", "SHARMA KUSH NIRAV", "VERMA RIDDHI GAURAV", "KAPADIA ZEEL SACHIN"
  ];
  return {
    id: `stud_ce4_${num}`,
    enrollmentNo: `24SE02CE${num}`,
    studentName: names[i % names.length],
    department: "CE/IT",
    className: "CE4"
  };
});

const getLocalStudents = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STUDENTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(initialSampleStudents));
      return initialSampleStudents;
    }
    return JSON.parse(raw);
  } catch (e) {
    return initialSampleStudents;
  }
};

const saveLocalStudents = (students) => {
  try {
    localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(students));
  } catch (e) {
    console.error("Failed to save students to localStorage", e);
  }
};

export const getStudents = async (params = {}) => {
  try {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/attendance/students${query ? `?${query}` : ""}`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (e) {
    // Fallback to local storage
  }

  let list = getLocalStudents();
  if (params.department && params.department !== "All") {
    list = list.filter((s) => s.department.toLowerCase() === params.department.toLowerCase());
  }
  if (params.className && params.className !== "All") {
    list = list.filter((s) => s.className.toLowerCase() === params.className.toLowerCase());
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter((s) => s.enrollmentNo.toLowerCase().includes(q) || s.studentName.toLowerCase().includes(q));
  }

  return { success: true, data: list, total: list.length };
};

export const createStudent = async (studentData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(studentData)
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // Fallback
  }

  const list = getLocalStudents();
  const exists = list.some(
    (s) => s.enrollmentNo.toUpperCase() === studentData.enrollmentNo.toUpperCase()
  );
  if (exists) {
    throw new Error(`Student with enrollment number '${studentData.enrollmentNo}' already exists.`);
  }

  const newStudent = {
    id: `stud_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    enrollmentNo: studentData.enrollmentNo.trim().toUpperCase(),
    studentName: studentData.studentName.trim().toUpperCase(),
    department: studentData.department || "CE/IT",
    className: studentData.className || "CE4"
  };

  list.unshift(newStudent);
  saveLocalStudents(list);
  return { success: true, data: newStudent, message: "Student record added successfully." };
};

export const bulkCreateStudents = async ({ department, className, students }) => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance/students/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ department, className, students })
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // Fallback
  }

  const list = getLocalStudents();
  let inserted = 0;
  let skipped = 0;
  let invalid = 0;
  const skippedRows = [];
  const insertedList = [];

  students.forEach((stud, idx) => {
    const rowNo = idx + 1;
    const enroll = (stud.enrollmentNo || "").toString().trim().toUpperCase();
    const name = (stud.studentName || "").toString().trim().toUpperCase();

    if (!enroll || !name) {
      invalid++;
      skippedRows.push({
        rowNo,
        enrollmentNo: enroll || "N/A",
        reason: "Missing enrollment number or student name"
      });
      return;
    }

    const duplicate = list.some((s) => s.enrollmentNo.toUpperCase() === enroll);
    if (duplicate) {
      skipped++;
      skippedRows.push({
        rowNo,
        enrollmentNo: enroll,
        reason: "Duplicate enrollment number in system"
      });
      return;
    }

    const newStudent = {
      id: `stud_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      enrollmentNo: enroll,
      studentName: name,
      department: department || "CE/IT",
      className: className || "CE4"
    };

    list.unshift(newStudent);
    insertedList.push(newStudent);
    inserted++;
  });

  saveLocalStudents(list);

  return {
    success: true,
    data: insertedList,
    summary: {
      totalInput: students.length,
      inserted,
      skipped,
      invalid
    },
    skippedRows,
    message: `Bulk insert complete: ${inserted} added, ${skipped} duplicates skipped, ${invalid} invalid.`
  };
};

export const getStudentCsvTemplate = async () => {
  const filename = "attendance_student_template.csv";
  try {
    const response = await fetch(`${API_BASE_URL}/attendance-students/csv-template`);
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return { success: true };
    }
  } catch (e) {
    // Fallback below
  }

  // Frontend Fallback Blob Download
  const templateCsvContent = `enrollmentNo,studentName\n24SE02CE001,STUDENT NAME ONE\n24SE02CE002,STUDENT NAME TWO\n`;
  const blob = new Blob([templateCsvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return { success: true };
};

export const importStudentCsv = async (formData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance-students/import-csv`, {
      method: "POST",
      body: formData
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // Fallback to client-side parsing
  }

  const department = formData.get("department") || "CE/IT";
  const className = formData.get("className") || "CE4";
  const csvFile = formData.get("studentCsv");

  if (!csvFile) {
    throw new Error("No CSV file provided.");
  }

  const text = await csvFile.text();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const parsedStudents = [];

  lines.forEach((line, index) => {
    // Skip header line
    if (index === 0 && line.toLowerCase().includes("enrollmentno")) {
      return;
    }
    const parts = line.split(",").map((p) => p.trim());
    parsedStudents.push({
      enrollmentNo: parts[0] || "",
      studentName: parts[1] || parts[0] || ""
    });
  });

  return await bulkCreateStudents({ department, className, students: parsedStudents });
};

export const updateStudent = async (id, studentData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance/students/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(studentData)
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // Fallback
  }

  const list = getLocalStudents();
  const index = list.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error("Student record not found.");
  }

  list[index] = {
    ...list[index],
    ...studentData,
    enrollmentNo: studentData.enrollmentNo ? studentData.enrollmentNo.toUpperCase() : list[index].enrollmentNo,
    studentName: studentData.studentName ? studentData.studentName.toUpperCase() : list[index].studentName
  };

  saveLocalStudents(list);
  return { success: true, data: list[index], message: "Student record updated." };
};

export const deleteStudent = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance/students/${id}`, {
      method: "DELETE"
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // Fallback
  }

  const list = getLocalStudents().filter((s) => s.id !== id);
  saveLocalStudents(list);
  return { success: true, message: "Student deleted successfully." };
};

export const bulkDeleteStudents = async (studentIds = []) => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance-students/bulk-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds })
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // Fallback below
  }

  const idSet = new Set(studentIds);
  const currentList = getLocalStudents();
  const initialCount = currentList.length;
  const remaining = currentList.filter((s) => !idSet.has(s.id));
  const deletedCount = initialCount - remaining.length;

  saveLocalStudents(remaining);
  return {
    success: true,
    count: deletedCount,
    message: `${deletedCount} student(s) deleted successfully.`
  };
};

export const getStudentFilterSummary = async ({ department, className } = {}) => {
  try {
    const query = new URLSearchParams({ department: department || "", className: className || "" }).toString();
    const response = await fetch(`${API_BASE_URL}/attendance-students/filter-summary?${query}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // Fallback below
  }

  let list = getLocalStudents();
  if (department && department !== "All") {
    list = list.filter((s) => s.department.toLowerCase() === department.toLowerCase());
  }
  if (className && className !== "All") {
    list = list.filter((s) => s.className.toLowerCase() === className.toLowerCase());
  }

  return {
    success: true,
    count: list.length,
    department: department || "All",
    className: className || "All",
    students: list
  };
};

export const deleteStudentsByClass = async ({ department, className, confirmationText } = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance-students/class`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ department, className, confirmationText })
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // Fallback below
  }

  const currentList = getLocalStudents();
  const initialCount = currentList.length;
  const remaining = currentList.filter(
    (s) => !(s.department.toLowerCase() === department.toLowerCase() && s.className.toLowerCase() === className.toLowerCase())
  );
  const deletedCount = initialCount - remaining.length;

  saveLocalStudents(remaining);
  return {
    success: true,
    count: deletedCount,
    message: `All ${deletedCount} students for ${department} - ${className} deleted successfully.`
  };
};
