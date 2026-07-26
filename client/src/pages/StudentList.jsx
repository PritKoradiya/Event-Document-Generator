import { useEffect, useState } from "react";
import ModuleHeader from "../components/ui/ModuleHeader.jsx";
import {
  getStudents,
  createStudent,
  bulkCreateStudents,
  getStudentCsvTemplate,
  importStudentCsv,
  updateStudent,
  deleteStudent,
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
        showToast("Student record deleted.");
        loadStudentData();
      } catch (e) {
        showToast("Failed to delete student.");
      }
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
        // Textarea fallback
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

  // Delete all students in filtered class
  const handleDeleteClassStudents = async () => {
    if (filterDept === "All" || filterClass === "All") {
      alert("Please select a specific Department and Class filter first.");
      return;
    }
    if (
      window.confirm(
        `Are you sure you want to delete ALL students for ${filterDept} - ${filterClass}?`
      )
    ) {
      try {
        await deleteStudentsByClass(filterDept, filterClass);
        showToast(`Deleted all students for ${filterDept} - ${filterClass}.`);
        loadStudentData();
      } catch (e) {
        showToast("Failed to delete class students.");
      }
    }
  };

  return (
    <section className="space-y-6 pb-12">
      {/* Module Header */}
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800 shadow-md animate-hero-fade-in flex items-center gap-2">
          <span>✅</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Action & Filter Toolbar */}
      <div className="app-glass-toolbar p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Filters */}
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

          {/* Action Buttons */}
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
                onClick={handleDeleteClassStudents}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 shadow-sm transition"
              >
                <span>🗑️</span>
                <span>Clear {filterClass} Class</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-slate-600">
          <div className="flex items-center gap-3">
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

          <div className="text-[11px] text-slate-400">
            Expected Attendance Pages:{" "}
            <strong className="text-slate-700 font-mono">
              {Math.ceil(filteredStudents.length / 39) || 1} Page(s)
            </strong>
          </div>
        </div>
      </div>

      {/* Student List Table */}
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
                  <th className="px-5 py-3.5">Sr. No.</th>
                  <th className="px-5 py-3.5">Enrollment No.</th>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Class</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredStudents.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-teal-50/40 transition">
                    <td className="px-5 py-3 font-mono font-bold text-slate-500 text-xs">
                      {idx + 1}
                    </td>
                    <td className="px-5 py-3 font-mono font-extrabold text-slate-900 text-xs">
                      {student.enrollmentNo}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900">
                      {student.studentName}
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold text-slate-600">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 border border-slate-200">
                        {student.department}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs font-bold text-teal-700">
                      <span className="rounded-lg bg-teal-50 px-2 py-1 border border-teal-200/60">
                        {student.className}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditClick(student)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-teal-700 transition"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(student.id, student.studentName)}
                          className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SINGLE STUDENT ADD / EDIT MODAL */}
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

      {/* BULK CSV IMPORT MODAL */}
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

            {/* PART 2: IMPORT SUMMARY CARDS & SKIPPED/INVALID ROWS TABLE */}
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

                {/* Skipped / Invalid Rows Details Table */}
                {skippedRowsTable.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-bold text-slate-700 mb-1.5">
                      ⚠️ Skipped / Invalid Rows ({skippedRowsTable.length}):
                    </p>
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 font-bold text-slate-600 border-b border-slate-200 sticky top-0 font-mono">
                          <tr>
                            <th className="px-3 py-1.5">Row No.</th>
                            <th className="px-3 py-1.5">Enrollment No.</th>
                            <th className="px-3 py-1.5">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {skippedRowsTable.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50">
                              <td className="px-3 py-1.5 font-mono text-slate-500">{item.rowNo}</td>
                              <td className="px-3 py-1.5 font-mono font-bold text-slate-800">{item.enrollmentNo}</td>
                              <td className="px-3 py-1.5 text-rose-600 font-medium">{item.reason}</td>
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
                    Department *
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
                    Class *
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

              {/* CSV Upload Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    CSV Roster File (studentCsv)
                  </label>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="text-xs font-bold text-teal-700 underline hover:text-teal-900"
                  >
                    Download CSV Template
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    name="studentCsv"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer"
                  />
                </div>

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

              {/* Alternative Raw Text Import */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Or Paste CSV Content (enrollmentNo,studentName)
                </label>
                <textarea
                  rows={4}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`enrollmentNo,studentName\n24SE02CE001,STUDENT NAME ONE\n24SE02CE002,STUDENT NAME TWO`}
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
    </section>
  );
}

export default StudentList;
