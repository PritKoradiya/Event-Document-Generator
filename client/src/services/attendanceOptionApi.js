const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const LOCAL_OPTIONS_KEY = "attendance_options_master";

// Pre-seeded initial default departments and classes
const initialDefaultOptions = {
  departments: [
    { id: "dept_ce_it", code: "CE/IT", name: "Computer Engineering & IT", description: "Department of CE & IT", status: "Active" },
    { id: "dept_cse", code: "CSE", name: "Computer Science & Engineering", description: "Department of CSE", status: "Active" },
    { id: "dept_aiml", code: "AIML", name: "Artificial Intelligence & Machine Learning", description: "Department of AI & ML", status: "Active" },
    { id: "dept_me", code: "ME", name: "Mechanical Engineering", description: "Department of Mechanical Engineering", status: "Active" },
    { id: "dept_ec", code: "EC", name: "Electronics & Communication", description: "Department of EC", status: "Active" },
    { id: "dept_civil", code: "CIVIL", name: "Civil Engineering", description: "Department of Civil Engineering", status: "Active" }
  ],
  classes: [
    { id: "class_ce4", code: "CE4", name: "CE Semester 4", departmentCode: "CE/IT", status: "Active" },
    { id: "class_ce6", code: "CE6", name: "CE Semester 6", departmentCode: "CE/IT", status: "Active" },
    { id: "class_cse2", code: "CSE2", name: "CSE Semester 2", departmentCode: "CSE", status: "Active" },
    { id: "class_aiml1", code: "AIML1", name: "AIML Semester 1", departmentCode: "AIML", status: "Active" },
    { id: "class_me2", code: "ME2", name: "ME Semester 2", departmentCode: "ME", status: "Active" },
    { id: "class_ec2", code: "EC2", name: "EC Semester 2", departmentCode: "EC", status: "Active" }
  ]
};

const getLocalOptions = () => {
  try {
    const raw = localStorage.getItem(LOCAL_OPTIONS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_OPTIONS_KEY, JSON.stringify(initialDefaultOptions));
      return initialDefaultOptions;
    }
    return JSON.parse(raw);
  } catch (e) {
    return initialDefaultOptions;
  }
};

const saveLocalOptions = (options) => {
  try {
    localStorage.setItem(LOCAL_OPTIONS_KEY, JSON.stringify(options));
  } catch (e) {
    console.error("Failed to save attendance options to localStorage", e);
  }
};

export const getAttendanceOptions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance-options`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (e) {
    // Fallback to local storage
  }

  const local = getLocalOptions();
  return { success: true, data: local };
};

export const createDepartment = async (deptData) => {
  const code = (deptData.code || deptData.departmentCode || "").trim().toUpperCase();
  const name = (deptData.name || deptData.displayName || code).trim();
  const description = (deptData.description || "").trim();

  if (!code) {
    throw new Error("Department Code / Name is required.");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/attendance-options/departments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name, description })
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // Fallback
  }

  const options = getLocalOptions();
  const exists = options.departments.some(
    (d) => d.code.toUpperCase() === code
  );
  if (exists) {
    throw new Error(`Department with code '${code}' already exists.`);
  }

  const newDept = {
    id: `dept_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    code,
    name,
    description,
    status: "Active"
  };

  options.departments.push(newDept);
  saveLocalOptions(options);

  return { success: true, data: newDept, message: "Department added successfully." };
};

export const updateDepartment = async (id, deptData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance-options/departments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deptData)
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // Fallback
  }

  const options = getLocalOptions();
  const idx = options.departments.findIndex((d) => d.id === id);
  if (idx === -1) {
    throw new Error("Department record not found.");
  }

  options.departments[idx] = {
    ...options.departments[idx],
    ...deptData
  };
  saveLocalOptions(options);

  return { success: true, data: options.departments[idx], message: "Department updated successfully." };
};

export const deleteDepartment = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance-options/departments/${id}`, {
      method: "DELETE"
    });
    if (response.ok) {
      return await response.json();
    } else {
      const err = await response.json();
      throw new Error(err.message || "Cannot delete department in use.");
    }
  } catch (e) {
    if (e.message.includes("Cannot delete")) throw e;
    // Fallback
  }

  const options = getLocalOptions();
  const dept = options.departments.find((d) => d.id === id);
  if (!dept) throw new Error("Department not found.");

  // Check dependency in classes
  const hasClasses = options.classes.some((c) => c.departmentCode.toUpperCase() === dept.code.toUpperCase());
  if (hasClasses) {
    throw new Error(`Cannot delete department '${dept.code}' because active classes depend on it. Deactivate it instead.`);
  }

  options.departments = options.departments.filter((d) => d.id !== id);
  saveLocalOptions(options);

  return { success: true, message: "Department deleted successfully." };
};

export const createClass = async (classData) => {
  const departmentCode = (classData.departmentCode || classData.department || "").trim().toUpperCase();
  const code = (classData.code || classData.className || "").trim().toUpperCase();
  const name = (classData.name || classData.displayName || code).trim();
  const description = (classData.description || "").trim();

  if (!departmentCode) {
    throw new Error("Department is required for creating a class.");
  }
  if (!code) {
    throw new Error("Class Code / Name is required.");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/attendance-options/classes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departmentCode, code, name, description })
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // Fallback
  }

  const options = getLocalOptions();
  const exists = options.classes.some(
    (c) => c.departmentCode.toUpperCase() === departmentCode && c.code.toUpperCase() === code
  );
  if (exists) {
    throw new Error(`Class '${code}' already exists under department '${departmentCode}'.`);
  }

  const newClass = {
    id: `class_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    code,
    name,
    departmentCode,
    description,
    status: "Active"
  };

  options.classes.push(newClass);
  saveLocalOptions(options);

  return { success: true, data: newClass, message: "Class added successfully." };
};

export const updateClass = async (id, classData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance-options/classes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(classData)
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // Fallback
  }

  const options = getLocalOptions();
  const idx = options.classes.findIndex((c) => c.id === id);
  if (idx === -1) {
    throw new Error("Class record not found.");
  }

  options.classes[idx] = {
    ...options.classes[idx],
    ...classData
  };
  saveLocalOptions(options);

  return { success: true, data: options.classes[idx], message: "Class updated successfully." };
};

export const deleteClass = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance-options/classes/${id}`, {
      method: "DELETE"
    });
    if (response.ok) {
      return await response.json();
    } else {
      const err = await response.json();
      throw new Error(err.message || "Cannot delete class.");
    }
  } catch (e) {
    if (e.message.includes("Cannot delete")) throw e;
    // Fallback
  }

  const options = getLocalOptions();
  options.classes = options.classes.filter((c) => c.id !== id);
  saveLocalOptions(options);

  return { success: true, message: "Class deleted successfully." };
};

export const syncExistingAttendanceOptions = async () => {
  return getAttendanceOptions();
};
