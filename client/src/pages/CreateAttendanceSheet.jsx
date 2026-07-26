import { useEffect, useRef, useState } from "react";
import ModuleHeader from "../components/ui/ModuleHeader.jsx";
import AttendanceSheetSvgPreview from "../components/attendance/AttendanceSheetSvgPreview.jsx";
import AttendanceTypographyTestPanel from "../components/attendance/AttendanceTypographyTestPanel.jsx";
import { getStudents } from "../services/attendanceStudentApi.js";
import {
  createAttendanceSheet,
  saveDraftAttendanceSheet
} from "../services/attendanceSheetApi.js";
import downloadAttendanceSheetPdf from "../utils/downloadAttendanceSheetPdf.js";
import validateAttendanceSheetLayout from "../utils/validateAttendanceSheetLayout.js";

const DEPARTMENTS = ["CE/IT", "CSE", "AIML", "ME", "EC", "CIVIL"];
const CLASSES = ["CE4", "CE6", "CSE2", "AIML1", "ME2", "EC2"];

// Helper to format safe filename
const formatPdfFileName = (heading, className, date, sheetId) => {
  const sanitize = (str) => (str || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");
  const cleanHeading = sanitize(heading) || "Event";
  const cleanClass = sanitize(className) || "Class";
  const cleanDate = sanitize(date) || "Date";
  const cleanId = sanitize(sheetId) || "Sheet";

  return `Attendance_Sheet_${cleanHeading}_${cleanClass}_${cleanDate}_${cleanId}.pdf`;
};

function CreateAttendanceSheet() {
  const previewRef = useRef(null);

  const [department, setDepartment] = useState("CE/IT");
  const [heading, setHeading] = useState("Expert Talk - Prompt Engineering");
  const [className, setClassName] = useState("CE4");
  const [date, setDate] = useState(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  });
  const [eventCoordinatorName, setEventCoordinatorName] = useState("Dr. Jayshri Patil");

  // Dynamic matching students
  const [matchingStudents, setMatchingStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Form errors & status notifications
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Stored / Generated Attendance Sheet State for live preview
  const [generatedSheet, setGeneratedSheet] = useState(null);

  // Fetch matching students whenever department or className changes
  useEffect(() => {
    const fetchMatching = async () => {
      if (!department || !className) {
        setMatchingStudents([]);
        return;
      }
      setLoadingStudents(true);
      try {
        const res = await getStudents({ department, className });
        if (res && res.data) {
          setMatchingStudents(res.data);
        } else {
          setMatchingStudents([]);
        }
      } catch (e) {
        console.error("Failed to fetch matching students", e);
        setMatchingStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchMatching();
  }, [department, className]);

  // Reset form
  const handleReset = () => {
    setDepartment("CE/IT");
    setHeading("");
    setClassName("CE4");
    setDate("");
    setEventCoordinatorName("");
    setErrorMessage("");
    setSuccessMessage("");
    setGeneratedSheet(null);
  };

  // Validate form inputs
  const validateForm = () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!department.trim()) {
      setErrorMessage("Department is required.");
      return false;
    }
    if (!heading.trim()) {
      setErrorMessage("Event Heading is required.");
      return false;
    }
    if (!className.trim()) {
      setErrorMessage("Class is required.");
      return false;
    }
    if (!date.trim()) {
      setErrorMessage("Date is required.");
      return false;
    }
    if (!eventCoordinatorName.trim()) {
      setErrorMessage("Event Coordinator Name is required.");
      return false;
    }
    if (matchingStudents.length === 0) {
      setErrorMessage("No students found for the selected department and class.");
      return false;
    }
    return true;
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!department || !className) {
      setErrorMessage("Please select Department and Class before saving draft.");
      return;
    }

    try {
      const res = await saveDraftAttendanceSheet({
        department,
        heading,
        className,
        date,
        eventCoordinatorName,
        students: matchingStudents
      });

      if (res && res.success) {
        setSuccessMessage("Draft attendance sheet saved successfully!");
        setGeneratedSheet(res.data);
      }
    } catch (err) {
      setErrorMessage(err.message || "Failed to save draft.");
    }
  };

  // Generate Attendance Sheet
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const res = await createAttendanceSheet({
        department,
        heading,
        className,
        date,
        eventCoordinatorName,
        students: matchingStudents
      });

      if (res && res.success) {
        setSuccessMessage(
          `Attendance sheet generated successfully! Total ${matchingStudents.length} students across ${res.data.pageCount} page(s). Click 'Download PDF' below to export crisp vector PDF.`
        );
        setGeneratedSheet(res.data);

        // Smooth scroll to preview section
        setTimeout(() => {
          const previewEl = document.getElementById("attendance-live-preview");
          if (previewEl) {
            previewEl.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      }
    } catch (err) {
      setErrorMessage(err.message || "Failed to generate attendance sheet.");
    }
  };

  // DIRECT VECTOR MULTIPAGE PDF DOWNLOAD ACTION (Part 14)
  const handleDownloadPdf = async () => {
    const sheetToExport = generatedSheet || {
      id: "TEMP-PREVIEW",
      schoolName: "School of Engineering, PPSU",
      department,
      heading,
      className,
      date,
      eventCoordinatorName,
      students: matchingStudents
    };

    // Validate layout before PDF generation
    const validation = validateAttendanceSheetLayout(sheetToExport);
    if (!validation.valid) {
      setErrorMessage(`Validation failed: ${validation.errors.join("; ")}`);
      return;
    }

    setIsDownloadingPdf(true);
    setErrorMessage("");

    try {
      const fileName = formatPdfFileName(
        sheetToExport.heading,
        sheetToExport.className,
        sheetToExport.date,
        sheetToExport.id
      );

      // Direct vector PDF export using jsPDF drawing methods
      await downloadAttendanceSheetPdf({
        sheet: sheetToExport,
        fileName
      });
      setSuccessMessage("Crisp vector attendance sheet PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF download error", err);
      setErrorMessage(err.message || "Failed to generate attendance sheet PDF.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const expectedPages = Math.ceil(matchingStudents.length / 39) || 1;

  return (
    <section className="space-y-8 pb-16">
      {/* Top Header */}
      <ModuleHeader
        title="Create Attendance Sheet"
        subtitle="Select a stored student class and generate a multipage attendance sheet in the mentor-provided format."
        theme="attendance"
        badge="Attendance Form"
      />

      {/* DEV-ONLY TYPOGRAPHY & LAYOUT CALIBRATION TEST PANEL (Part 17) */}
      {import.meta.env.DEV && (
        <AttendanceTypographyTestPanel
          onLoadTestScenario={({ department: d, className: c, heading: h, students: s }) => {
            setDepartment(d);
            setClassName(c);
            setHeading(h);
            setMatchingStudents(s);
            setGeneratedSheet(null);
          }}
          onTriggerDirectPdf={async (testSheet) => {
            await downloadAttendanceSheetPdf({
              sheet: testSheet,
              fileName: `Test_Attendance_Sheet_${testSheet.students.length}_Students.pdf`
            });
          }}
        />
      )}

      {/* Main Form Box */}
      <div className="app-glass-surface-strong p-6 sm:p-8 space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-950 font-sans">
              Attendance Sheet Details Form
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Fill in the academic details below. Student list is fetched dynamically from the Student Master.
            </p>
          </div>

          {/* Default Display-Only Tags */}
          <div className="flex flex-wrap gap-2 text-[11px] font-bold text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1 border border-slate-200">
              School of Engineering, PPSU
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 border border-slate-200">
              Signature column remains blank
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 animate-hero-fade-in flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="rounded-2xl border border-teal-300 bg-teal-50 p-4 text-xs font-bold text-teal-800 animate-hero-fade-in flex items-center gap-2">
            <span>🎉</span>
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Row 1: Department & Class Selectors */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                1. Department *
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 shadow-sm focus:border-teal-500 focus:bg-white focus:outline-none"
                required
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d} Department
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                2. Class *
              </label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 shadow-sm focus:border-teal-500 focus:bg-white focus:outline-none"
                required
              >
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    Class- {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Student Roster Badge */}
          <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-50/80 to-emerald-50/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white font-black text-base shadow-md">
                🎓
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-teal-900">
                  Target Student Roster
                </p>
                <p className="text-xs font-bold text-slate-700">
                  {loadingStudents ? (
                    "Loading matching students..."
                  ) : (
                    <>
                      Found <strong className="text-teal-700">{matchingStudents.length} Students</strong> for {department} - {className}
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-black text-teal-800">
              <div className="bg-white px-3 py-1.5 rounded-xl border border-teal-200 shadow-sm">
                Expected Pages: <strong className="text-emerald-700">{expectedPages}</strong> (39 rows/pg)
              </div>
            </div>
          </div>

          {/* Row 2: Event Heading */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
              3. Event / Topic Heading *
            </label>
            <input
              type="text"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              placeholder="e.g. Expert Talk - Prompt Engineering"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 shadow-sm focus:border-teal-500 focus:bg-white focus:outline-none"
              required
            />
          </div>

          {/* Row 3: Date & Coordinator Name */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                4. Date *
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="e.g. 23/07/2026"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 shadow-sm focus:border-teal-500 focus:bg-white focus:outline-none font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                5. Event Coordinator Name *
              </label>
              <input
                type="text"
                value={eventCoordinatorName}
                onChange={(e) => setEventCoordinatorName(e.target.value)}
                placeholder="e.g. Dr. Jayshri Patil"
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 shadow-sm focus:border-teal-500 focus:bg-white focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="w-full sm:w-auto rounded-2xl border border-slate-300 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Reset Form
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="w-full sm:w-auto rounded-2xl border border-teal-300 bg-teal-50 px-5 py-3 text-xs font-bold text-teal-800 hover:bg-teal-100 shadow-sm transition"
              >
                Save Draft
              </button>

              <button
                type="submit"
                className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-7 py-3 text-sm font-black text-white shadow-lg shadow-teal-500/30 hover:from-emerald-500 hover:to-teal-500 transition active:scale-98"
              >
                Generate Attendance Sheet
              </button>

              {/* DOWNLOAD VECTOR PDF BUTTON */}
              {generatedSheet && (
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/30 hover:from-blue-500 hover:to-indigo-500 transition active:scale-98 disabled:opacity-60"
                >
                  <span>📥</span>
                  <span>{isDownloadingPdf ? "Preparing Vector PDF..." : "Download Vector PDF"}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* LIVE MULTIPAGE PREVIEW SECTION */}
      <div id="attendance-live-preview" className="pt-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-[880px] mx-auto">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-teal-600">
              DOCUMENT LIVE PREVIEW
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 font-sans">
              Attendance Sheet Preview
            </h2>
          </div>

          {generatedSheet && (
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-md hover:from-blue-500 hover:to-indigo-500 transition disabled:opacity-60"
            >
              <span>📥</span>
              <span>{isDownloadingPdf ? "Preparing Vector PDF..." : "Download Vector PDF"}</span>
            </button>
          )}
        </div>

        <AttendanceSheetSvgPreview
          ref={previewRef}
          sheetData={
            generatedSheet || {
              department,
              heading,
              className,
              date,
              eventCoordinatorName,
              students: matchingStudents
            }
          }
        />
      </div>
    </section>
  );
}

export default CreateAttendanceSheet;
