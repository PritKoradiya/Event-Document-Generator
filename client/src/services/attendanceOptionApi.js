const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const LOCAL_OPTIONS_KEY = "attendance_options_master";

// Initial default fallback departments and classes
const initialDefaultOptions = {
  departments: [
    { id: "dept_ce_it", name: "CE/IT", code: "CE/IT", displayName: "CE/IT", description: "Department of CE & IT", isActive: true, status: "Active" },
    { id: "dept_cse", name: "CSE", code: "CSE", displayName: "CSE", description: "Department of CSE", isActive: true, status: "Active" },
    { id: "dept_aiml", name: "AIML", code: "AIML", displayName: "AIML", description: "Department of AI & ML", isActive: true, status: "Active" },
    { id: "dept_me", name: "ME", code: "ME", displayName: "ME", description: "Department of Mechanical Engineering", isActive: true, status: "Active" },
    { id: "dept_ec", name: "EC", code: "EC", displayName: "EC", description: "Department of EC", isActive: true, status: "Active" },
    { id: "dept_civil", name: "CIVIL", code: "CIVIL", displayName: "CIVIL", description: "Department of Civil Engineering", isActive: true, status: "Active" }
  ],
  classes: [
    { id: "class_ce4", name: "CE4", className: "CE4", code: "CE4", displayName: "CE4", departmentName: "CE/IT", departmentCode: "CE/IT", department: "CE/IT", isActive: true, status: "Active" },
    { id: "class_ce6", name: "CE6", className: "CE6", code: "CE6", displayName: "CE6", departmentName: "CE/IT", departmentCode: "CE/IT", department: "CE/IT", isActive: true, status: "Active" },
    { id: "class_cse2", name: "CSE2", className: "CSE2", code: "CSE2", displayName: "CSE2", departmentName: "CSE", departmentCode: "CSE", department: "CSE", isActive: true, status: "Active" },
    { id: "class_aiml1", name: "AIML1", className: "AIML1", code: "AIML1", displayName: "AIML1", departmentName: "AIML", departmentCode: "AIML", department: "AIML", isActive: true, status: "Active" },
    { id: "class_me2", name: "ME2", className: "ME2", code: "ME2", displayName: "ME2", departmentName: "ME", departmentCode: "ME", department: "ME", isActive: true, status: "Active" },
    { id: "class_ec2", name: "EC2", className: "EC2", code: "EC2", displayName: "EC2", departmentName: "EC", departmentCode: "EC", department: "EC", isActive: true, status: "Active" }
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

// Helper to safely normalize departments & classes from any API/Storage structure
const normalizeOptions = (raw) => {
  let rawDepts = [];
  let rawClasses = [];

  if (Array.isArray(raw)) {
    rawDepts = raw;
  } else if (raw && typeof raw === "object") {
    rawDepts = raw.data?.departments ?? raw.departments ?? raw.data ?? [];
    if (Array.isArray(rawDepts) && rawDepts.length === 0 && Array.isArray(raw.data)) {
      rawDepts = raw.data;
    }
    rawClasses = raw.data?.classes ?? raw.classes ?? [];
  }

  const departmentsMap = new Map();
  const classesList = [];

  if (Array.isArray(rawDepts)) {
    rawDepts.forEach((d) => {
      if (!d) return;
      const rawName = (d.name || d.code || d.departmentName || d.department || "").toString().replace(/^[-_\s]+/, "").trim();
      if (!rawName) return;

      const code = rawName;
      const name = rawName;
      const displayName = (d.displayName || "").replace(/^[-_\s]+/, "").trim() || name;
      const isActive = d.isActive !== undefined ? Boolean(d.isActive) : (d.status || "Active") !== "Inactive";

      const deptObj = {
        id: d.id || d._id || `dept_${code.toLowerCase()}`,
        _id: d._id || d.id || null,
        name,
        code,
        displayName,
        description: d.description || "",
        isActive,
        status: isActive ? "Active" : "Inactive"
      };

      departmentsMap.set(code.toUpperCase(), deptObj);

      // Extract nested classes inside department if present
      if (Array.isArray(d.classes)) {
        d.classes.forEach((c) => {
          if (!c) return;
          const cName = (c.className || c.name || c.code || "").toString().replace(/^[-_\s]+/, "").trim();
          if (!cName) return;

          const cActive = c.isActive !== undefined ? Boolean(c.isActive) : (c.status || "Active") !== "Inactive";

          classesList.push({
            id: c.id || c._id || `class_${code.toLowerCase()}_${cName.toLowerCase()}`,
            _id: c._id || c.id || null,
            name: cName,
            className: cName,
            code: cName,
            displayName: (c.displayName || "").replace(/^[-_\s]+/, "").trim() || cName,
            departmentName: code,
            departmentCode: code,
            department: code,
            description: c.description || "",
            isActive: cActive,
            status: cActive ? "Active" : "Inactive"
          });
        });
      }
    });
  }

  // Also include top-level rawClasses if present
  if (Array.isArray(rawClasses)) {
    rawClasses.forEach((c) => {
      if (!c) return;
      const cName = (c.className || c.name || c.code || "").toString().replace(/^[-_\s]+/, "").trim();
      const deptCode = (c.departmentName || c.departmentCode || c.department || "").toString().replace(/^[-_\s]+/, "").trim();
      if (!cName) return;

      const cActive = c.isActive !== undefined ? Boolean(c.isActive) : (c.status || "Active") !== "Inactive";
      const key = `${deptCode.toUpperCase()}_${cName.toUpperCase()}`;

      const alreadyExists = classesList.some(
        (existing) => `${existing.departmentCode.toUpperCase()}_${existing.className.toUpperCase()}` === key
      );

      if (!alreadyExists) {
        classesList.push({
          id: c.id || c._id || `class_${deptCode.toLowerCase()}_${cName.toLowerCase()}`,
          _id: c._id || c.id || null,
          name: cName,
          className: cName,
          code: cName,
          displayName: (c.displayName || "").replace(/^[-_\s]+/, "").trim() || cName,
          departmentName: deptCode,
          departmentCode: deptCode,
          department: deptCode,
          description: c.description || "",
          isActive: cActive,
          status: cActive ? "Active" : "Inactive"
        });
      }
    });
  }

  return {
    departments: Array.from(departmentsMap.values()),
    classes: classesList
  };
};

export const getAttendanceOptions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance-options`);
    if (response.ok) {
      const data = await response.json();
      const norm = normalizeOptions(data);
      return { success: true, data: norm };
    }
  } catch (e) {
    // Fallback to local storage
  }

  const local = getLocalOptions();
  const norm = normalizeOptions(local);
  return { success: true, data: norm };
};

export const createDepartment = async (deptData) => {
  const name = (deptData.code || deptData.name || deptData.departmentCode || "").toString().replace(/^[-_\s]+/, "").trim().toUpperCase();
  const displayName = (deptData.displayName || deptData.name || name).toString().replace(/^[-_\s]+/, "").trim() || name;
  const description = (deptData.description || "").trim();

  if (!name) {
    throw new Error("Department Code / Name is required.");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/attendance-options/departments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: name, name, displayName, description })
    });
    if (response.ok) {
      const resData = await response.json();
      const created = resData.data || { name, code: name, displayName, description };
      return {
        success: true,
        data: {
          id: created.id || created._id || `dept_${name.toLowerCase()}`,
          name: created.name || name,
          code: created.code || name,
          displayName: created.displayName || displayName || name,
          description: created.description || description,
          isActive: true,
          status: "Active"
        },
        message: "Department added successfully."
      };
    } else {
      const err = await response.json();
      throw new Error(err.message || "Failed to create department.");
    }
  } catch (e) {
    if (e.message && (e.message.includes("already exists") || e.message.includes("required"))) {
      throw e;
    }
    // Fallback
  }

  const options = getLocalOptions();
  const exists = options.departments.some(
    (d) => (d.name || d.code || "").toUpperCase() === name
  );
  if (exists) {
    throw new Error(`Department '${name}' already exists.`);
  }

  const newDept = {
    id: `dept_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    name,
    code: name,
    displayName: displayName || name,
    description,
    isActive: true,
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
  const idx = options.departments.findIndex((d) => d.id === id || d._id === id);
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
    if (e.message && e.message.includes("Cannot delete")) throw e;
    // Fallback
  }

  const options = getLocalOptions();
  const dept = options.departments.find((d) => d.id === id || d._id === id);
  if (!dept) throw new Error("Department not found.");

  const deptCode = (dept.name || dept.code || "").toUpperCase();
  const hasClasses = options.classes.some((c) => (c.departmentName || c.departmentCode || c.department || "").toUpperCase() === deptCode);
  if (hasClasses) {
    throw new Error(`Cannot delete department '${deptCode}' because active classes depend on it. Deactivate it instead.`);
  }

  options.departments = options.departments.filter((d) => d.id !== id && d._id !== id);
  saveLocalOptions(options);

  return { success: true, message: "Department deleted successfully." };
};

