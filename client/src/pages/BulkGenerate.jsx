import JSZip from "jszip";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CertificatePreview from "../components/CertificatePreview.jsx";
import CertificateSvg from "../components/certificate/CertificateSvg.jsx";
import templateData from "../data/templateData.js";
import { bulkCreateCertificates } from "../services/certificateApi.js";
import downloadCertificatePdf, { generateCertificatePdfBlob, safeFileName } from "../utils/downloadCertificatePdf.js";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100";

const categories = [
  "Seminar",
  "Conference",
  "FDP",
  "Expert Talk",
  "Workshop",
  "Webinar",
  "Hackathon",
  "Training",
  "Competition",
  "Appreciation",
  "Academic",
  "Cultural",
  "Sports",
  "Technical"
];

const initialCommonDetails = {
  organizationName: "",
  eventName: "",
  certificateCategory: "",
  certificateTitle: "Certificate of Participation",
  eventDate: "",
  description: "For successfully participating in the event.",
  templateStyle: "",
  authorizedSignatureName: "Event Coordinator"
};

const workflowPhases = [
  { title: "1. Add Participants", desc: "CSV file or manual list", icon: "🧾" },
  { title: "2. Common Details", desc: "Event & template fields", icon: "📝" },
  { title: "3. Batch Processing", desc: "Generate record set", icon: "📄" },
  { title: "4. ZIP Export", desc: "Download bundled PDFs", icon: "⬇️" }
];

