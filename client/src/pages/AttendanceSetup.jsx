import { useState } from "react";
import ModuleHeader from "../components/ui/ModuleHeader.jsx";
import { useAttendanceOptions } from "../hooks/useAttendanceOptions.js";
import AddDepartmentModal from "../components/attendance/AddDepartmentModal.jsx";
import AddClassModal from "../components/attendance/AddClassModal.jsx";

function AttendanceSetup() {
  const {
    departments,
    classes,
    loading,
    error: hookError,
    refreshOptions,
    updateDepartment,
    deleteDepartment,
    updateClass,
    deleteClass
  } = useAttendanceOptions();

  // Modals state
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [editingClass, setEditingClass] = useState(null);

  // Edit form state
  const [deptFormCode, setDeptFormCode] = useState("");
  const [deptFormName, setDeptFormName] = useState("");
  const [deptFormDesc, setDeptFormDesc] = useState("");

  const [classFormDept, setClassFormDept] = useState("");
  const [classFormCode, setClassFormCode] = useState("");
  const [classFormName, setClassFormName] = useState("");
  const [classFormDesc, setClassFormDesc] = useState("");

  // Delete confirmation modals
  const [deletingDept, setDeletingDept] = useState(null);
  const [deletingClass, setDeletingClass] = useState(null);

  // Filter state for class section
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("All");

  // Local notifications / errors
  const [notice, setNotice] = useState("");
  const [modalError, setModalError] = useState("");

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 4000);
  };

  // Department Actions
  const handleToggleDeptStatus = async (dept) => {
    const newStatus = dept.status === "Inactive" ? "Active" : "Inactive";
    try {
      await updateDepartment(dept.id, { status: newStatus });
      showNotice(`Department '${dept.code}' status changed to ${newStatus}.`);
    } catch (err) {
      showNotice(err.message || "Failed to update department status.");
    }
  };

  const handleEditDeptClick = (dept) => {
    setEditingDept(dept);
    setDeptFormCode(dept.code);
    setDeptFormName(dept.name || dept.code);
    setDeptFormDesc(dept.description || "");
    setModalError("");
  };

  const handleSaveEditDept = async (e) => {
    e.preventDefault();
    if (!deptFormCode.trim() || !deptFormName.trim()) {
      setModalError("Department code and name are required.");
      return;
    }
    try {
      await updateDepartment(editingDept.id, {
        code: deptFormCode.trim().toUpperCase(),
        name: deptFormName.trim(),
        description: deptFormDesc.trim()
      });
      setEditingDept(null);
      showNotice("Department updated successfully.");
    } catch (err) {
      setModalError(err.message || "Failed to update department.");
    }
  };

  const handleDeleteDeptConfirm = async () => {
    if (!deletingDept) return;
    try {
      await deleteDepartment(deletingDept.id);
      showNotice(`Department '${deletingDept.code}' deleted successfully.`);
      setDeletingDept(null);
    } catch (err) {
      setModalError(err.message || "Cannot delete department.");
    }
  };

  // Class Actions
  const handleToggleClassStatus = async (cls) => {
    const newStatus = cls.status === "Inactive" ? "Active" : "Inactive";
    try {
      await updateClass(cls.id, { status: newStatus });
      showNotice(`Class '${cls.code}' status changed to ${newStatus}.`);
    } catch (err) {
      showNotice(err.message || "Failed to update class status.");
    }
  };

  const handleEditClassClick = (cls) => {
    setEditingClass(cls);
    setClassFormDept(cls.departmentCode);
    setClassFormCode(cls.code);
    setClassFormName(cls.name || cls.code);
    setClassFormDesc(cls.description || "");
    setModalError("");
  };

  const handleSaveEditClass = async (e) => {
    e.preventDefault();
    if (!classFormCode.trim() || !classFormName.trim()) {
      setModalError("Class code and name are required.");
      return;
    }
    try {
      await updateClass(editingClass.id, {
        departmentCode: classFormDept,
        code: classFormCode.trim().toUpperCase(),
        name: classFormName.trim(),
        description: classFormDesc.trim()
      });
      setEditingClass(null);
      showNotice("Class updated successfully.");
    } catch (err) {
      setModalError(err.message || "Failed to update class.");
    }
  };

  const handleDeleteClassConfirm = async () => {
    if (!deletingClass) return;
    try {
      await deleteClass(deletingClass.id);
      showNotice(`Class '${deletingClass.code}' deleted successfully.`);
      setDeletingClass(null);
    } catch (err) {
      setModalError(err.message || "Cannot delete class.");
    }
  };

  const filteredClasses = classes.filter((c) => {
    if (selectedDeptFilter === "All") return true;
    return (c.departmentCode || "").toUpperCase() === selectedDeptFilter.toUpperCase();
  });

  return (
    <section className="space-y-6 pb-12">
      <ModuleHeader
        title="Department & Class Setup"
        subtitle="Create and manage academic departments and class options used by student rosters and attendance sheets."
        theme="attendance"
        badge="Academic Setup"
        primaryAction={{
          label: "+ Add Department",
          onClick: () => setIsAddDeptOpen(true)
        }}
      />

      {notice && (
        <div className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800 shadow-md animate-hero-fade-in flex items-center gap-2">
          <span>✅</span>
          <span>{notice}</span>
        </div>
      )}

      {hookError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800 shadow-md animate-hero-fade-in">
          ⚠️ {hookError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DEPARTMENTS SECTION */}
        <div className="app-glass-surface p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-950 font-sans flex items-center gap-2">
                <span>🏫</span> Departments ({departments.length})
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Academic departments registered in system
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddDeptOpen(true)}
              className="rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700 transition shadow-xs"
            >
              + New Department
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400">
              Loading departments and classes...
            </div>
          ) : departments.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700">No departments have been created.</p>
              <button
                type="button"
                onClick={() => setIsAddDeptOpen(true)}
                className="text-xs font-bold text-teal-700 underline"
              >
                + Add First Department
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {departments.map((dept) => {
                const classCount = classes.filter(
                  (c) => (c.departmentCode || "").toUpperCase() === dept.code.toUpperCase()
                ).length;
                const isActive = (dept.status || "Active") === "Active";

                return (
                  <div
                    key={dept.id || dept.code}
                    className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 space-y-2 hover:shadow-sm transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-slate-950 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                          {dept.code}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isActive
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-slate-100 text-slate-600 border border-slate-300"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleDeptStatus(dept)}
                          className={`text-xs font-bold px-2 py-1 rounded-lg border transition ${
                            isActive
                              ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditDeptClick(dept)}
                          className="text-xs font-bold bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 hover:bg-slate-100 transition"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingDept(dept);
                            setModalError("");
                          }}
                          className="text-xs font-bold bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-100 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{dept.name || dept.code}</h4>
                      {dept.description && (
                        <p className="text-xs text-slate-500 font-medium">{dept.description}</p>
                      )}
                    </div>

                    <div className="text-[11px] font-bold text-teal-800 bg-teal-50/60 px-2.5 py-1 rounded-lg inline-block border border-teal-100">
                      📚 {classCount} Class{classCount === 1 ? "" : "es"} Configured
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CLASSES SECTION */}
        <div className="app-glass-surface p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-950 font-sans flex items-center gap-2">
                <span>📚</span> Classes ({filteredClasses.length})
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Academic class sections grouped by department
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddClassOpen(true)}
              className="rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700 transition shadow-xs"
            >
              + New Class
            </button>
          </div>

          {/* Department Filter for Classes */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600">Filter by Department:</label>
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d.id || d.code} value={d.code}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400">
              Loading classes...
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700">
                {selectedDeptFilter !== "All"
                  ? `No classes exist for department '${selectedDeptFilter}'.`
                  : "No classes have been created."}
              </p>
              <button
                type="button"
                onClick={() => setIsAddClassOpen(true)}
                className="text-xs font-bold text-teal-700 underline"
              >
                + Add Class
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredClasses.map((cls) => {
                const isActive = (cls.status || "Active") === "Active";
                return (
                  <div
                    key={cls.id || cls.code}
                    className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 space-y-2 hover:shadow-sm transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-slate-950 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                          {cls.code}
                        </span>
                        <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          Dept: {cls.departmentCode}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isActive
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-slate-100 text-slate-600 border border-slate-300"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleClassStatus(cls)}
                          className={`text-xs font-bold px-2 py-1 rounded-lg border transition ${
                            isActive
                              ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditClassClick(cls)}
                          className="text-xs font-bold bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 hover:bg-slate-100 transition"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingClass(cls);
                            setModalError("");
                          }}
                          className="text-xs font-bold bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-100 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{cls.name || cls.code}</h4>
                      {cls.description && (
                        <p className="text-xs text-slate-500 font-medium">{cls.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ADD DEPARTMENT MODAL */}
      <AddDepartmentModal
        isOpen={isAddDeptOpen}
        onClose={() => setIsAddDeptOpen(false)}
        onSuccess={() => {
          refreshOptions();
          showNotice("Department added successfully.");
        }}
      />

      {/* ADD CLASS MODAL */}
      <AddClassModal
        isOpen={isAddClassOpen}
        initialDepartmentCode={selectedDeptFilter !== "All" ? selectedDeptFilter : ""}
        onClose={() => setIsAddClassOpen(false)}
        onSuccess={() => {
          refreshOptions();
          showNotice("Class added successfully.");
        }}
      />

      {/* EDIT DEPARTMENT MODAL */}
      {editingDept && (
        <div className="app-glass-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 animate-hero-fade-in">
          <div className="app-glass-modal w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-950 font-sans">
                Edit Department ({editingDept.code})
              </h3>
              <button
                type="button"
                onClick={() => setEditingDept(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveEditDept} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department Code *
                </label>
                <input
                  type="text"
                  value={deptFormCode}
                  onChange={(e) => setDeptFormCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-teal-500 uppercase font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={deptFormName}
                  onChange={(e) => setDeptFormName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={deptFormDesc}
                  onChange={(e) => setDeptFormDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-teal-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLASS MODAL */}
      {editingClass && (
        <div className="app-glass-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 animate-hero-fade-in">
          <div className="app-glass-modal w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-950 font-sans">
                Edit Class ({editingClass.code})
              </h3>
              <button
                type="button"
                onClick={() => setEditingClass(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveEditClass} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Department *
                </label>
                <select
                  value={classFormDept}
                  onChange={(e) => setClassFormDept(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-teal-500"
                  required
                >
                  {departments.map((d) => (
                    <option key={d.id || d.code} value={d.code}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Class Code *</label>
                <input
                  type="text"
                  value={classFormCode}
                  onChange={(e) => setClassFormCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-teal-500 uppercase font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={classFormName}
                  onChange={(e) => setClassFormName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={classFormDesc}
                  onChange={(e) => setClassFormDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-teal-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PART 12: DELETE DEPARTMENT CONFIRMATION MODAL */}
      {deletingDept && (
        <div className="app-glass-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 animate-hero-fade-in">
          <div className="app-glass-modal w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-rose-700 font-sans flex items-center gap-2">
                <span>⚠️</span> Delete Department '{deletingDept.code}'?
              </h3>
              <button
                type="button"
                onClick={() => setDeletingDept(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 space-y-2">
              <p className="text-xs text-amber-950 font-bold leading-relaxed">
                Departments being used by students, classes, or attendance sheets cannot be deleted. They can be deactivated instead.
              </p>
            </div>

            {modalError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                {modalError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingDept(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDeptConfirm}
                className="rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-rose-700 hover:to-red-700"
              >
                Delete Department
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PART 12: DELETE CLASS CONFIRMATION MODAL */}
      {deletingClass && (
        <div className="app-glass-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 animate-hero-fade-in">
          <div className="app-glass-modal w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-rose-700 font-sans flex items-center gap-2">
                <span>⚠️</span> Delete Class '{deletingClass.code}'?
              </h3>
              <button
                type="button"
                onClick={() => setDeletingClass(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 space-y-2">
              <p className="text-xs text-amber-950 font-bold leading-relaxed">
                Classes being used by student rosters or attendance sheets cannot be deleted. Deactivating is recommended if records depend on this class.
              </p>
            </div>

            {modalError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                {modalError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingClass(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteClassConfirm}
                className="rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-rose-700 hover:to-red-700"
              >
                Delete Class
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AttendanceSetup;