export const createClass = async (classData) => {
  const departmentName = (classData.departmentCode || classData.departmentName || classData.department || "").toString().replace(/^[-_\s]+/, "").trim().toUpperCase();
  const name = (classData.code || classData.className || classData.name || "").toString().replace(/^[-_\s]+/, "").trim().toUpperCase();
  const displayName = (classData.displayName || classData.name || name).toString().replace(/^[-_\s]+/, "").trim() || name;
  const description = (classData.description || "").trim();

  if (!departmentName) {
    throw new Error("Department is required for creating a class.");
  }
  if (!name) {
    throw new Error("Class Code / Name is required.");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/attendance-options/classes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ department: departmentName, departmentCode: departmentName, departmentName, code: name, className: name, name, displayName, description })
    });
    if (response.ok) {
      const resData = await response.json();
      const created = resData.data || { className: name, name, displayName, departmentName, description };
      return {
        success: true,
        data: {
          id: created.id || created._id || `class_${name.toLowerCase()}`,
          name: created.name || name,
          className: created.className || name,
          code: created.code || name,
          displayName: created.displayName || displayName || name,
          department: created.department || departmentName,
          departmentName: created.departmentName || departmentName,
          departmentCode: created.departmentCode || departmentName,
          description: created.description || description,
          isActive: true,
          status: "Active"
        },
        message: "Class added successfully."
      };
    } else {
      const err = await response.json();
      throw new Error(err.message || "Failed to create class.");
    }
  } catch (e) {
    if (e.message && (e.message.includes("already exists") || e.message.includes("required"))) {
      throw e;
    }
    // Fallback
  }

  const options = getLocalOptions();
  const exists = options.classes.some(
    (c) => (c.departmentName || c.departmentCode || c.department || "").toUpperCase() === departmentName && (c.className || c.name || c.code || "").toUpperCase() === name
  );
  if (exists) {
    throw new Error(`Class '${name}' already exists under department '${departmentName}'.`);
  }

  const newClass = {
    id: `class_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    name,
    className: name,
    code: name,
    displayName: displayName || name,
    department: departmentName,
    departmentName,
    departmentCode: departmentName,
    description,
    isActive: true,
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
  const idx = options.classes.findIndex((c) => c.id === id || c._id === id);
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
    if (e.message && e.message.includes("Cannot delete")) throw e;
    // Fallback
  }

  const options = getLocalOptions();
  options.classes = options.classes.filter((c) => c.id !== id && c._id !== id);
  saveLocalOptions(options);

  return { success: true, message: "Class deleted successfully." };
};

export const syncExistingAttendanceOptions = async () => {
  return getAttendanceOptions();
};