function BulkGenerate() {
  const [manualNames, setManualNames] = useState("");
  const [participants, setParticipants] = useState([]);
  const [commonDetails, setCommonDetails] = useState(initialCommonDetails);
  const [generatedCertificates, setGeneratedCertificates] = useState([]);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [editingParticipantId, setEditingParticipantId] = useState("");
  const [editParticipantDraft, setEditParticipantDraft] = useState({
    participantName: "",
    organizationName: ""
  });
  const [exportCertificate, setExportCertificate] = useState(null);
  const [zipProgress, setZipProgress] = useState("");
  const [isPreparingZip, setIsPreparingZip] = useState(false);

  const selectedSvgRef = useRef(null);
  const batchSvgRef = useRef(null);

  const samplePreviewData = useMemo(() => {
    const firstParticipant = participants[0] || {
      participantName: "Participant Name",
      organizationName: ""
    };

    return {
      participantName: firstParticipant.participantName,
      organizationName: firstParticipant.organizationName || commonDetails.organizationName || "Organization Name",
      eventName: commonDetails.eventName,
      certificateCategory: commonDetails.certificateCategory,
      certificateTitle: commonDetails.certificateTitle,
      eventDate: commonDetails.eventDate,
      description: commonDetails.description,
      templateStyle: commonDetails.templateStyle,
      authorizedSignatureName: commonDetails.authorizedSignatureName
    };
  }, [commonDetails, participants]);

  const handleCommonChange = (event) => {
    const { name, value } = event.target;
    setCommonDetails((currentDetails) => ({
      ...currentDetails,
      [name]: value
    }));
  };

  const resetGeneratedResults = () => {
    setGeneratedCertificates([]);
    setSelectedCertificate(null);
    setSuccessMessage("");
  };

  const handleManualParticipants = () => {
    const names = manualNames
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean);

    if (names.length === 0) {
      alert("No participants added. Please enter at least one participant name.");
      return;
    }

    const newParticipants = names.map((name, index) => ({
      id: `${Date.now()}-${index}`,
      participantName: name,
      organizationName: ""
    }));

    setParticipants(newParticipants);
    setEditingParticipantId("");
    resetGeneratedResults();
  };

  const handleCsvUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("CSV invalid format. Please upload a .csv file.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const csvText = String(reader.result || "");
      const rows = csvText
        .split(/\r?\n/)
        .map((row) => row.trim())
        .filter(Boolean);

      if (rows.length === 0) {
        alert("CSV invalid format. No participant rows were found.");
        return;
      }

      const dataRows = rows[0]?.toLowerCase().includes("participantname") ? rows.slice(1) : rows;
      const parsedParticipants = dataRows
        .map((row, index) => {
          const columns = row.split(",").map((value) => value.trim());

          if (columns.length < 1 || columns.length > 2) {
            return null;
          }

          return {
            id: `${Date.now()}-${index}`,
            participantName: columns[0] || "",
            organizationName: columns[1] || ""
          };
        })
        .filter((participant) => participant?.participantName);

      if (parsedParticipants.length === 0) {
        alert("CSV invalid format. Use participantName,organizationName columns.");
        return;
      }

      setParticipants(parsedParticipants);
      setEditingParticipantId("");
      resetGeneratedResults();
    };

    reader.onerror = () => {
      alert("Unable to read CSV file. Please try again.");
    };

    reader.readAsText(file);
  };

  const handleDownloadCsvTemplate = () => {
    const csvContent = [
      "participantName,organizationName",
      "Prit Koradiya,PPSU",
      "Rahul Patel,PPSU",
      "Neha Sharma,PPSU"
    ].join("\n");
    const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const csvUrl = URL.createObjectURL(csvBlob);
    const downloadLink = document.createElement("a");

    downloadLink.href = csvUrl;
    downloadLink.download = "bulk_certificate_template.csv";
    downloadLink.click();
    URL.revokeObjectURL(csvUrl);
  };

  const handleRemoveParticipant = (participantId) => {
    setParticipants((currentParticipants) => currentParticipants.filter((participant) => participant.id !== participantId));
    setEditingParticipantId("");
    resetGeneratedResults();
  };

  const handleEditParticipant = (participant) => {
    setEditingParticipantId(participant.id);
    setEditParticipantDraft({
      participantName: participant.participantName,
      organizationName: participant.organizationName
    });
  };

  const handleSaveParticipant = (participantId) => {
    const participantName = editParticipantDraft.participantName.trim();

    if (!participantName) {
      alert("Participant name cannot be empty.");
      return;
    }

    setParticipants((currentParticipants) =>
      currentParticipants.map((participant) =>
        participant.id === participantId
          ? {
              ...participant,
              participantName,
              organizationName: editParticipantDraft.organizationName.trim()
            }
          : participant
      )
    );
    setEditingParticipantId("");
    resetGeneratedResults();
  };

  const validateBulkForm = () => {
    if (participants.length === 0) {
      alert("No participants added. Please add participants first.");
      return false;
    }

    const missingParticipant = participants.find((participant) => !participant.participantName.trim());

    if (missingParticipant) {
      alert("Participant name is required for every participant.");
      return false;
    }

    const requiredFields = [
      { key: "eventName", label: "Event Name" },
      { key: "certificateCategory", label: "Certificate Category" },
      { key: "certificateTitle", label: "Certificate Title" },
      { key: "eventDate", label: "Event Date" },
      { key: "templateStyle", label: "Template Style" }
    ];
    const missingFields = requiredFields
      .filter((field) => !commonDetails[field.key])
      .map((field) => field.label);

    if (missingFields.length > 0) {
      alert(`Missing required common details: ${missingFields.join(", ")}`);
      return false;
    }

    const missingOrganization = participants.some((participant) => !participant.organizationName && !commonDetails.organizationName);

    if (missingOrganization) {
      alert("Please add Default Organization Name or include organizationName in CSV.");
      return false;
    }

    return true;
  };

  const handleGenerateBulkCertificates = async () => {
    if (!validateBulkForm()) {
      return;
    }

    try {
      setIsGenerating(true);
      setSuccessMessage("");

      const payload = {
        participants: participants.map((participant) => ({
          participantName: participant.participantName,
          organizationName: participant.organizationName || commonDetails.organizationName
        })),
        commonDetails
      };

      const result = await bulkCreateCertificates(payload);
      const savedCertificates = result.data || [];

      setGeneratedCertificates(savedCertificates);
      setSelectedCertificate(savedCertificates[0] || null);
      setSuccessMessage(`${result.count || savedCertificates.length} certificates generated successfully.`);
    } catch (error) {
      alert(error.message || "Unable to generate bulk certificates. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const createPdfFileName = (certificate) => {
    const participantName = safeFileName(certificate.participantName || "Participant");
    const certificateId = safeFileName(certificate.certificateId || "CERT-2026-001");

    return `${participantName}_${certificateId}.pdf`;
  };

  const handleDownloadSelectedPdf = async () => {
    if (!selectedCertificate || !selectedSvgRef.current) {
      alert("Please select a certificate first.");
      return;
    }

    await downloadCertificatePdf(selectedSvgRef.current, createPdfFileName(selectedCertificate));
  };

  const handleDownloadAllZip = async () => {
    if (generatedCertificates.length === 0) {
      alert("No generated certificates found. Please generate bulk certificates first.");
      return;
    }

    const zip = new JSZip();
    let failedCount = 0;

    try {
      setIsPreparingZip(true);
      setZipProgress(`Preparing 0 of ${generatedCertificates.length} certificates...`);

      for (let index = 0; index < generatedCertificates.length; index += 1) {
        const certificate = generatedCertificates[index];
        setZipProgress(`Preparing ${index + 1} of ${generatedCertificates.length} certificates...`);
        setExportCertificate(certificate);
        await new Promise((resolve) => setTimeout(resolve, 150));

        try {
          if (batchSvgRef.current) {
            const pdfBlob = await generateCertificatePdfBlob(batchSvgRef.current);
            zip.file(createPdfFileName(certificate), pdfBlob);
          }
        } catch (error) {
          failedCount += 1;
          console.error(`PDF generation failed for ${certificate.participantName}`, error);
        }
      }

      setZipProgress("Creating ZIP file...");
      const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });

      if (Object.keys(zip.files).length === 0) {
        alert("ZIP generation failed. No certificate PDFs could be created.");
        return;
      }

      const zipUrl = URL.createObjectURL(zipBlob);
      const downloadLink = document.createElement("a");
      const eventName = safeFileName(commonDetails.eventName || "Event");
      const eventDate = safeFileName(commonDetails.eventDate || "Date");

      downloadLink.href = zipUrl;
      downloadLink.download = `bulk_certificates_${eventName}_${eventDate}.zip`;
      downloadLink.click();
      URL.revokeObjectURL(zipUrl);

      if (failedCount > 0) {
        alert("ZIP completed. Some certificates may have failed.");
      }
    } catch (error) {
      alert(error.message || "ZIP generation failed. Please try again.");
    } finally {
      setExportCertificate(null);
      setZipProgress("");
      setIsPreparingZip(false);
    }
  };

  return (
    <section className="space-y-8 pb-10">
      {/* Off-screen Pure SVG Host for Batch ZIP Export */}
      <div style={{ position: "fixed", left: "-20000px", top: "0" }} aria-hidden="true">
        {exportCertificate && (
          <CertificateSvg
            ref={batchSvgRef}
            id="bulk-zip-export-svg"
            {...exportCertificate}
            certificateCategory={exportCertificate.certificateCategory || commonDetails.certificateCategory}
          />
        )}
      </div>

      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Link to="/certificate-dashboard" className="hover:text-blue-600 transition">
          Certificate Studio
        </Link>
        <span>/</span>
        <span className="text-slate-800">Bulk Generation</span>
      </nav>

      {/* Page Hero */}
      <div className="app-glass-hero p-7 lg:p-9 animate-hero-fade-in">
        <span className="text-xs font-black uppercase tracking-widest text-blue-600">
          BULK STUDIO WORKSPACE
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black text-slate-950 tracking-tight font-sans">
          Bulk Certificate Generator
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-600 font-medium leading-relaxed">
          Upload a CSV participant roster or enter manual names to generate complete batches of certificates simultaneously. Download individually or export as a single ZIP archive.
        </p>

        {/* Workspace Phases Strip */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {workflowPhases.map((phase) => (
            <div key={phase.title} className="app-glass-panel p-3.5 flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg">
                {phase.icon}
              </span>
              <div>
                <p className="text-xs font-black text-slate-950">{phase.title}</p>
                <p className="text-[11px] font-semibold text-slate-500">{phase.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phase 1: Participant Input Options */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Option A: Manual Roster */}
        <div className="app-glass-surface-strong p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-blue-600">Option A</span>
            <span className="text-xs font-bold text-slate-400">One Name Per Line</span>
          </div>
          <h3 className="text-lg font-black text-slate-950 font-sans">Enter Manual Participant List</h3>

          <textarea
            value={manualNames}
            onChange={(event) => setManualNames(event.target.value)}
            className="min-h-36 w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            placeholder={"Pritkumar Koradiya\nRahul Patel\nNeha Sharma"}
          />

          <button
            type="button"
            onClick={handleManualParticipants}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-black text-white shadow-xs hover:bg-blue-700 transition active:scale-98"
          >
            Add Manual Roster to Queue
          </button>
        </div>

        {/* Option B: CSV Upload Dropzone */}
        <div className="app-glass-surface-strong p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-blue-600">Option B</span>
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="text-xs font-black text-blue-600 hover:underline"
              >
                Download CSV Sample
              </button>
            </div>
            <h3 className="text-lg font-black text-slate-950 font-sans">Upload CSV Spreadsheet</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Required CSV headers: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">participantName,organizationName</code>
            </p>

            <div className="mt-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 p-6 text-center hover:bg-blue-50/60 transition cursor-pointer relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <span className="text-3xl block mb-2">📄</span>
              <p className="text-sm font-black text-slate-900">Click or drag CSV file here</p>
              <p className="text-xs font-medium text-slate-500 mt-1">Supports standard CSV spreadsheets up to 1000 rows</p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs font-mono text-slate-600 border border-slate-100">
            participantName,organizationName<br />
            Pritkumar Koradiya,PPSU<br />
            Rahul Patel,PPSU
          </div>
        </div>
      </div>

      {/* Participant Roster Queue Table */}
      <div className="rounded-3xl border border-slate-200/90 bg-white/90 p-6 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-black text-slate-950 font-sans">Participant Queue</h3>
            <p className="text-xs font-medium text-slate-500">Review or modify names before launching batch generation</p>
          </div>
          <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-black text-blue-700">
            {participants.length} Participants Added
          </span>
        </div>

        {participants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Participant Name</th>
                  <th className="py-3 px-3">Organization Name</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {participants.map((participant, index) => {
                  const isEditing = editingParticipantId === participant.id;

                  return (
                    <tr key={participant.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-3 font-bold text-slate-400">{index + 1}</td>
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <input
                            value={editParticipantDraft.participantName}
                            onChange={(e) => setEditParticipantDraft((draft) => ({ ...draft, participantName: e.target.value }))}
                            className={inputClass}
                          />
                        ) : (
                          <span className="font-bold text-slate-900">{participant.participantName}</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <input
                            value={editParticipantDraft.organizationName}
                            onChange={(e) => setEditParticipantDraft((draft) => ({ ...draft, organizationName: e.target.value }))}
                            className={inputClass}
                            placeholder="Uses default organization if blank"
                          />
                        ) : (
                          <span className="font-medium text-slate-600">{participant.organizationName || commonDetails.organizationName || "Default Organization"}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveParticipant(participant.id)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingParticipantId("")}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditParticipant(participant)}
                                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveParticipant(participant.id)}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-xs font-bold text-slate-500">
            No participants in queue yet. Enter manual names or upload a CSV above.
          </div>
        )}
      </div>

      {/* Phase 2 & Live Sample Preview Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
        {/* Form for Common Details */}
        <form className="app-glass-surface-strong p-6 sm:p-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div className="border-b border-slate-100 pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-blue-600">Common Roster Details</span>
            <h3 className="text-lg font-black text-slate-950 font-sans">Batch Certificate Form</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Default Organization Name
              <input className={inputClass} name="organizationName" value={commonDetails.organizationName} onChange={handleCommonChange} placeholder="e.g. PP Savani University" />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Event Name *
              <input className={inputClass} name="eventName" value={commonDetails.eventName} onChange={handleCommonChange} placeholder="e.g. Hackathon 2026" />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Certificate Category *
              <select className={inputClass} name="certificateCategory" value={commonDetails.certificateCategory} onChange={handleCommonChange}>
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Certificate Title *
              <input className={inputClass} name="certificateTitle" value={commonDetails.certificateTitle} onChange={handleCommonChange} />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Event Date *
              <input className={inputClass} type="date" name="eventDate" value={commonDetails.eventDate} onChange={handleCommonChange} />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Template Style *
              <select className={inputClass} name="templateStyle" value={commonDetails.templateStyle} onChange={handleCommonChange}>
                <option value="">Select Template Style</option>
                {templateData.map((tpl) => (
                  <option key={tpl.id} value={tpl.name}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 md:col-span-2">
              Authorized Signature Name
              <input className={inputClass} name="authorizedSignatureName" value={commonDetails.authorizedSignatureName} onChange={handleCommonChange} />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 md:col-span-2">
              Description / Details
              <textarea
                className={`${inputClass} !h-24 resize-y py-2.5`}
                name="description"
                value={commonDetails.description}
                onChange={handleCommonChange}
              />
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleGenerateBulkCertificates}
              disabled={isGenerating}
              className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-black text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-60 active:scale-98"
            >
              {isGenerating ? "Processing Roster..." : `Generate ${participants.length} Certificates`}
            </button>
            <button
              type="button"
              onClick={handleDownloadAllZip}
              disabled={isPreparingZip || generatedCertificates.length === 0}
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50 active:scale-98"
            >
              {isPreparingZip ? "Building ZIP Archive..." : "Download All as ZIP"}
            </button>
          </div>

          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800">
              ✓ {successMessage}
            </div>
          )}

          {zipProgress && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-xs font-bold text-blue-700 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
              <span>{zipProgress}</span>
            </div>
          )}
        </form>

        {/* Sample Live Canvas */}
        <div className="rounded-3xl border border-slate-200/90 bg-white/90 p-5 shadow-xl backdrop-blur-md space-y-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-blue-600">Sample Preview</span>
            <h3 className="text-base font-black text-slate-950 font-sans">Batch Sample Visual</h3>
          </div>
          <div className="overflow-hidden">
            <CertificatePreview certificateData={samplePreviewData} previewId="bulk-sample-preview-svg" />
          </div>
        </div>
      </div>

      {/* Generated Batch Roster Results Table */}
      {generatedCertificates.length > 0 && (
        <div className="rounded-3xl border border-slate-200/90 bg-white/90 p-6 shadow-xl backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600">Generated Batch</span>
              <h3 className="text-lg font-black text-slate-950 font-sans">Generated Certificate Records</h3>
            </div>
            <button
              type="button"
              onClick={handleDownloadAllZip}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 transition"
            >
              Download All ZIP
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Participant</th>
                  <th className="py-3 px-3">Organization</th>
                  <th className="py-3 px-3">Certificate ID</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {generatedCertificates.map((cert, idx) => (
                  <tr key={cert._id || cert.certificateId} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{cert.participantName}</td>
                    <td className="py-3 px-3 font-medium text-slate-600">{cert.organizationName}</td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-700">{cert.certificateId}</td>
                    <td className="py-3 px-3">
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                        {cert.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCertificate(cert)}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
                      >
                        View Card
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Certificate View Box */}
      {selectedCertificate && (
        <div className="rounded-3xl border border-slate-200/90 bg-white/90 p-6 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-blue-600">Selected Certificate</span>
              <h3 className="text-lg font-black text-slate-950 font-sans">{selectedCertificate.participantName}</h3>
            </div>
            <button
              type="button"
              onClick={handleDownloadSelectedPdf}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white hover:bg-emerald-700 transition"
            >
              Export Selected PDF
            </button>
          </div>

          <CertificatePreview
            ref={selectedSvgRef}
            certificateData={selectedCertificate}
            previewId="bulk-certificate-preview-svg"
          />
        </div>
      )}
    </section>
  );
}

export default BulkGenerate;
