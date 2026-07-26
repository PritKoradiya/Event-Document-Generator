import { useState } from "react";
import { useAttendanceOptions } from "../../hooks/useAttendanceOptions.js";
import AddDepartmentModal from "./AddDepartmentModal.jsx";
import AddClassModal from "./AddClassModal.jsx";

function DepartmentClassSelector({
  department = "",
  className = "",
  onDepartmentChange,
  onClassChange,
  allowCreate = true,
  disabled = false,
  required = false,
  showAllOptions = false
}) {
  const { departments, classes, getClassesForDepartment } = useAttendanceOptions();
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);

  // Active departments list
  const activeDepartments = departments.filter((d) => {
    if ((d.status || "Active") === "Active") return true;
    // Include currently selected department code if inactive
    return (department || "").toUpperCase() === (d.code || "").toUpperCase();
  });

  // Filtered classes for selected department
  const filteredClasses = getClassesForDepartment(department, true).filter((c) => {
    if ((c.status || "Active") === "Active") return true;
    return (className || "").toUpperCase() === (c.code || "").toUpperCase();
  });

  const handleDeptSelect = (e) => {
    const val = e.target.value;
    if (val === "__ADD_NEW_DEPT__") {
      setIsAddDeptModalOpen(true);
      return;
    }
    onDepartmentChange(val);
    // Reset selected class if it's no longer valid for new department
    if (onClassChange) {
      const validClasses = getClassesForDepartment(val, true);
      const isStillValid = validClasses.some((c) => c.code.toUpperCase() === (className || "").toUpperCase());
      if (!isStillValid) {
        onClassChange(showAllOptions ? "All" : validClasses[0]?.code || "");
      }
    }
  };

  const handleClassSelect = (e) => {
    const val = e.target.value;
    if (val === "__ADD_NEW_CLASS__") {
      setIsAddClassModalOpen(true);
      return;
    }
    onClassChange(val);
  };

  const handleDeptCreated = (newDept) => {
    onDepartmentChange(newDept.code);
    if (onClassChange) {
      onClassChange(showAllOptions ? "All" : "");
    }
  };

  const handleClassCreated = (newClass) => {
    onClassChange(newClass.code);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
        {/* Department Selection */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700">
              Department {required && "*"}
            </label>
            {allowCreate && !disabled && (
              <button
                type="button"
                onClick={() => setIsAddDeptModalOpen(true)}
                className="text-[11px] font-bold text-teal-700 hover:text-teal-900 transition flex items-center gap-0.5"
              >
                <span>+</span>
                <span>New Dept</span>
              </button>
            )}
          </div>
          <select
            value={department}
            onChange={handleDeptSelect}
            disabled={disabled}
            required={required}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-800 shadow-sm focus:border-teal-500 focus:bg-white focus:outline-none transition disabled:opacity-50"
          >
            {showAllOptions && <option value="All">All Departments</option>}
            {!showAllOptions && !department && <option value="">Select Department</option>}
            {activeDepartments.map((d) => (
              <option key={d.id || d.code} value={d.code}>
                {d.code} {d.name && d.name !== d.code ? `- ${d.name}` : ""}
              </option>
            ))}
            {allowCreate && !disabled && (
              <option value="__ADD_NEW_DEPT__" className="font-bold text-teal-700">
                + Add New Department
              </option>
            )}
          </select>
        </div>

        {/* Class Selection */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700">
              Class {required && "*"}
            </label>
            {allowCreate && !disabled && department && department !== "All" && (
              <button
                type="button"
                onClick={() => setIsAddClassModalOpen(true)}
                className="text-[11px] font-bold text-teal-700 hover:text-teal-900 transition flex items-center gap-0.5"
              >
                <span>+</span>
                <span>New Class</span>
              </button>
            )}
          </div>
          <select
            value={className}
            onChange={handleClassSelect}
            disabled={disabled || (!showAllOptions && !department)}
            required={required}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-800 shadow-sm focus:border-teal-500 focus:bg-white focus:outline-none transition disabled:opacity-50"
          >
            {showAllOptions && <option value="All">All Classes</option>}
            {!showAllOptions && !className && <option value="">Select Class</option>}
            {filteredClasses.map((c) => (
              <option key={c.id || c.code} value={c.code}>
                {c.code} {c.name && c.name !== c.code ? `- ${c.name}` : ""}
              </option>
            ))}
            {allowCreate && !disabled && department && department !== "All" && (
              <option value="__ADD_NEW_CLASS__" className="font-bold text-teal-700">
                + Add New Class
              </option>
            )}
          </select>
        </div>
      </div>

      {/* Nested Modals */}
      <AddDepartmentModal
        isOpen={isAddDeptModalOpen}
        onClose={() => setIsAddDeptModalOpen(false)}
        onSuccess={handleDeptCreated}
      />

      <AddClassModal
        isOpen={isAddClassModalOpen}
        initialDepartmentCode={department !== "All" ? department : ""}
        onClose={() => setIsAddClassModalOpen(false)}
        onSuccess={handleClassCreated}
      />
    </>
  );
}

export default DepartmentClassSelector;
