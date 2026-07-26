import { useState } from "react";
import { useAttendanceOptions } from "../../hooks/useAttendanceOptions.js";
import { getCleanDepartmentLabel } from "../../utils/attendanceErrorUtils.js";
import AddDepartmentModal from "./AddDepartmentModal.jsx";
import AddClassModal from "./AddClassModal.jsx";

const ADD_DEPT_SENTINEL = "__ADD_DEPARTMENT__";
const ADD_CLASS_SENTINEL = "__ADD_CLASS__";

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
  const { departments, classes, loading, getClassesForDepartment } = useAttendanceOptions();
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);

  // Active departments list
  const activeDepartments = departments.filter((d) => {
    const isAct = d.isActive ?? ((d.status || "Active") === "Active");
    if (isAct) return true;
    const dName = (d.name || d.code || "").toUpperCase();
    return (department || "").toUpperCase() === dName;
  });

  // Filtered classes for selected department
  const filteredClasses = getClassesForDepartment(department, true).filter((c) => {
    const isAct = c.isActive ?? ((c.status || "Active") === "Active");
    if (isAct) return true;
    const cName = (c.className || c.name || c.code || "").toUpperCase();
    return (className || "").toUpperCase() === cName;
  });

  const handleDeptSelect = (e) => {
    const val = e.target.value;
    if (val === ADD_DEPT_SENTINEL || val === "__ADD_NEW_DEPT__") {
      setIsAddDeptModalOpen(true);
      return;
    }
    if (onDepartmentChange) {
      onDepartmentChange(val);
    }
    if (onClassChange) {
      onClassChange(showAllOptions ? "All" : "");
    }
  };

  const handleClassSelect = (e) => {
    const val = e.target.value;
    if (val === ADD_CLASS_SENTINEL || val === "__ADD_NEW_CLASS__") {
      setIsAddClassModalOpen(true);
      return;
    }
    if (onClassChange) {
      onClassChange(val);
    }
  };

  const handleDeptCreated = (createdDept) => {
    if (createdDept && (createdDept.code || createdDept.name)) {
      const newName = createdDept.code || createdDept.name;
      if (onDepartmentChange) {
        onDepartmentChange(newName);
      }
      if (onClassChange) {
        onClassChange(showAllOptions ? "All" : "");
      }
    }
  };

  const handleClassCreated = (createdClass) => {
    if (createdClass && (createdClass.className || createdClass.code || createdClass.name)) {
      const newName = createdClass.className || createdClass.code || createdClass.name;
      if (onClassChange) {
        onClassChange(newName);
      }
    }
  };

  const isDepartmentSelected = Boolean(department && department !== "All");
  const isClassDisabled = disabled || (!showAllOptions && !isDepartmentSelected);

  // Prevent sentinel values from being passed to `<select value="...">`
  const selectedDeptValue = (department === ADD_DEPT_SENTINEL || department === "__ADD_NEW_DEPT__") ? "" : department;
  const selectedClassValue = (className === ADD_CLASS_SENTINEL || className === "__ADD_NEW_CLASS__") ? "" : className;

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
            value={selectedDeptValue}
            onChange={handleDeptSelect}
            disabled={disabled}
            required={required}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-800 shadow-sm focus:border-teal-500 focus:bg-white focus:outline-none transition disabled:opacity-50"
          >
            {showAllOptions && <option value="All">All Departments</option>}
            {!showAllOptions && !selectedDeptValue && <option value="">Select Department</option>}
            {loading && <option value="">Loading departments...</option>}
            {activeDepartments.map((d) => {
              const val = d.code || d.name;
              const label = getCleanDepartmentLabel(d);
              return (
                <option key={d.id || d._id || val} value={val}>
                  {label}
                </option>
              );
            })}
            {allowCreate && !disabled && (
              <option value={ADD_DEPT_SENTINEL} className="font-bold text-teal-700">
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
            {allowCreate && !disabled && isDepartmentSelected && (
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
            value={selectedClassValue}
            onChange={handleClassSelect}
            disabled={isClassDisabled}
            required={required}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-800 shadow-sm focus:border-teal-500 focus:bg-white focus:outline-none transition disabled:opacity-50"
          >
            {!isDepartmentSelected && !showAllOptions ? (
              <option value="">Select Department First</option>
            ) : loading ? (
              <option value="">Loading classes...</option>
            ) : filteredClasses.length === 0 ? (
              <option value="">No Classes Available</option>
            ) : (
              <>
                {showAllOptions ? (
                  <option value="All">All Classes</option>
                ) : (
                  <option value="">Select Class</option>
                )}
              </>
            )}

            {filteredClasses.map((c) => {
              const val = c.className || c.code || c.name;
              const label = c.displayName || c.className || c.code || c.name;
              return (
                <option key={c.id || c._id || val} value={val}>
                  {label}
                </option>
              );
            })}
            {allowCreate && !disabled && isDepartmentSelected && (
              <option value={ADD_CLASS_SENTINEL} className="font-bold text-teal-700">
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
        initialDepartmentCode={isDepartmentSelected ? department : ""}
        onClose={() => setIsAddClassModalOpen(false)}
        onSuccess={handleClassCreated}
      />
    </>
  );
}

export default DepartmentClassSelector;
