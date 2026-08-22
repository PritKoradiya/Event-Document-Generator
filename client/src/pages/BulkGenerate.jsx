import JSZip from "jszip";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CertificatePreview from "../components/CertificatePreview.jsx";
import CertificateSvg from "../components/certificate/CertificateSvg.jsx";
import SignatureBoxEditor from "../components/certificate/SignatureBoxEditor.jsx";
import templateData from "../data/templateData.js";
import { bulkCreateCertificates } from "../services/certificateApi.js";
import downloadCertificatePdf, { generateCertificatePdfBlob, safeFileName } from "../utils/downloadCertificatePdf.js";
import { getPayloadSizeMb } from "../utils/getPayloadSizeMb.js";

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
  templateStyle: "Classic Certificate",
  signatureBoxes: [],
  singleSignaturePosition: "center"
};

const workflowPhases = [
  { title: "1. Add Participants", desc: "CSV file, manual list, or single add", icon: "🧾" },
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
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingParticipantId, setEditingParticipantId] = useState("");
  const [editParticipantDraft, setEditParticipantDraft] = useState({
    participantName: ""
  });
  const [exportCertificate, setExportCertificate] = useState(null);
  const [zipProgress, setZipProgress] = useState("");
  const [isPreparingZip, setIsPreparingZip] = useState(false);

  // Single Add Participant Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [modalError, setModalError] = useState("");

  const selectedSvgRef = useRef(null);
  const batchSvgRef = useRef(null);

  // Filter out invalid participants with empty participantName
  const validParticipants = useMemo(() => {
    return participants.filter(
      (p) => p.participantName && p.participantName.trim() !== ""
    );
  }, [participants]);

  const samplePreviewData = useMemo(() => {
    const firstParticipant = validParticipants[0] || {
      participantName: "Participant Name"
    };

    return {
      participantName: firstParticipant.participantName,
      organizationName: commonDetails.organizationName || "Organization Name",
      eventName: commonDetails.eventName,
      certificateCategory: commonDetails.certificateCategory,
      certificateTitle: commonDetails.certificateTitle,
      eventDate: commonDetails.eventDate,
      description: commonDetails.description,
      templateStyle: commonDetails.templateStyle,
      signatureBoxes: commonDetails.signatureBoxes,
      singleSignaturePosition: commonDetails.singleSignaturePosition
    };
  }, [commonDetails, validParticipants]);

  const setError = (msg) => {
    setErrorMessage(msg);
    setSuccessMessage("");
  };

  const setSuccess = (msg) => {
    setSuccessMessage(msg);
    setErrorMessage("");
  };

  const handleCommonChange = (event) => {
    const { name, value } = event.target;
    setCommonDetails((currentDetails) => ({
      ...currentDetails,
      [name]: value
    }));
  };

  const handleAddSignatureBox = () => {
    if (commonDetails.signatureBoxes.length >= 3) return;
    setCommonDetails((prev) => ({
      ...prev,
      signatureBoxes: [
        ...prev.signatureBoxes,
        {
          signerName: "",
          signerDesignation: "",
          signatureMode: "blank",
          signatureImage: null
        }
      ]
    }));
  };

  const handleSignatureBoxChange = (index, updatedBox) => {
    setCommonDetails((prev) => {
      const newBoxes = [...prev.signatureBoxes];
      newBoxes[index] = updatedBox;
      return { ...prev, signatureBoxes: newBoxes };
    });
  };

  const handleRemoveSignatureBox = (index) => {
    setCommonDetails((prev) => {
      const newBoxes = prev.signatureBoxes.filter((_, i) => i !== index);
      return { ...prev, signatureBoxes: newBoxes };
    });
  };

  const cleanSignatureBoxes = (boxes) => {
    if (!Array.isArray(boxes)) return [];
    return boxes.filter(
      (box) =>
        (box.signerName && box.signerName.trim() !== "") ||
        (box.signerDesignation && box.signerDesignation.trim() !== "")
    );
  };

  const resetGeneratedResults = () => {
    setGeneratedCertificates([]);
    setSelectedCertificate(null);
    setSuccessMessage("");
    setErrorMessage("");
  };

  // Add single participant directly from Modal
  const handleAddSingleParticipant = () => {
    const trimmedName = newParticipantName.trim();

    if (!trimmedName) {
      setModalError("Participant name is required.");
      return;
    }

    if (participants.length >= 1000) {
      setModalError("Maximum 1000 participants allowed.");
      return;
    }

    const newParticipant = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      participantName: trimmedName
    };

    setParticipants((prev) => [...prev, newParticipant]);
    setNewParticipantName("");
    setModalError("");
    setIsAddModalOpen(false);
    resetGeneratedResults();
    setSuccess(`Added "${trimmedName}" to participant queue.`);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setNewParticipantName("");
    setModalError("");
  };

  const handleManualParticipants = () => {
    const names = manualNames
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean);

    if (names.length === 0) {
      setError("No participants entered. Please type or paste at least one participant name per line.");
      return;
    }

    const newParticipants = names.map((name, index) => ({
      id: `${Date.now()}-${index}`,
      participantName: name
    }));

    setParticipants(newParticipants);
    setEditingParticipantId("");
    resetGeneratedResults();
    setSuccess(`Added ${newParticipants.length} manual participants to queue.`);
  };

  const handleCsvUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Invalid file format. Please upload a valid .csv file.");
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
        setError("CSV file is empty. No participant rows were found.");
        return;
      }

      const dataRows = rows[0]?.toLowerCase().includes("participantname") ? rows.slice(1) : rows;
      const parsedParticipants = dataRows
        .map((row, index) => {
          const columns = row.split(",").map((value) => value.trim());

          if (columns.length < 1 || !columns[0]) {
            return null;
          }

          return {
            id: `${Date.now()}-${index}`,
            participantName: columns[0]
          };
        })
        .filter(Boolean);

      if (parsedParticipants.length === 0) {
        setError("No valid participant names found in CSV. Expected header: participantName");
        return;
      }

      setParticipants(parsedParticipants);
      setEditingParticipantId("");
      resetGeneratedResults();
      setSuccess(`Imported ${parsedParticipants.length} participants from CSV.`);
    };

    reader.onerror = () => {
      setError("Unable to read CSV file. Please try uploading again.");
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const handleDownloadCsvTemplate = () => {
    const csvContent = [
      "participantName",
      "Pritkumar Koradiya",
      "Kenil Dobariya",
      "Rahul Patel"
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
    setParticipants((currentParticipants) =>
      currentParticipants.filter((participant) => participant.id !== participantId)
    );
    setEditingParticipantId("");
    resetGeneratedResults();
  };

  const handleEditParticipant = (participant) => {
    setEditingParticipantId(participant.id);
    setEditParticipantDraft({
      participantName: participant.participantName
    });
  };

  const handleSaveParticipant = (participantId) => {
    const participantName = editParticipantDraft.participantName.trim();

    if (!participantName) {
      setError("Participant name cannot be empty.");
      return;
    }

    setParticipants((currentParticipants) =>
      currentParticipants.map((participant) =>
        participant.id === participantId
          ? {
              id: participant.id,
              participantName
            }
          : participant
      )
    );
    setEditingParticipantId("");
    resetGeneratedResults();
    setSuccess("Participant name updated.");
  };

  const validateBulkForm = () => {
    if (participants.length === 0) {
      setError("No participants added. Please enter manual names, upload a CSV, or click + Add Participant first.");
      return false;
    }

    if (validParticipants.length === 0) {
      setError("No valid participants found. Every participant must have a non-empty Participant Name.");
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
      setError(`Missing required common details: ${missingFields.join(", ")}`);
      return false;
    }

    if (!commonDetails.organizationName || commonDetails.organizationName.trim().length === 0) {
      setError("Please fill in Default Organization Name in Common Roster Details.");
      return false;
    }

    return true;
  };

  const handleGenerateBulkCertificates = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!validateBulkForm()) {
      return;
    }

    try {
      setIsGenerating(true);

      const cleanedBoxes = cleanSignatureBoxes(commonDetails.signatureBoxes);
      const cleanedCommonDetails = {
        ...commonDetails,
        signatureBoxes: cleanedBoxes,
        singleSignaturePosition: commonDetails.singleSignaturePosition || "center",
        drSignatureName: cleanedBoxes[0]?.signerName || "",
        drSignatureMode: cleanedBoxes[0]?.signatureMode || "blank",
        drSignatureImage: cleanedBoxes[0]?.signatureImage || null,
        authorizedSignatureName: cleanedBoxes[1]?.signerName || "",
        authorizedSignatureMode: cleanedBoxes[1]?.signatureMode || "blank",
        authorizedSignatureImage: cleanedBoxes[1]?.signatureImage || null,
        signatureLayout: cleanedBoxes.length === 1 ? "dr-only" : cleanedBoxes.length >= 2 ? "both" : "none"
      };

      // Payload contains valid participants (ONLY participantName) and commonDetails with organizationName
      const payload = {
        participants: validParticipants.map((p) => ({
          participantName: p.participantName.trim()
        })),
        commonDetails: cleanedCommonDetails
      };

      // Preflight payload size check before calling backend API
      const payloadSizeMb = getPayloadSizeMb(payload);
      if (payloadSizeMb > 8.0) {
        setError(`Bulk request is too large (${payloadSizeMb.toFixed(1)} MB). Please use smaller signature images or generate a smaller batch.`);
        setIsGenerating(false);
        return;
      }

      const result = await bulkCreateCertificates(payload);
      const savedCertificates = result.data || [];

      setGeneratedCertificates(savedCertificates);
      setSelectedCertificate(savedCertificates[0] || null);

      if (savedCertificates.length < validParticipants.length) {
        setSuccess(`Generated ${savedCertificates.length} of ${validParticipants.length} certificates.`);
      } else {
        setSuccess(`Successfully generated ${savedCertificates.length} certificates.`);
      }
    } catch (error) {
      console.error("Bulk certificate generation error:", error);
      setError(error.message || "Bulk certificate generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const createPdfFileName = (certificate, index = 0) => {
    const participantName = safeFileName(certificate.participantName || `Participant_${index + 1}`);
    const certificateId = certificate.certificateId
      ? safeFileName(certificate.certificateId)
      : `certificate_${index + 1}`;

    return `${participantName}_${certificateId}.pdf`;
  };

  const handleDownloadSelectedPdf = async () => {
    if (!selectedCertificate || !selectedSvgRef.current) {
      setError("Please select a certificate record first.");
      return;
    }

    try {
      await downloadCertificatePdf(selectedSvgRef.current, createPdfFileName(selectedCertificate));
    } catch (err) {
      setError(err.message || "Failed to download selected certificate PDF.");
    }
  };

  const handleDownloadAllZip = async () => {
    if (!generatedCertificates || generatedCertificates.length === 0) {
      setError("No current bulk generation result. Generate certificates first.");
      return;
    }

    const zip = new JSZip();
    let failedCount = 0;
    const failedNames = [];

    try {
      setIsPreparingZip(true);
      setErrorMessage("");
      setSuccessMessage("");

      for (let index = 0; index < generatedCertificates.length; index += 1) {
        const certificate = generatedCertificates[index];
        setZipProgress(`Generating ZIP: ${index + 1} / ${generatedCertificates.length}`);
        setExportCertificate(certificate);

        // Allow DOM & SVG to update offscreen with current certificate data
        await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 60)));

        try {
          if (batchSvgRef.current) {
            const pdfBlob = await generateCertificatePdfBlob(batchSvgRef.current);
            const fileName = createPdfFileName(certificate, index);
            zip.file(fileName, pdfBlob);
          } else {
            throw new Error("Export canvas element not ready.");
          }
        } catch (error) {
          failedCount += 1;
          failedNames.push(certificate.participantName || `Item ${index + 1}`);
          console.error(`PDF generation failed for ${certificate.participantName}:`, error);
        }
      }

      setZipProgress("Creating ZIP archive...");
      const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });

      if (!zipBlob || zipBlob.size === 0 || Object.keys(zip.files).length === 0) {
        setError("ZIP generation failed. No certificate PDFs could be created.");
        return;
      }

      const zipUrl = URL.createObjectURL(zipBlob);
      const downloadLink = document.createElement("a");
      const eventName = safeFileName(commonDetails.eventName || "Event");
      const todayDate = new Date().toISOString().split("T")[0];

      downloadLink.href = zipUrl;
      downloadLink.download = `Event_Certificates_${eventName}_${todayDate}.zip`;
      downloadLink.click();

      setTimeout(() => URL.revokeObjectURL(zipUrl), 1000);

      if (failedCount > 0) {
        setError(`ZIP created with ${generatedCertificates.length - failedCount} of ${generatedCertificates.length} certificates. ${failedCount} failed: ${failedNames.join(", ")}`);
      } else {
        setSuccess(`ZIP archive containing all ${generatedCertificates.length} certificates downloaded successfully.`);
      }
    } catch (error) {
      console.error("ZIP Generation error:", error);
      setError(error.message || "Unable to create ZIP archive. Please try again.");
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
          Upload a CSV participant roster, paste manual names, or add participants individually to generate complete batches of certificates simultaneously. Download individually or export as a single ZIP archive.
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

      {/* Global Inline Notifications Banner */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-bold text-rose-800 flex items-start justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-start gap-2.5">
            <span className="text-base shrink-0">⚠️</span>
            <div>
              <p className="font-black text-rose-900">Bulk Operation Alert</p>
              <p className="mt-0.5 leading-relaxed font-semibold">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="text-rose-500 hover:text-rose-800 text-sm font-black transition shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs font-bold text-emerald-800 flex items-start justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <span className="text-base shrink-0">✓</span>
            <p className="font-bold">{successMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            className="text-emerald-600 hover:text-emerald-900 text-sm font-black transition shrink-0"
          >
            ✕
          </button>
        </div>
      )}

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
            disabled={isGenerating || isPreparingZip}
            className="min-h-36 w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
            placeholder={"Pritkumar Koradiya\nRahul Patel\nNeha Sharma"}
          />

          <button
            type="button"
            onClick={handleManualParticipants}
            disabled={isGenerating || isPreparingZip}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-black text-white shadow-xs hover:bg-blue-700 transition active:scale-98 disabled:opacity-50"
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
              Required CSV header: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono">participantName</code>
            </p>

            <div className="mt-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/30 p-6 text-center hover:bg-blue-50/60 transition cursor-pointer relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                disabled={isGenerating || isPreparingZip}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
              />
              <span className="text-3xl block mb-2">📄</span>
              <p className="text-sm font-black text-slate-900">Click or drag CSV file here</p>
              <p className="text-xs font-medium text-slate-500 mt-1">Supports standard CSV spreadsheets up to 1000 rows</p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs font-mono text-slate-600 border border-slate-100">
            participantName<br />
            Pritkumar Koradiya<br />
            Rahul Patel
          </div>
        </div>
      </div>

      {/* Participant Roster Queue Table */}
      <div className="rounded-3xl border border-slate-200/90 bg-white/90 p-6 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-950 font-sans">Participant Queue</h3>
            <p className="text-xs font-medium text-slate-500">Review or modify names before launching batch generation</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-black text-blue-700">
              Valid participants: {validParticipants.length} / {participants.length}
            </span>

            <button
              type="button"
              onClick={() => {
                setModalError("");
                setNewParticipantName("");
                setIsAddModalOpen(true);
              }}
              disabled={participants.length >= 1000 || isGenerating || isPreparingZip}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              + Add Participant
            </button>
          </div>
        </div>

        {participants.length >= 1000 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 flex items-center gap-2">
            <span>ℹ️</span>
            <span>Maximum 1000 participants allowed in the queue.</span>
          </div>
        )}

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
                  const isValid = participant.participantName && participant.participantName.trim() !== "";

                  return (
                    <tr key={participant.id} className={`transition ${isValid ? "hover:bg-slate-50/60" : "bg-rose-50/40"}`}>
                      <td className="py-3 px-3 font-bold text-slate-400">{index + 1}</td>
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <input
                            value={editParticipantDraft.participantName}
                            onChange={(e) => setEditParticipantDraft({ participantName: e.target.value })}
                            className={inputClass}
                            autoFocus
                          />
                        ) : (
                          <span className={`font-bold ${isValid ? "text-slate-900" : "text-rose-600"}`}>
                            {participant.participantName || "(Empty Name)"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-600">
                          {commonDetails.organizationName || participant.organizationName || "Default Organization"}
                        </span>
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
                                disabled={isGenerating || isPreparingZip}
                                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition disabled:opacity-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveParticipant(participant.id)}
                                disabled={isGenerating || isPreparingZip}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50"
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
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-xs font-bold text-slate-500 space-y-2">
            <p>No participants in queue yet.</p>
            <p className="text-[11px] font-normal text-slate-400">
              Click <span className="font-bold text-blue-600">+ Add Participant</span> above, enter manual names, or upload a CSV file.
            </p>
          </div>
        )}
      </div>

      {/* Single Add Participant Modal */}
      {isAddModalOpen && (
        <div className="app-glass-modal-overlay fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="app-glass-modal w-full max-w-md overflow-hidden animate-fade-in my-8 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-950 font-sans">Add Participant</h3>
                <p className="text-xs font-semibold text-slate-500">
                  Add a participant to the current bulk generation queue.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseAddModal}
                className="text-slate-400 hover:text-slate-600 transition font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Participant Name *
              </label>
              <input
                type="text"
                value={newParticipantName}
                onChange={(e) => {
                  setNewParticipantName(e.target.value);
                  if (modalError) setModalError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSingleParticipant();
                  }
                }}
                placeholder="e.g. Pritkumar Koradiya"
                className={inputClass}
                autoFocus
              />
              {modalError && (
                <p className="text-xs font-bold text-rose-600 animate-fade-in">
                  ⚠️ {modalError}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseAddModal}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSingleParticipant}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black text-white hover:bg-blue-700 transition active:scale-98 shadow-xs"
              >
                Add Participant
              </button>
            </div>
          </div>
        </div>
      )}

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
              Default Organization Name *
              <input className={inputClass} name="organizationName" value={commonDetails.organizationName} onChange={handleCommonChange} placeholder="e.g. PP Savani University" disabled={isGenerating || isPreparingZip} />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Event Name *
              <input className={inputClass} name="eventName" value={commonDetails.eventName} onChange={handleCommonChange} placeholder="e.g. Hackathon 2026" disabled={isGenerating || isPreparingZip} />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Certificate Category *
              <select className={inputClass} name="certificateCategory" value={commonDetails.certificateCategory} onChange={handleCommonChange} disabled={isGenerating || isPreparingZip}>
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
              <input className={inputClass} name="certificateTitle" value={commonDetails.certificateTitle} onChange={handleCommonChange} disabled={isGenerating || isPreparingZip} />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Event Date *
              <input className={inputClass} type="date" name="eventDate" value={commonDetails.eventDate} onChange={handleCommonChange} disabled={isGenerating || isPreparingZip} />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Template Style *
              <select className={inputClass} name="templateStyle" value={commonDetails.templateStyle} onChange={handleCommonChange} disabled={isGenerating || isPreparingZip}>
                <option value="">Select Template Style</option>
                {templateData.map((tpl) => (
                  <option key={tpl.id} value={tpl.name}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 md:col-span-2">
              Description / Details
              <textarea
                className={`${inputClass} !h-24 resize-y py-2.5`}
                name="description"
                value={commonDetails.description}
                onChange={handleCommonChange}
                disabled={isGenerating || isPreparingZip}
              />
            </label>
          </div>

          {/* Signature Settings in Bulk Generate */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Signature Settings</h4>
                <p className="text-xs text-slate-500 font-semibold">Create up to 3 custom signature blocks for the batch.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  Boxes: {commonDetails.signatureBoxes.length} / 3
                </span>
                <button
                  type="button"
                  onClick={handleAddSignatureBox}
                  disabled={commonDetails.signatureBoxes.length >= 3 || isGenerating || isPreparingZip}
                  className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-black text-white hover:bg-blue-700 transition disabled:opacity-50"
                >
                  + Create Signature Box
                </button>
              </div>
            </div>

            {commonDetails.signatureBoxes.length >= 3 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                Maximum 3 signature boxes allowed.
              </div>
            )}

            {commonDetails.signatureBoxes.length === 1 && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Signature Position
                </label>
                <div className="inline-flex rounded-lg bg-white p-1 border border-slate-200">
                  {["left", "center", "right"].map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      disabled={isGenerating || isPreparingZip}
                      onClick={() => setCommonDetails((prev) => ({ ...prev, singleSignaturePosition: pos }))}
                      className={`rounded px-3 py-1 text-xs font-bold capitalize transition ${
                        (commonDetails.singleSignaturePosition || "center") === pos ? "bg-blue-600 text-white" : "text-slate-600"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {commonDetails.signatureBoxes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs font-bold text-slate-500">
                No signature boxes added.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {commonDetails.signatureBoxes.map((box, index) => (
                  <SignatureBoxEditor
                    key={index}
                    box={box}
                    index={index}
                    onChange={(updatedBox) => handleSignatureBoxChange(index, updatedBox)}
                    onRemove={() => handleRemoveSignatureBox(index)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleGenerateBulkCertificates}
              disabled={isGenerating || isPreparingZip || validParticipants.length === 0}
              className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-black text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-60 active:scale-98 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Generating {validParticipants.length} Certificates...</span>
                </>
              ) : (
                <span>Generate {validParticipants.length} Certificates</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadAllZip}
              disabled={isPreparingZip || isGenerating || generatedCertificates.length === 0}
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50 active:scale-98 flex items-center justify-center gap-2"
            >
              {isPreparingZip ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
                  <span>Preparing ZIP Archive...</span>
                </>
              ) : (
                <span>Download All as ZIP</span>
              )}
            </button>
          </div>

          {zipProgress && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-xs font-bold text-blue-700 flex items-center gap-2 animate-fade-in">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
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
              disabled={isPreparingZip || isGenerating}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>Download All as ZIP</span>
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
                  <tr key={cert._id || cert.certificateId || idx} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{cert.participantName}</td>
                    <td className="py-3 px-3 font-medium text-slate-600">{cert.organizationName}</td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-700">{cert.certificateId}</td>
                    <td className="py-3 px-3">
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                        {cert.status || "Generated"}
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
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 transition"
            >
              Export PDF
            </button>
          </div>
          <div className="overflow-hidden">
            <CertificatePreview ref={selectedSvgRef} certificateData={selectedCertificate} previewId="bulk-selected-preview-svg" />
          </div>
        </div>
      )}
    </section>
  );
}

export default BulkGenerate;
