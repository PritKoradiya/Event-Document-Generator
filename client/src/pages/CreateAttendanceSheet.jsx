import { useEffect, useRef, useState, useCallback } from "react";
import ModuleHeader from "../components/ui/ModuleHeader.jsx";
import AttendanceSheetSvgPreview from "../components/attendance/AttendanceSheetSvgPreview.jsx";
import AttendanceTypographyTestPanel from "../components/attendance/AttendanceTypographyTestPanel.jsx";
import DepartmentClassSelector from "../components/attendance/DepartmentClassSelector.jsx";
import { getStudents } from "../services/attendanceStudentApi.js";
import { createAttendanceSheet, saveAttendanceDraft } from "../services/attendanceSheetApi.js";
import { getReadableAttendanceError, toInputDate, toDisplayDate, toApiDate } from "../utils/attendanceErrorUtils.js";
import { downloadAttendanceSheetPdf } from "../utils/downloadAttendanceSheetPdf.js";
import { validateAttendanceSheetLayout } from "../utils/validateAttendanceSheetLayout.js";

// Helper to format safe filename
const formatPdfFileName = (heading, className, date, sheetId) => {
  const sanitize = (str) => (str || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");
  const cleanHeading = sanitize(heading) || "Event";
  const cleanClass = sanitize(className) || "Class";
  const cleanDate = sanitize(date) || "Date";
  const cleanId = sanitize(sheetId) || "Sheet";

  return `Attendance_Sheet_${cleanHeading}__${cleanClass}__${cleanDate}_${cleanId}.pdf`;
};

function CreateAttendanceSheet() {
  const previewRef = useRef(null);

  // Form State (PART 3)
  const [department, setDepartment] = useState("CE/IT");
  const [className, setClassName] = useState("CE4");
  const [eventHeading, setEventHeading] = useState("Expert Talk - Prompt Engineering");
  const [eventDate, setEventDate] = useState(() => toInputDate(new Date()));
  const [coordinatorName, setCoordinatorName] = useState("Dr. Jayshri Patil");

  // Roster State
  const [matchingStudents, setMatchingStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Status notifications & loaders
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Stored / Generated Attendance Sheet State for live preview
  const [generatedSheet, setGeneratedSheet] = useState(null);

  // Request counter for cancelling/ignoring stale async responses
  const activeRequestIdRef = useRef(0);

  // PART 12: Load Roster function with stale-response protection
  const loadRoster = useCallback(async (dept, cls) => {
    // If department or className empty or sentinel, clear roster
    if (!dept || !cls || dept === "All" || cls === "All" || dept.startsWith("__") || cls.startsWith("__")) {
      setMatchingStudents([]);
      setLoadingStudents(false);
      return;
    }

    const currentRequestId = ++activeRequestIdRef.current;
    setLoadingStudents(true);
    setMatchingStudents([]); // Immediately clear previous roster

    try {
      const res = await getStudents({ department: dept, className: cls });

      // Only apply if this request is still the latest one
      if (currentRequestId === activeRequestIdRef.current) {
        if (res && Array.isArray(res.data)) {
          setMatchingStudents(res.data);
          if (res.data.length === 0) {
            setErrorMessage("No students were found for the selected department and class.");
          } else {
            setErrorMessage("");
          }
        } else {
          setMatchingStudents([]);
          setErrorMessage("No students were found for the selected department and class.");
        }
      }
    } catch (e) {
      if (currentRequestId === activeRequestIdRef.current) {
        console.error("Failed to fetch matching students", e);
        setMatchingStudents([]);
        setErrorMessage(getReadableAttendanceError(e));
      }
    } finally {
      if (currentRequestId === activeRequestIdRef.current) {
        setLoadingStudents(false);
      }
    }
  }, []);

  // PART 13 & PART 14: Department & Class Change triggers
  const handleDepartmentChange = (newDept) => {
    setDepartment(newDept);
    setClassName(""); // PART 13: Clear class on department change
    setMatchingStudents([]); // Clear roster immediately
    setErrorMessage("");
    setSuccessMessage("");
    setGeneratedSheet(null);
  };

  const handleClassChange = (newClass) => {
    setClassName(newClass);
    setErrorMessage("");
    setSuccessMessage("");
    setGeneratedSheet(null);
  };

  useEffect(() => {
    loadRoster(department, className);
  }, [department, className, loadRoster]);

  // Reset form
  const handleReset = () => {
    setDepartment("");
    setClassName("");
    setEventHeading("");
    setEventDate(toInputDate(new Date()));
    setCoordinatorName("");
    setMatchingStudents([]);
    setErrorMessage("");
    setSuccessMessage("");
    setGeneratedSheet(null);
  };

  // Validate form inputs
  const validateForm = () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!department || department.startsWith("__")) {
      setErrorMessage("Please select a valid Department.");
      return false;
    }
    if (!className || className.startsWith("__")) {
      setErrorMessage("Please select a valid Class.");
      return false;
    }
    if (!eventHeading.trim()) {
      setErrorMessage("Event Heading is required.");
      return false;
    }
    if (!eventDate) {
      setErrorMessage("Date is required.");
      return false;
    }
    if (!coordinatorName.trim()) {
      setErrorMessage("Event Coordinator Name is required.");
      return false;
    }
    if (matchingStudents.length === 0) {
      setErrorMessage("No students were found for the selected department and class.");
      return false;
    }
    return true;
  };

  // PART 16: Save Draft Handler
  const handleSaveDraft = async () => {
    if (!department || !className || department.startsWith("__") || className.startsWith("__")) {
      setErrorMessage("Please select a valid Department and Class before saving draft.");
      return;
    }

    setIsSavingDraft(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        department,
        className,
        eventHeading: eventHeading.trim(),
        heading: eventHeading.trim(),
        eventDate: toApiDate(eventDate),
        date: toDisplayDate(eventDate),
        coordinatorName: coordinatorName.trim(),
        eventCoordinatorName: coordinatorName.trim(),
        students: matchingStudents,
        studentsSnapshot: matchingStudents
      };

      const res = await saveAttendanceDraft(payload);

      if (res && res.success) {
        setSuccessMessage("Draft attendance sheet saved successfully!");
        setGeneratedSheet(res.data);
      }
    } catch (err) {
      setErrorMessage(getReadableAttendanceError(err));
    } finally {
      setIsSavingDraft(false);
    }
  };

  // PART 15: Generate Attendance Sheet Handler
  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm() || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        department,
        className,
        eventHeading: eventHeading.trim(),
        heading: eventHeading.trim(),
        eventDate: toApiDate(eventDate),
        date: toDisplayDate(eventDate),
        coordinatorName: coordinatorName.trim(),
        eventCoordinatorName: coordinatorName.trim(),
        students: matchingStudents,
        studentsSnapshot: matchingStudents
      };

      const res = await createAttendanceSheet(payload);

      if (res && res.success) {
        const createdData = res.data;
        setGeneratedSheet(createdData);
        setSuccessMessage(
          `Attendance sheet generated successfully! Total ${matchingStudents.length} students across ${createdData.pageCount || Math.ceil(matchingStudents.length / 39) || 1} page(s). Click 'Download Vector PDF' to export.`
        );

        // Smooth scroll to preview section
        setTimeout(() => {
          const previewEl = document.getElementById("attendance-live-preview");
          if (previewEl) {
            previewEl.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      }
    } catch (err) {
      setErrorMessage(getReadableAttendanceError(err));
    } finally {
      setIsGenerating(false);
    }
  };

  // PART 24: Direct Vector Multipage PDF Download Action
  const handleDownloadPdf = async () => {
    const sheetToExport = generatedSheet || {
      id: "TEMP-PREVIEW",
      schoolName: "School of Engineering, PPSU",
      department,
      heading: eventHeading,
      eventHeading,
      className,
      date: toDisplayDate(eventDate),
      eventDate: toApiDate(eventDate),
      coordinatorName,
      eventCoordinatorName: coordinatorName,
      students: matchingStudents,
      studentsSnapshot: matchingStudents
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
        sheetToExport.eventHeading || sheetToExport.heading,
        sheetToExport.className,
        sheetToExport.eventDate || sheetToExport.date,
        sheetToExport.id
      );

      await downloadAttendanceSheetPdf({
        sheet: sheetToExport,
        fileName
      });
      setSuccessMessage("Crisp vector attendance sheet PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF download error", err);
      setErrorMessage(getReadableAttendanceError(err));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const expectedPages = Math.ceil(matchingStudents.length / 39) || 0;
  const isGenerateDisabled =
    !department ||
    !className ||
    !eventHeading.trim() ||
    !eventDate ||
    !coordinatorName.trim() ||
    matchingStudents.length === 0 ||
    loadingStudents ||
    isGenerating;

  return (
    <section className="space-y-8 pb-16">
      {/* Top Header */}
      <ModuleHeader
        title="Create Attendance Sheet"
        subtitle="Select a stored student class and generate a multipage attendance sheet in the mentor-provided format."
        theme="attendance"
        badge="Attendance Form"
      />

      {/* DEV-ONLY TYPOGRAPHY & LAYOUT CALIBRATION TEST PANEL */}
      {import.meta.env.DEV && (
        <AttendanceTypographyTestPanel
          onLoadTestScenario={({ department: d, className: c, heading: h, students: s }) => {
            setDepartment(d);
            setClassName(c);
            setEventHeading(h);
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
          <DepartmentClassSelector
            department={department}
            className={className}
            onDepartmentChange={handleDepartmentChange}
            onClassChange={handleClassChange}
            required={true}
            allowCreate={true}
          />

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
                    "Loading student roster..."
                  ) : department && className ? (
                    <>
                      Found <strong className="text-teal-700">{matchingStudents.length} Students</strong> for {department} - {className}
                    </>
                  ) : (
                    <span className="text-slate-500 font-normal">Select a department and class to load roster.</span>
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
              value={eventHeading}
              onChange={(e) => setEventHeading(e.target.value)}
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
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
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
                value={coordinatorName}
                onChange={(e) => setCoordinatorName(e.target.value)}
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
                disabled={isSavingDraft || isGenerating}
                className="w-full sm:w-auto rounded-2xl border border-teal-300 bg-teal-50 px-5 py-3 text-xs font-bold text-teal-800 hover:bg-teal-100 shadow-sm transition disabled:opacity-50"
              >
                {isSavingDraft ? "Saving Draft..." : "Save Draft"}
              </button>

              <button
                type="submit"
                disabled={isGenerateDisabled}
                className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-7 py-3 text-sm font-black text-white shadow-lg shadow-teal-500/30 hover:from-emerald-500 hover:to-teal-500 transition active:scale-98 disabled:opacity-50"
              >
                {isGenerating ? "Generating Attendance Sheet..." : "Generate Attendance Sheet"}
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
              heading: eventHeading,
              eventHeading,
              className,
              date: toDisplayDate(eventDate),
              eventDate: toDisplayDate(eventDate),
              coordinatorName,
              eventCoordinatorName: coordinatorName,
              students: matchingStudents
            }
          }
        />
      </div>
    </section>
  );
}

export default CreateAttendanceSheet;
