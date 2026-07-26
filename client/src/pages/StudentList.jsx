import { useEffect, useState, useRef } from "react";
import ModuleHeader from "../components/ui/ModuleHeader.jsx";
import {
  getStudents,
  createStudent,
  bulkCreateStudents,
  getStudentCsvTemplate,
  importStudentCsv,
  updateStudent,
  deleteStudent,
  bulkDeleteStudents,
  getStudentFilterSummary,
  deleteStudentsByClass
} from "../services/attendanceStudentApi.js";

const DEPARTMENTS = ["CE/IT", "CSE", "AIML", "ME", "EC", "CIVIL"];
const CLASSES = ["CE4", "CE6", "CSE2", "AIML1", "ME2", "EC2"];

function StudentList() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterDept, setFilterDept] = useState("All");
  const [filterClass, setFilterClass] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Selection State
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const headerCheckboxRef = useRef(null);

  // Add / Edit Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formDept, setFormDept] = useState("CE/IT");
  const [formClass, setFormClass] = useState("CE4");
  const [formEnroll, setFormEnroll] = useState("");
  const [formName, setFormName] = useState("");
  const [formError, setFormError] = useState("");

  // Bulk / CSV Import Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkDept, setBulkDept] = useState("CE/IT");
  const [bulkClass, setBulkClass] = useState("CE4");
  const [selectedCsvFile, setSelectedCsvFile] = useState(null);
  const [bulkText, setBulkText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [skippedRowsTable, setSkippedRowsTable] = useState([]);
  const [bulkError, setBulkError] = useState("");

  // Bulk Delete Modal State
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Complete Class Delete Modal State
  const [isClassDeleteModalOpen, setIsClassDeleteModalOpen] = useState(false);
  const [classDeleteConfirmInput, setClassDeleteConfirmInput] = useState("");
  const [classSummary, setClassSummary] = useState(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const loadStudentData = async () => {
    setLoading(true);
    try {
      const res = await getStudents();
      if (res && res.data) {
        setStudents(res.data);
      }
    } catch (e) {
      console.error("Failed to load students", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, []);

  // Filter effect
  useEffect(() => {
    let result = [...students];
    if (filterDept !== "All") {
      result = result.filter((s) => s.department.toLowerCase() === filterDept.toLowerCase());
    }
    if (filterClass !== "All") {
      result = result.filter((s) => s.className.toLowerCase() === filterClass.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.enrollmentNo.toLowerCase().includes(q) ||
          s.studentName.toLowerCase().includes(q)
      );
    }
    setFilteredStudents(result);
  }, [students, filterDept, filterClass, searchQuery]);

  // Clean up selected IDs that no longer exist in students list
  useEffect(() => {
    if (students.length > 0 && selectedStudentIds.size > 0) {
      const existingSet = new Set(students.map((s) => s.id));
      setSelectedStudentIds((prev) => {
        const next = new Set();
        prev.forEach((id) => {
          if (existingSet.has(id)) next.add(id);
        });
        return next;
      });
    }
  }, [students]);

  // Selection calculations
  const visibleIds = filteredStudents.map((s) => s.id);
  const selectedCount = selectedStudentIds.size;
  const selectedVisibleCount = visibleIds.filter((id) => selectedStudentIds.has(id)).length;
  const isAllVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedStudentIds.has(id));
  const isSomeVisibleSelected = selectedVisibleCount > 0 && !isAllVisibleSelected;
  const outsideViewCount = selectedCount - selectedVisibleCount;

  // Sync header checkbox indeterminate state
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeVisibleSelected;
    }
  }, [isSomeVisibleSelected]);

  // Selection helpers
  const toggleStudentSelection = (id) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (isAllVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  const isStudentSelected = (id) => selectedStudentIds.has(id);

  // Download CSV Template
  const handleDownloadTemplate = async () => {
    try {
      await getStudentCsvTemplate();
      showToast("CSV Template downloaded successfully.");
    } catch (e) {
      showToast("Failed to download CSV template.");
    }
  };

  // Single Save (Create or Edit)
  const handleSaveStudent = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formEnroll.trim() || !formName.trim()) {
      setFormError("Please enter both Enrollment Number and Student Name.");
      return;
    }

    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, {
          department: formDept,
          className: formClass,
          enrollmentNo: formEnroll.trim(),
          studentName: formName.trim()
        });
        showToast("Student updated successfully!");
      } else {
        await createStudent({
          department: formDept,
          className: formClass,
          enrollmentNo: formEnroll.trim(),
          studentName: formName.trim()
        });
        showToast("Student added successfully!");
      }
      setIsAddModalOpen(false);
      setEditingStudent(null);
      setFormEnroll("");
      setFormName("");
      loadStudentData();
    } catch (err) {
      setFormError(err.message || "Failed to save student record.");
    }
  };

  // Open Edit Modal
  const handleEditClick = (student) => {
    setEditingStudent(student);
    setFormDept(student.department || "CE/IT");
    setFormClass(student.className || "CE4");
    setFormEnroll(student.enrollmentNo || "");
    setFormName(student.studentName || "");
    setFormError("");
    setIsAddModalOpen(true);
  };

  // Delete Single Student
  const handleDeleteClick = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete student '${name}'?`)) {
      try {
        await deleteStudent(id);
        setSelectedStudentIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        showToast("Student record deleted.");
        loadStudentData();
      } catch (e) {
        showToast("Failed to delete student.");
      }
    }
  };

  // Bulk Delete Selected Handler
  const handleBulkDeleteConfirm = async () => {
    setIsDeletingBulk(true);
    try {
      const ids = Array.from(selectedStudentIds);
      const res = await bulkDeleteStudents(ids);
      if (res && res.success) {
        showToast(`${res.count || ids.length} students deleted successfully.`);
        clearSelection();
        setIsBulkDeleteModalOpen(false);
        loadStudentData();
      } else {
        showToast("Unable to delete the selected students. Please try again.");
      }
    } catch (err) {
      showToast(err.message || "Unable to delete the selected students. Please try again.");
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // Complete Class Delete Modal Handler
  const handleOpenClassDeleteModal = async () => {
    if (filterDept === "All" || filterClass === "All") return;
    setClassDeleteConfirmInput("");
    setIsClassDeleteModalOpen(true);
    try {
      const summary = await getStudentFilterSummary({ department: filterDept, className: filterClass });
      if (summary && summary.success) {
        setClassSummary(summary);
      }
    } catch (e) {
      setClassSummary({ count: filteredStudents.length });
    }
  };

  const handleClassDeleteConfirm = async (e) => {
    e.preventDefault();
    const requiredText = `DELETE ${filterDept} ${filterClass}`;
    if (classDeleteConfirmInput.trim().toUpperCase() !== requiredText.toUpperCase()) {
      setBulkError("The confirmation text does not match.");
      return;
    }

    setIsDeletingBulk(true);
    try {
      const res = await deleteStudentsByClass({
        department: filterDept,
        className: filterClass,
        confirmationText: classDeleteConfirmInput.trim()
      });
      if (res && res.success) {
        showToast(res.message || `All students for ${filterDept} - ${filterClass} deleted successfully.`);
        clearSelection();
        setIsClassDeleteModalOpen(false);
        setClassDeleteConfirmInput("");
        loadStudentData();
      } else {
        showToast("Unable to delete the selected class roster. Please try again.");
      }
    } catch (err) {
      showToast(err.message || "Unable to delete the selected class roster. Please try again.");
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // CSV File Change Handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setBulkError("CSV File size exceeds maximum limit of 2MB.");
      return;
    }

    setSelectedCsvFile(file);
    setBulkError("");
  };

  // Process CSV Upload or Text Import
  const handleCsvImport = async (e) => {
    e.preventDefault();
    setBulkError("");
    setImportSummary(null);
    setSkippedRowsTable([]);

    if (!selectedCsvFile && !bulkText.trim()) {
      setBulkError("Please select a CSV file or paste student records.");
      return;
    }

    setImporting(true);

    try {
      let result;
      if (selectedCsvFile) {
        const formData = new FormData();
        formData.append("department", bulkDept);
        formData.append("className", bulkClass);
        formData.append("studentCsv", selectedCsvFile);

        result = await importStudentCsv(formData);
      } else {
        const lines = bulkText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const parsed = [];
        lines.forEach((line, idx) => {
          if (idx === 0 && line.toLowerCase().includes("enrollmentno")) return;
          const parts = line.split(",").map((p) => p.trim());
          parsed.push({ enrollmentNo: parts[0] || "", studentName: parts[1] || parts[0] || "" });
        });
        result = await bulkCreateStudents({ department: bulkDept, className: bulkClass, students: parsed });
      }

      if (result && result.success) {
        setImportSummary(result.summary);
        setSkippedRowsTable(result.skippedRows || []);
        showToast(`Import completed! ${result.summary.inserted} students inserted.`);
        loadStudentData();
      }
    } catch (err) {
      setBulkError(err.message || "Failed to import CSV students.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="space-y-6 pb-12">
      <ModuleHeader
        title="Student Master List"
        subtitle="Add and manage department-wise and class-wise student records before generating attendance sheets."
        theme="attendance"
        badge="Student Master"
        primaryAction={{
          label: "+ Add Student",
          onClick: () => {
            setEditingStudent(null);
            setFormEnroll("");
            setFormName("");
            setFormError("");
            setIsAddModalOpen(true);
          }
        }}
      />

      {toastMessage && (
        <div className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800 shadow-md animate-hero-fade-in flex items-center gap-2">
          <span>✅</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="app-glass-toolbar p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Department
              </label>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-800 shadow-sm focus:border-teal-500 focus:bg-white focus:outline-none"
              >
                <option value="All">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Class
              </label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-800 shadow-sm focus:border-teal-500 focus:bg-white focus:outline-none"
              >
                <option value="All">All Classes</option>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Search Roster
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or enrollment..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-800 shadow-sm focus:border-teal-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
            >
              <span>📄</span>
              <span>CSV Template</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setImportSummary(null);
                setSkippedRowsTable([]);
                setBulkError("");
                setSelectedCsvFile(null);
                setIsBulkModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-teal-300 bg-teal-50/80 px-4 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 shadow-sm transition"
            >
              <span>📥</span>
              <span>Import Student CSV</span>
            </button>

            {filterDept !== "All" && filterClass !== "All" && (
              <button
                type="button"
                onClick={handleOpenClassDeleteModal}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 shadow-sm transition"
              >
                <span>🗑️</span>
                <span>Delete Entire {filterDept} - {filterClass} Roster</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-slate-600 gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Total Records: <strong className="text-slate-900">{students.length}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Showing: <strong className="text-teal-700">{filteredStudents.length}</strong>
            </span>
            {filterDept !== "All" && (
              <>
                <span className="text-slate-300">•</span>
                <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md text-[11px]">
                  Dept: {filterDept}
                </span>
              </>
            )}
            {filterClass !== "All" && (
              <>
                <span className="text-slate-300">•</span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[11px]">
                  Class: {filterClass}
                </span>
              </>
            )}
          </div>

          {filteredStudents.length > 0 && (filterDept !== "All" || filterClass !== "All" || searchQuery.trim()) && (
            <div className="flex items-center gap-2">
              {isAllVisibleSelected ? (
                <span className="text-teal-800 bg-teal-100/80 border border-teal-300 px-3 py-1 rounded-xl font-extrabold text-[11px]">
                  ✓ All {filteredStudents.length} matching students are selected.
                </span>
              ) : (
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-300 px-3 py-1 rounded-xl transition text-[11px] font-black"
                >
                  Select all {filteredStudents.length} {filterDept !== "All" ? filterDept : ""} {filterClass !== "All" ? filterClass : ""} filtered students
                </button>
              )}
            </div>
          )}

          <div className="text-[11px] text-slate-400">
            Expected Attendance Pages:{" "}
            <strong className="text-slate-700 font-mono">
              {Math.ceil(filteredStudents.length / 39) || 1} Page(s)
            </strong>
          </div>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="sticky top-20 z-30 app-glass-toolbar p-4 shadow-xl border-t-2 border-teal-500 flex flex-col sm:flex-row items-center justify-between gap-3 animate-hero-fade-in">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-7 px-3 items-center justify-center rounded-full bg-teal-500/20 text-teal-700 border border-teal-400/40 text-xs font-black">
              {selectedCount} Selected
            </span>
            <span className="text-xs font-bold text-slate-800">
              {selectedCount} student{selectedCount === 1 ? "" : "s"} selected
            </span>
            {outsideViewCount > 0 && (
              <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                ⚠️ {outsideViewCount} selected student{outsideViewCount === 1 ? "" : "s"} outside current view
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              Clear Selection
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-1.5 text-xs font-black text-white shadow-md hover:from-rose-700 hover:to-red-700 transition active:scale-98"
            >
              Delete {selectedCount} Student{selectedCount === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      )}

      <div className="app-glass-table overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold">
            Loading student master list...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <span className="text-4xl">👨‍🎓</span>
            <h3 className="text-lg font-black text-slate-800">No students found</h3>
            <p className="text-xs font-medium text-slate-500 max-w-md mx-auto">
              No student records match your selected filters. Add students manually or use the bulk CSV import tool.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingStudent(null);
                setFormEnroll("");
                setFormName("");
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-teal-700 transition"
            >
              + Add First Student
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500 font-mono">
                <tr>
                  <th className="px-4 py-3.5 w-10 text-center">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      onChange={selectAllVisible}
                      aria-label="Select all visible students"
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3.5">Sr. No.</th>
                  <th className="px-5 py-3.5">Enrollment No.</th>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Class</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredStudents.map((student, idx) => {
                  const isSelected = isStudentSelected(student.id);
                  return (
                    <tr
                      key={student.id}
                      className={`transition ${
                        isSelected
                          ? "bg-teal-500/10 border-l-4 border-l-teal-500 font-bold"
                          : "hover:bg-teal-50/40"
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStudentSelection(student.id)}
                          aria-label={`Select ${student.studentName}`}
                          className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-500 text-xs">
                        {idx + 1}
                      </td>
                      <td className="px-5 py-3 font-mono font-bold text-slate-900 text-xs">
                        {student.enrollmentNo}
                      </td>
                      <td className="px-5 py-3 text-slate-950 font-bold text-sm">
                        {student.studentName}
                      </td>
                      <td className="px-5 py-3 text-xs">
                        <span className="rounded-lg bg-teal-50 border border-teal-200/80 px-2.5 py-1 font-bold text-teal-800">
                          {student.department}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs">
                        <span className="rounded-lg bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 font-bold text-emerald-800">
                          {student.className}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditClick(student)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-xs"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(student.id, student.studentName)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100 transition shadow-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="app-glass-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 animate-hero-fade-in">
          <div className="app-glass-modal w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-950 font-sans">
                {editingStudent ? "Edit Student Record" : "Add New Student"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Department *
                  </label>
                  <select
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Class *</label>
                  <select
                    value={formClass}
                    onChange={(e) => setFormClass(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none"
                  >
                    {CLASSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enrollment Number *
                </label>
                <input
                  type="text"
                  value={formEnroll}
                  onChange={(e) => setFormEnroll(e.target.value)}
                  placeholder="e.g. 24SE02CE002"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Student Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. DELVADIYA RAVIKUMAR SHAILESHBHAI"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-700"
                >
                  {editingStudent ? "Update Student" : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBulkModalOpen && (
        <div className="app-glass-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 animate-hero-fade-in">
          <div className="app-glass-modal w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-950 font-sans">
                  Import Student CSV Roster
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Upload `.csv` roster file (Max 2MB) or paste student records below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {bulkError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                {bulkError}
              </div>
            )}

            {importSummary && (
              <div className="rounded-2xl border border-teal-200 bg-teal-50/80 p-4 space-y-3">
                <p className="text-sm font-black text-teal-900">📊 Import Results Summary</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 uppercase block">Total Rows</span>
                    <span className="text-base font-black text-slate-900">{importSummary.totalInput}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-center">
                    <span className="text-[10px] text-emerald-600 uppercase block">Inserted</span>
                    <span className="text-base font-black text-emerald-700">{importSummary.inserted}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200 text-center">
                    <span className="text-[10px] text-amber-600 uppercase block">Skipped</span>
                    <span className="text-base font-black text-amber-700">{importSummary.skipped}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-rose-200 text-center">
                    <span className="text-[10px] text-rose-600 uppercase block">Invalid</span>
                    <span className="text-base font-black text-rose-700">{importSummary.invalid || 0}</span>
                  </div>
                </div>

                {skippedRowsTable.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-xs font-extrabold text-slate-700">Skipped / Invalid Details</span>
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden max-h-36 overflow-y-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-100 font-bold text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-1.5">Row</th>
                            <th className="px-3 py-1.5">Enrollment</th>
                            <th className="px-3 py-1.5">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {skippedRowsTable.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-3 py-1 text-slate-500 font-mono">{row.rowNo}</td>
                              <td className="px-3 py-1 font-mono font-bold text-slate-800">{row.enrollmentNo}</td>
                              <td className="px-3 py-1 text-rose-600">{row.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleCsvImport} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Department *
                  </label>
                  <select
                    value={bulkDept}
                    onChange={(e) => setBulkDept(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Class *
                  </label>
                  <select
                    value={bulkClass}
                    onChange={(e) => setBulkClass(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none"
                  >
                    {CLASSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    CSV Roster File
                  </label>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="text-xs font-bold text-teal-700 underline hover:text-teal-900"
                  >
                    Download CSV Template
                  </button>
                </div>

                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer"
                />

                {selectedCsvFile && (
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-teal-50 border border-teal-200 px-3 py-1.5 text-xs font-bold text-teal-800">
                    <span className="truncate">📄 {selectedCsvFile.name} ({(selectedCsvFile.size / 1024).toFixed(1)} KB)</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCsvFile(null)}
                      className="text-rose-600 hover:underline text-[11px]"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Or Paste CSV Content (enrollmentNo,studentName)
                </label>
                <textarea
                  rows={4}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`enrollmentNo,studentName\n24SE02CE001,NAME ONE\n24SE02CE002,NAME TWO`}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs font-mono font-bold text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
                >
                  {importing ? "Importing Students..." : "Import Students"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBulkDeleteModalOpen && (
        <div className="app-glass-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 animate-hero-fade-in">
          <div className="app-glass-modal w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-950 font-sans flex items-center gap-2">
                <span className="text-rose-600">⚠️</span> Delete Selected Students?
              </h3>
              <button
                type="button"
                disabled={isDeletingBulk}
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              You are about to delete <strong className="text-slate-900 font-black">{selectedCount}</strong> student{selectedCount === 1 ? "" : "s"} from the Student Master List.
            </p>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 space-y-1.5 max-h-48 overflow-y-auto">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Selected Preview (Up to 5)
              </span>
              {students
                .filter((s) => selectedStudentIds.has(s.id))
                .slice(0, 5)
                .map((s) => (
                  <div key={s.id} className="text-xs font-semibold text-slate-700 flex items-center justify-between bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    <span className="font-mono font-bold text-slate-900">{s.enrollmentNo}</span>
                    <span className="truncate max-w-[220px]">{s.studentName}</span>
                  </div>
                ))}
              {selectedCount > 5 && (
                <p className="text-[11px] font-extrabold text-teal-700 text-center pt-1">
                  + {selectedCount - 5} more students
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingBulk}
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingBulk}
                onClick={handleBulkDeleteConfirm}
                className="rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-rose-700 hover:to-red-700 disabled:opacity-50"
              >
                {isDeletingBulk ? "Deleting Students..." : `Delete ${selectedCount} Students`}
              </button>
            </div>
          </div>
        </div>
      )}

      {isClassDeleteModalOpen && (
        <div className="app-glass-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 animate-hero-fade-in">
          <div className="app-glass-modal w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-rose-700 font-sans flex items-center gap-2">
                <span>🗑️</span> Delete {filterDept} - {filterClass} Student Roster?
              </h3>
              <button
                type="button"
                disabled={isDeletingBulk}
                onClick={() => setIsClassDeleteModalOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 space-y-2">
              <p className="text-xs text-rose-900 font-bold leading-relaxed">
                This will permanently delete all <span className="text-base font-black text-rose-700">{classSummary?.count || filteredStudents.length}</span> students from the selected department ({filterDept}) and class ({filterClass}).
              </p>
              <p className="text-[11px] text-slate-600 font-semibold">
                Previously generated attendance-sheet records will remain unchanged.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Type the confirmation text to continue: <strong className="font-mono text-slate-900 select-all">DELETE {filterDept} {filterClass}</strong>
              </label>
              <input
                type="text"
                value={classDeleteConfirmInput}
                onChange={(e) => setClassDeleteConfirmInput(e.target.value)}
                placeholder={`DELETE ${filterDept} ${filterClass}`}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:border-rose-500 focus:bg-white focus:outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingBulk}
                onClick={() => setIsClassDeleteModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  isDeletingBulk ||
                  classDeleteConfirmInput.trim().toUpperCase() !== `DELETE ${filterDept} ${filterClass}`.toUpperCase()
                }
                onClick={handleClassDeleteConfirm}
                className="rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-rose-700 hover:to-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeletingBulk ? "Deleting Class Roster..." : `Delete All ${classSummary?.count || filteredStudents.length} Students`}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default StudentList;
