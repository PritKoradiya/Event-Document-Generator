import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import EventReportPreview, { getAssetUrl } from "../components/EventReportPreview.jsx";
import { getEventReports, deleteEventReport, updateEventReport } from "../services/eventReportApi.js";
import { downloadEventReportPdf } from "../utils/downloadEventReportPdf.js";
import { normalizeEventReportData } from "../utils/normalizeEventReportData.js";
import StatusPill from "../components/ui/StatusPill.jsx";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold outline-none transition focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-100";

const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm font-semibold outline-none transition focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-100 min-h-24 resize-y";

function EventReports() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editReport, setEditReport] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [removedPhotos, setRemovedPhotos] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]); // Array of { file, preview }

  const photosRef = useRef(newPhotos);
  useEffect(() => {
    photosRef.current = newPhotos;
  }, [newPhotos]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => {
        if (p.preview.startsWith("blob:")) {
          URL.revokeObjectURL(p.preview);
        }
      });
    };
  }, []);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const result = await getEventReports();
      const reportsList = result.data || [];
      setReports(reportsList);

      if (selectedReport) {
        const updated = reportsList.find(
          (r) => r._id === selectedReport._id || r.id === selectedReport.id
        );
        if (updated) {
          setSelectedReport(updated);
        } else {
          setSelectedReport(reportsList[0] || null);
        }
      } else if (reportsList.length > 0) {
        setSelectedReport(reportsList[0]);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error.message || "Unable to fetch event reports. Please check if the server is running."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleView = (report) => {
    setSelectedReport(report);
    const previewEl = document.getElementById("report-preview-section");
    if (previewEl) {
      previewEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleEditClick = (report) => {
    setEditReport(report);
    setEditFormData({
      reportDate: report.reportDate || "",
      dateOfEvent: report.eventDate || report.dateOfEvent || "",
      time: report.eventTime || report.time || "",
      resourcePerson: report.resourcePerson || "",
      eventName: report.eventName || "",
      noOfParticipants: report.numberOfParticipants || report.noOfParticipants || "",
      attendee: report.attendee || "",
      venue: report.venue || "",
      eventOutline: report.eventOutline || "",
      objectives: Array.isArray(report.eventObjectives)
        ? report.eventObjectives.join("\n")
        : report.objectives || "",
      outcomes: Array.isArray(report.eventOutcomes)
        ? report.eventOutcomes.join("\n")
        : report.outcomes || "",
      photoCaption: report.photoCaption || "",
      eventCoordinator: report.eventCoordinatorName || report.eventCoordinator || "DR. JAYSHRI A. PATIL",
      deanName: report.deanName || "DR. NIRAJ SHAH",
      status: report.status || "Generated"
    });
    setExistingPhotos(report.photos || []);
    setRemovedPhotos([]);
    setNewPhotos([]);
    setIsEditing(true);
  };

  const handleEditPhotoChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingOldCount = existingPhotos.length - removedPhotos.length;
    const currentTotal = remainingOldCount + newPhotos.length;

    if (currentTotal + files.length > 4) {
      alert("You can have a maximum of 4 photos in total.");
      return;
    }

    const added = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setNewPhotos((prev) => [...prev, ...added]);
    e.target.value = "";
  };

  const handleRemoveExistingPhoto = (photoPath) => {
    setRemovedPhotos((prev) => [...prev, photoPath]);
  };

  const handleRestoreExistingPhoto = (photoPath) => {
    setRemovedPhotos((prev) => prev.filter((p) => p !== photoPath));
  };

  const handleRemoveNewPhoto = (index) => {
    setNewPhotos((prev) => {
      const updated = [...prev];
      if (updated[index].preview.startsWith("blob:")) {
        URL.revokeObjectURL(updated[index].preview);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSaveEdit = async () => {
    const requiredFields = [
      { key: "reportDate", label: "Report Date" },
      { key: "dateOfEvent", label: "Date of Event" },
      { key: "time", label: "Time" },
      { key: "resourcePerson", label: "Resource Person" },
      { key: "eventName", label: "Name of the Event" },
      { key: "noOfParticipants", label: "No. of Participants" },
      { key: "attendee", label: "Attendee" },
      { key: "venue", label: "Venue" },
      { key: "eventOutline", label: "Event Outline" },
      { key: "objectives", label: "Objectives" },
      { key: "outcomes", label: "Outcomes" },
      { key: "eventCoordinator", label: "Event Coordinator Name" },
      { key: "deanName", label: "Dean Name" }
    ];

    if (editFormData.status !== "Draft") {
      const missingFields = requiredFields
        .filter((field) => !editFormData[field.key] || !String(editFormData[field.key]).trim())
        .map((field) => field.label);

      if (missingFields.length > 0) {
        alert(`Please fill the following required fields:\n- ${missingFields.join("\n- ")}`);
        return;
      }
    }

    try {
      setIsSavingEdit(true);
      const data = new FormData();
      data.append("reportDate", editFormData.reportDate);
      data.append("eventDate", editFormData.dateOfEvent);
      data.append("eventTime", editFormData.time);
      data.append("resourcePerson", editFormData.resourcePerson);
      data.append("eventName", editFormData.eventName);
      data.append("numberOfParticipants", editFormData.noOfParticipants);
      data.append("attendee", editFormData.attendee);
      data.append("venue", editFormData.venue);
      data.append("eventOutline", editFormData.eventOutline);
      data.append("photoCaption", editFormData.photoCaption);
      data.append("eventCoordinatorName", editFormData.eventCoordinator);
      data.append("deanName", editFormData.deanName);
      data.append("status", editFormData.status);

      data.append("removePhotos", JSON.stringify(removedPhotos));

      newPhotos.forEach((photoObj) => {
        data.append("photos", photoObj.file);
      });

      const objectivesArray = String(editFormData.objectives)
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      objectivesArray.forEach((obj) => {
        data.append("eventObjectives", obj);
      });

      const outcomesArray = String(editFormData.outcomes)
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      outcomesArray.forEach((out) => {
        data.append("eventOutcomes", out);
      });

      const response = await updateEventReport(editReport._id || editReport.id, data);
      alert(response.message || "Event report updated successfully.");

      newPhotos.forEach((p) => {
        if (p.preview.startsWith("blob:")) {
          URL.revokeObjectURL(p.preview);
        }
      });

      setIsEditing(false);
      setEditReport(null);
      await fetchReports();
    } catch (error) {
      alert(error.message || "Unable to update event report. Please try again.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDownloadPdf = async (report) => {
    const normalized = normalizeEventReportData(report);
    const fileName = `Event_Report_${normalized.eventName}_${normalized.reportId}.pdf`;
    await downloadEventReportPdf(normalized, fileName);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this event report?")) {
      return;
    }

    try {
      await deleteEventReport(id);
      alert("Event report deleted successfully.");
      if (selectedReport && (selectedReport._id === id || selectedReport.id === id)) {
        setSelectedReport(null);
      }
      fetchReports();
    } catch (error) {
      alert(error.message || "Failed to delete event report. Please try again.");
    }
  };

  const filteredReports = reports.filter((report) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      report.eventName?.toLowerCase().includes(query) ||
      report.resourcePerson?.toLowerCase().includes(query) ||
      report.venue?.toLowerCase().includes(query) ||
      (report.reportId || report._id || "").toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "All" ||
      report.status?.toLowerCase() === statusFilter.toLowerCase();

    const eventDateStr = report.eventDate || report.dateOfEvent || "";
    const matchesDate = !dateFilter || eventDateStr === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <section className="space-y-8 pb-10">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Link to="/report-dashboard" className="hover:text-purple-600 transition">
          Report Studio
        </Link>
        <span>/</span>
        <span className="text-slate-800">Event Report Records</span>
      </nav>

      {/* Page Hero */}
      <div className="rounded-3xl border border-purple-100/80 bg-gradient-to-br from-purple-50/60 via-white to-pink-50/40 p-7 shadow-xs lg:p-9 animate-hero-fade-in">
        <span className="text-xs font-black uppercase tracking-widest text-purple-600">
          REPORT REPOSITORY
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black text-slate-950 tracking-tight font-sans">
          Event Report Records
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-600 font-medium leading-relaxed">
          Manage saved academic event reports. Filter by status, search by speaker or venue, update narrative details, or download A4 PDF documents.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
          <button
            onClick={fetchReports}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-700 transition"
          >
            Retry Fetching
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="app-glass-toolbar p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            type="text"
            placeholder="Search by event title, speaker, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={inputClass}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={inputClass}
          >
            <option value="All">Status: All</option>
            <option value="Generated">Generated</option>
            <option value="Draft">Draft</option>
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500 px-1">
          <span>Showing {filteredReports.length} of {reports.length} report records</span>
          {(searchQuery || statusFilter !== "All" || dateFilter) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("All");
                setDateFilter("");
              }}
              className="text-purple-600 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Records Table */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-100 border-t-purple-600" />
            <p className="text-xs font-bold text-slate-500">Fetching report records...</p>
          </div>
        </div>
      ) : reports.length === 0 ? (
        <div className="app-glass-surface p-12 text-center shadow-xs">
          <span className="text-4xl block mb-3">📋</span>
          <h3 className="text-xl font-black text-slate-950 font-sans">No event reports found.</h3>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            Drafts and generated event reports will be displayed in this table.
          </p>
          <Link
            to="/create-event-report"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-black text-white hover:bg-purple-700 transition"
          >
            <span>Create First Report</span>
            <span>→</span>
          </Link>
        </div>
      ) : (
        <div className="app-glass-table overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                  <th className="py-4 px-4">Event Name</th>
                  <th className="py-4 px-4">Date</th>
                  <th className="py-4 px-4">Resource Person</th>
                  <th className="py-4 px-4">Venue</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((report) => {
                  const isSelected = selectedReport && (selectedReport._id === report._id || selectedReport.id === report.id);
                  return (
                    <tr
                      key={report._id || report.id}
                      className={`hover:bg-purple-50/30 transition ${
                        isSelected ? "bg-purple-50/50 font-semibold" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-950 min-w-[180px]">
                        {report.eventName}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">
                        {report.eventDate || report.dateOfEvent}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600 min-w-[140px]">
                        {report.resourcePerson}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">{report.venue}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusPill status={report.status || "Generated"} />
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleView(report)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                              isSelected
                                ? "bg-purple-600 text-white"
                                : "border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                            }`}
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEditClick(report)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(report)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => handleDelete(report._id || report.id)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Report Preview & Details */}
      {selectedReport && (
        <section id="report-preview-section" className="rounded-3xl border border-slate-200/90 bg-slate-100/70 p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-purple-600">Active Document View</span>
              <h3 className="text-xl font-black text-slate-950 font-sans">{selectedReport.eventName}</h3>
            </div>
            <button
              onClick={() => handleDownloadPdf(selectedReport)}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white hover:bg-emerald-700 transition shadow-xs"
            >
              Export A4 PDF
            </button>
          </div>

          <div className="w-full flex justify-center overflow-x-auto py-2">
            <EventReportPreview data={selectedReport} />
          </div>
        </section>
      )}

      {/* Edit Event Report Modal Overlay */}
      {isEditing && (
        <div className="app-glass-modal-overlay fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="app-glass-modal w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-950">Edit Event Report</h3>
                <p className="text-xs font-semibold text-slate-500">Modify event details, outcomes, and photo uploads</p>
              </div>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditReport(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <label className="grid gap-1 text-xs font-bold text-slate-700">
                  Report Date *
                  <input
                    className={inputClass}
                    type="text"
                    value={editFormData.reportDate}
                    onChange={(e) => setEditFormData({ ...editFormData, reportDate: e.target.value })}
                  />
                </label>
                <label className="grid gap-1 text-xs font-bold text-slate-700">
                  Date of Event *
                  <input
                    className={inputClass}
                    type="text"
                    value={editFormData.dateOfEvent}
                    onChange={(e) => setEditFormData({ ...editFormData, dateOfEvent: e.target.value })}
                  />
                </label>
                <label className="grid gap-1 text-xs font-bold text-slate-700">
                  Time *
                  <input
                    className={inputClass}
                    type="text"
                    value={editFormData.time}
                    onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                  />
                </label>
                <label className="grid gap-1 text-xs font-bold text-slate-700">
                  Resource Person *
                  <input
                    className={inputClass}
                    type="text"
                    value={editFormData.resourcePerson}
                    onChange={(e) => setEditFormData({ ...editFormData, resourcePerson: e.target.value })}
                  />
                </label>
                <label className="grid gap-1 text-xs font-bold text-slate-700">
                  Name of Event *
                  <input
                    className={inputClass}
                    type="text"
                    value={editFormData.eventName}
                    onChange={(e) => setEditFormData({ ...editFormData, eventName: e.target.value })}
                  />
                </label>
                <label className="grid gap-1 text-xs font-bold text-slate-700">
                  Status *
                  <select
                    className={inputClass}
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  >
                    <option value="Generated">Generated</option>
                    <option value="Draft">Draft</option>
                  </select>
                </label>
              </div>

              <div className="space-y-3">
                <label className="grid gap-1 text-xs font-bold text-slate-700">
                  Event Outline *
                  <textarea
                    className={textareaClass}
                    value={editFormData.eventOutline}
                    onChange={(e) => setEditFormData({ ...editFormData, eventOutline: e.target.value })}
                  />
                </label>
                <label className="grid gap-1 text-xs font-bold text-slate-700">
                  Objectives (one per line) *
                  <textarea
                    className={textareaClass}
                    value={editFormData.objectives}
                    onChange={(e) => setEditFormData({ ...editFormData, objectives: e.target.value })}
                  />
                </label>
                <label className="grid gap-1 text-xs font-bold text-slate-700">
                  Outcomes (one per line) *
                  <textarea
                    className={textareaClass}
                    value={editFormData.outcomes}
                    onChange={(e) => setEditFormData({ ...editFormData, outcomes: e.target.value })}
                  />
                </label>
              </div>

              {/* Photo Management */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Manage Photos</h4>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer rounded-lg bg-purple-600 hover:bg-purple-700 px-3 py-1.5 text-xs font-bold text-white transition">
                    Add Replacement Photos
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleEditPhotoChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {existingPhotos.map((photoPath, idx) => {
                    const isRemoved = removedPhotos.includes(photoPath);
                    return (
                      <div key={idx} className={`relative rounded-xl overflow-hidden border aspect-square ${isRemoved ? "opacity-30 border-rose-300" : "border-slate-200"}`}>
                        <img src={getAssetUrl(photoPath)} className="w-full h-full object-cover" alt="" />
                        {isRemoved ? (
                          <button
                            type="button"
                            onClick={() => handleRestoreExistingPhoto(photoPath)}
                            className="absolute inset-0 m-auto h-7 w-20 bg-emerald-600 text-white text-[10px] font-bold rounded"
                          >
                            Keep
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingPhoto(photoPath)}
                            className="absolute top-1 right-1 rounded-full bg-rose-600 p-1 text-white text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {newPhotos.map((photo, idx) => (
                    <div key={`new-${idx}`} className="relative rounded-xl overflow-hidden border border-purple-300 aspect-square">
                      <img src={photo.preview} className="w-full h-full object-cover" alt="" />
                      <button
                        type="button"
                        onClick={() => handleRemoveNewPhoto(idx)}
                        className="absolute top-1 right-1 rounded-full bg-rose-600 p-1 text-white text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-black text-white hover:bg-purple-700 transition disabled:opacity-60"
              >
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default EventReports;
