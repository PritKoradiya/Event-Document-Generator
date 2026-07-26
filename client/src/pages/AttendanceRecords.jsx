import { useEffect, useState } from "react";
import ModuleHeader from "../components/ui/ModuleHeader.jsx";
import AttendanceSheetSvgPreview from "../components/attendance/AttendanceSheetSvgPreview.jsx";
import {
  getAttendanceSheets,
  regenerateAttendanceSheet,
  duplicateAttendanceSheet,
  deleteAttendanceSheet
} from "../services/attendanceSheetApi.js";
import downloadAttendanceSheetPdf from "../utils/downloadAttendanceSheetPdf.js";
import validateAttendanceSheetLayout from "../utils/validateAttendanceSheetLayout.js";

const DEPARTMENTS = ["CE/IT", "CSE", "AIML", "ME", "EC", "CIVIL"];
const CLASSES = ["CE4", "CE6", "CSE2", "AIML1", "ME2", "EC2"];

const formatPdfFileName = (heading, className, date, sheetId) => {
  const sanitize = (str) => (str || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");
  const cleanHeading = sanitize(heading) || "Event";
  const cleanClass = sanitize(className) || "Class";
  const cleanDate = sanitize(date) || "Date";
  const cleanId = sanitize(sheetId) || "Sheet";

  return `Attendance_Sheet_${cleanHeading}_${cleanClass}_${cleanDate}_${cleanId}.pdf`;
};

function AttendanceRecords() {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterDept, setFilterDept] = useState("All");
  const [filterClass, setFilterClass] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // View modal state
  const [activeSheetModal, setActiveSheetModal] = useState(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Open action dropdown menu ID
  const [openMenuId, setOpenMenuId] = useState(null);

  // Toast notice
  const [notice, setNotice] = useState("");

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 4000);
  };

  const loadSheets = async () => {
    setLoading(true);
    try {
      const res = await getAttendanceSheets();
      if (res && res.data) {
        setSheets(res.data);
      }
    } catch (e) {
      console.error("Failed to fetch attendance sheets", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSheets();
  }, []);

  // Delete Action
  const handleDelete = async (id, heading) => {
    setOpenMenuId(null);
    if (window.confirm(`Are you sure you want to delete attendance record '${heading}'?`)) {
      try {
        await deleteAttendanceSheet(id);
        if (activeSheetModal && activeSheetModal.id === id) {
          setActiveSheetModal(null);
        }
        showNotice("Attendance sheet record deleted.");
        loadSheets();
      } catch (e) {
        showNotice("Failed to delete attendance sheet.");
      }
    }
  };

  // REGENERATE ACTION (Part 8)
  const handleRegenerate = async (sheet) => {
    setOpenMenuId(null);
    const confirmMsg =
      "This will replace the saved student snapshot with the current active students of the selected department and class. Continue?";

    if (window.confirm(confirmMsg)) {
      try {
        const res = await regenerateAttendanceSheet(sheet.id);
        if (res && res.success) {
          showNotice(`Student roster refreshed for ${sheet.heading}.`);
          if (activeSheetModal && activeSheetModal.id === sheet.id) {
            setActiveSheetModal(res.data);
          }
          loadSheets();
        }
      } catch (e) {
        showNotice("Failed to refresh student list.");
      }
    }
  };

  // DUPLICATE ACTION (Part 9)
  const handleDuplicate = async (id) => {
    setOpenMenuId(null);
    try {
      const res = await duplicateAttendanceSheet(id);
      if (res && res.success) {
        showNotice("Attendance sheet duplicated as draft.");
        loadSheets();
      }
    } catch (e) {
      showNotice("Failed to duplicate attendance sheet.");
    }
  };

  // DIRECT VECTOR PDF DOWNLOAD ACTION (Part 15)
  const handleDownloadPdf = async (sheet) => {
    const targetSheet = sheet || activeSheetModal;
    if (!targetSheet) return;

    const validation = validateAttendanceSheetLayout(targetSheet);
    if (!validation.valid) {
      alert(`Cannot export PDF: ${validation.errors.join(", ")}`);
      return;
    }

    setIsDownloadingPdf(true);

    try {
      const fileName = formatPdfFileName(
        targetSheet.heading,
        targetSheet.className,
        targetSheet.date,
        targetSheet.id
      );

      // Direct vector PDF drawing with jsPDF
      await downloadAttendanceSheetPdf({
        sheet: targetSheet,
        fileName
      });
      showNotice("Attendance sheet vector PDF downloaded successfully.");
    } catch (err) {
      console.error("Failed to download PDF", err);
      showNotice(err.message || "Failed to download PDF.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const filteredSheets = sheets.filter((sheet) => {
    if (filterDept !== "All" && sheet.department.toLowerCase() !== filterDept.toLowerCase()) {
      return false;
    }
    if (filterClass !== "All" && sheet.className.toLowerCase() !== filterClass.toLowerCase()) {
      return false;
    }
    if (filterStatus !== "All" && sheet.status.toLowerCase() !== filterStatus.toLowerCase()) {
      return false;
    }
    return true;
  });

  return (
    <section className="space-y-6 pb-12">
      {/* Top Header */}
      <ModuleHeader
        title="Attendance Records"
        subtitle="Search, filter, view, regenerate student snapshots, and export saved class attendance sheets to PDF."
        theme="attendance"
        badge="Record Workspace"
        primaryAction={{
          label: "Create Attendance Sheet",
          to: "/create-attendance-sheet"
        }}
      />

      {/* Toast Notice */}
      {notice && (
        <div className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-800 shadow-md animate-hero-fade-in flex items-center gap-2">
          <span>ℹ️</span>
          <span>{notice}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="app-glass-toolbar p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Department
            </label>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
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
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Class
            </label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
            >
              <option value="All">All Classes</option>
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Generated">Generated</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-bold text-slate-500">
          Total Saved Records: <strong className="text-teal-700">{filteredSheets.length}</strong>
        </div>
      </div>

      {/* Sheets Records Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 font-bold">
          Loading saved attendance records...
        </div>
      ) : filteredSheets.length === 0 ? (
        <div className="app-glass-surface p-12 text-center space-y-3">
          <span className="text-4xl">📁</span>
          <h3 className="text-lg font-black text-slate-800">No attendance sheets found</h3>
          <p className="text-xs font-medium text-slate-500 max-w-md mx-auto">
            No saved attendance records match your filter. Create your first attendance sheet using the button below.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSheets.map((sheet) => (
            <div
              key={sheet.id}
              className="group app-glass-card p-6 flex flex-col justify-between"
            >
              <div>
                {/* Header Tag */}
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    ID: {sheet.id}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      sheet.status === "Generated"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {sheet.status}
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-950 leading-snug line-clamp-2">
                  {sheet.heading || "Attendance Sheet"}
                </h3>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-mono uppercase">Dept & Class</span>
                    <strong className="text-teal-700 font-bold">{sheet.department} - {sheet.className}</strong>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-mono uppercase">Date</span>
                    <strong className="text-slate-800 font-bold">{sheet.date || "—"}</strong>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-mono uppercase">Students</span>
                    <strong className="text-slate-800 font-bold">{sheet.studentCount || (sheet.students || []).length} Students</strong>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-mono uppercase">Pages</span>
                    <strong className="text-emerald-700 font-bold">{sheet.pageCount || Math.ceil((sheet.students || []).length / 39) || 1} Page(s)</strong>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-500 font-medium">
                  Coordinator: <strong className="text-slate-800">{sheet.eventCoordinatorName || "—"}</strong>
                </div>
              </div>

              {/* Action Buttons Toolbar & Dropdown Menu */}
              <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 relative">
                <button
                  type="button"
                  onClick={() => setActiveSheetModal(sheet)}
                  className="flex-1 rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition"
                >
                  View
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadPdf(sheet)}
                  className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition flex items-center gap-1"
                >
                  <span>📥</span>
                  <span>PDF</span>
                </button>

                {/* More Options Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenuId(openMenuId === sheet.id ? null : sheet.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
                    title="More Options"
                  >
                    •••
                  </button>

                  {openMenuId === sheet.id && (
                    <div className="absolute right-0 bottom-10 z-30 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl space-y-1 animate-hero-fade-in">
                      <button
                        type="button"
                        onClick={() => handleRegenerate(sheet)}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-800 flex items-center gap-2"
                      >
                        <span>🔄</span>
                        <span>Refresh Student List</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicate(sheet.id)}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-800 flex items-center gap-2"
                      >
                        <span>📋</span>
                        <span>Duplicate as Draft</span>
                      </button>

                      <div className="border-t border-slate-100 my-1" />

                      <button
                        type="button"
                        onClick={() => handleDelete(sheet.id, sheet.heading)}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      >
                        <span>🗑️</span>
                        <span>Delete Record</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW ATTENDANCE PREVIEW MODAL */}
      {activeSheetModal && (
        <div className="app-glass-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-hero-fade-in">
          <div className="app-glass-modal w-full max-w-4xl p-6 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-950 font-sans">
                  {activeSheetModal.heading || "Attendance Sheet"}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {activeSheetModal.department} • Class {activeSheetModal.className} • Date: {activeSheetModal.date}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRegenerate(activeSheetModal)}
                  className="rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 transition"
                  title="Refresh student roster"
                >
                  🔄 Refresh Roster
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadPdf(activeSheetModal)}
                  disabled={isDownloadingPdf}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-blue-500 hover:to-indigo-500 transition disabled:opacity-60"
                >
                  {isDownloadingPdf ? "Preparing Vector PDF..." : "📥 Export Vector PDF"}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSheetModal(null)}
                  className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Multipage SVG Preview */}
            <div className="py-2">
              <AttendanceSheetSvgPreview sheetData={activeSheetModal} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AttendanceRecords;
