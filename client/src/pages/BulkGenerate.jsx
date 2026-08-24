import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CertificatePreview from "../components/CertificatePreview.jsx";
import CertificateSvg from "../components/certificate/CertificateSvg.jsx";
import SignatureBoxEditor from "../components/certificate/SignatureBoxEditor.jsx";
import templateData from "../data/templateData.js";
import { bulkCreateCertificates } from "../services/certificateApi.js";
import {
  BULK_REQUEST_CHUNK_SIZE,
  MAX_PARTICIPANTS_LIMIT,
  buildCleanCommonDetails,
  cleanSignatureBoxes,
  executeChunkedBulkGeneration,
  generateBulkZipArchive,
  parseManualParticipantList,
  parseParticipantCsv
} from "../utils/bulkGeneration.js";
import downloadCertificatePdf, {
  generateCertificatePdfBlob,
  safeFileName
} from "../utils/downloadCertificatePdf.js";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-60 disabled:cursor-not-allowed";

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
  { title: "3. Batch Processing", desc: "Sequential 50-item chunks", icon: "📄" },
  { title: "4. ZIP Export", desc: "Download bundled PDFs", icon: "⬇️" }
];

const ITEMS_PER_PAGE = 25;

function BulkGenerate() {
  const [manualNames, setManualNames] = useState("");
  const [participants, setParticipants] = useState([]);
  const [commonDetails, setCommonDetails] = useState(initialCommonDetails);
  const [generatedCertificates, setGeneratedCertificates] = useState([]);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [csvImportSummary, setCsvImportSummary] = useState(null);
  const [failedBatchState, setFailedBatchState] = useState(null);

  // Editing inline
  const [editingParticipantId, setEditingParticipantId] = useState("");
  const [editParticipantDraft, setEditParticipantDraft] = useState({
    participantName: ""
  });

  // Export & ZIP
  const [exportCertificate, setExportCertificate] = useState(null);
  const [zipProgress, setZipProgress] = useState("");
  const [isPreparingZip, setIsPreparingZip] = useState(false);

  // Single Add Participant Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [modalError, setModalError] = useState("");

  // Pagination & Search for Queue & Results
  const [queuePage, setQueuePage] = useState(1);
  const [queueSearch, setQueueSearch] = useState("");
  const [resultsPage, setResultsPage] = useState(1);
  const [resultsSearch, setResultsSearch] = useState("");

  const selectedSvgRef = useRef(null);
  const batchSvgRef = useRef(null);
  const cancelGenerationRef = useRef(false);
  const cancelZipRef = useRef(false);

  // Filter out invalid participants with empty participantName
  const validParticipants = useMemo(() => {
    return participants.filter(
      (p) => p.participantName && p.participantName.trim() !== ""
    );
  }, [participants]);

  const invalidParticipants = useMemo(() => {
    return participants.filter(
      (p) => !p.participantName || p.participantName.trim() === ""
    );
  }, [participants]);

  // Filtered queue items based on search
  const filteredParticipants = useMemo(() => {
    if (!queueSearch.trim()) return participants;
    const term = queueSearch.toLowerCase();
    return participants.filter((p) =>
      (p.participantName || "").toLowerCase().includes(term)
    );
  }, [participants, queueSearch]);

  const totalQueuePages = Math.max(1, Math.ceil(filteredParticipants.length / ITEMS_PER_PAGE));
  const paginatedParticipants = useMemo(() => {
    const start = (queuePage - 1) * ITEMS_PER_PAGE;
    return filteredParticipants.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredParticipants, queuePage]);

  // Filtered results items based on search
  const filteredResults = useMemo(() => {
    if (!resultsSearch.trim()) return generatedCertificates;
    const term = resultsSearch.toLowerCase();
    return generatedCertificates.filter(
      (c) =>
        (c.participantName || "").toLowerCase().includes(term) ||
        (c.certificateId || "").toLowerCase().includes(term)
    );
  }, [generatedCertificates, resultsSearch]);

  const totalResultsPages = Math.max(1, Math.ceil(filteredResults.length / ITEMS_PER_PAGE));
  const paginatedResults = useMemo(() => {
    const start = (resultsPage - 1) * ITEMS_PER_PAGE;
    return filteredResults.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredResults, resultsPage]);

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

  const resetGeneratedResults = () => {
    setGeneratedCertificates([]);
    setSelectedCertificate(null);
    setSuccessMessage("");
    setErrorMessage("");
    setGenerationProgress(null);
    setFailedBatchState(null);
    setResultsPage(1);
  };

  // Add single participant directly from Modal
  const handleAddSingleParticipant = () => {
    const trimmedName = newParticipantName.trim();

    if (!trimmedName) {
      setModalError("Participant name is required.");
      return;
    }

    if (participants.length >= MAX_PARTICIPANTS_LIMIT) {
      setModalError(`Maximum ${MAX_PARTICIPANTS_LIMIT} participants allowed.`);
      return;
    }

    const newParticipant = {
      id: `manual-single-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      participantName: trimmedName,
      isInvalid: false
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
    const { participants: newItems, count } = parseManualParticipantList(manualNames);

    if (count === 0) {
      setError("No participants entered. Please type or paste at least one participant name per line.");
      return;
    }

    if (newItems.length > MAX_PARTICIPANTS_LIMIT) {
      setError(`Maximum ${MAX_PARTICIPANTS_LIMIT} participants can be added at once. (Found ${newItems.length} lines)`);
      return;
    }

    setParticipants(newItems);
    setEditingParticipantId("");
    setQueuePage(1);
    setCsvImportSummary(null);
    resetGeneratedResults();
    setSuccess(`Added ${count} manual participants to queue.`);
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
      const {
        participants: parsedRows,
        validCount,
        invalidCount,
        totalRows,
        errors
      } = parseParticipantCsv(csvText);

      if (totalRows === 0) {
        setError(errors[0] || "CSV file is empty. No participant rows were found.");
        return;
      }

      if (totalRows > MAX_PARTICIPANTS_LIMIT) {
        setError(`CSV file contains ${totalRows} rows. Maximum ${MAX_PARTICIPANTS_LIMIT} participants can be generated at once.`);
        return;
      }

      setParticipants(parsedRows);
      setEditingParticipantId("");
      setQueuePage(1);
      resetGeneratedResults();

      setCsvImportSummary({
        totalRows,
        validCount,
        invalidCount,
        errors
      });

      if (invalidCount > 0) {
        setError(`Imported ${totalRows} rows: ${validCount} valid, ${invalidCount} invalid. Please review highlighted rows below.`);
      } else {
        setSuccess(`Successfully imported ${validCount} participants from CSV.`);
      }
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
      "Nayan Tarapara",
      "Om Singh"
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

  const handleRemoveInvalidRows = () => {
    setParticipants((currentParticipants) =>
      currentParticipants.filter(
        (p) => p.participantName && p.participantName.trim() !== ""
      )
    );
    setCsvImportSummary(null);
    setEditingParticipantId("");
    resetGeneratedResults();
    setSuccess("Removed all invalid rows from participant queue.");
  };

  const handleClearQueue = () => {
    setParticipants([]);
    setManualNames("");
    setCsvImportSummary(null);
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
              ...participant,
              participantName,
              isInvalid: false
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

    if (validParticipants.length > MAX_PARTICIPANTS_LIMIT) {
      setError(`Maximum ${MAX_PARTICIPANTS_LIMIT} participants can be generated at once. Current valid count: ${validParticipants.length}`);
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

  const handleGenerateBulkCertificates = async (startIndex = 0) => {
    setErrorMessage("");
    setSuccessMessage("");
    setFailedBatchState(null);

    if (!validateBulkForm()) {
      return;
    }

    try {
      setIsGenerating(true);
      cancelGenerationRef.current = false;

      const result = await executeChunkedBulkGeneration({
        participants: validParticipants,
        commonDetails,
        bulkApiFn: bulkCreateCertificates,
        startIndex,
        onProgress: (progress) => {
          setGenerationProgress(progress);
        },
        onChunkSuccess: (chunkData) => {
          setGeneratedCertificates((prev) => {
            const existingKeys = new Set(
              prev.map((c) => c.certificateId || c._id)
            );
            const newCerts = chunkData.filter(
              (c) => !existingKeys.has(c.certificateId || c._id)
            );
            const updated = [...prev, ...newCerts];
            if (!selectedCertificate && updated.length > 0) {
              setSelectedCertificate(updated[0]);
            }
            return updated;
          });
        },
        shouldCancel: () => cancelGenerationRef.current
      });

      if (result.cancelled) {
        setSuccess(`Bulk generation cancelled. Generated ${result.processedCount} of ${result.totalCount} certificates.`);
        return;
      }

      if (result.success) {
        setSuccess(`Bulk generation completed. Successfully generated ${result.processedCount} / ${result.totalCount} certificates.`);
        setFailedBatchState(null);
      } else {
        setFailedBatchState({
          failedStartIndex: result.failedStartIndex || result.processedCount,
          failedCount: result.failedCount,
          failedBatchNumber: result.failedBatchNumber,
          error: result.error
        });
        setError(result.message || `${result.processedCount} of ${result.totalCount} certificates generated. Batch failed.`);
      }
    } catch (error) {
      console.error("Bulk certificate generation error:", error);
      setError(error.message || "Bulk certificate generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancelGeneration = () => {
    cancelGenerationRef.current = true;
  };

  const handleRetryFailedBatch = () => {
    if (!failedBatchState) return;
    handleGenerateBulkCertificates(failedBatchState.failedStartIndex);
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
      setSuccess(`Downloaded PDF for ${selectedCertificate.participantName}.`);
    } catch (err) {
      setError(err.message || "Failed to download selected certificate PDF.");
    }
  };

  const handleDownloadAllZip = async () => {
    if (!generatedCertificates || generatedCertificates.length === 0) {
      setError("No current bulk generation result. Generate certificates first.");
      return;
    }

    try {
      setIsPreparingZip(true);
      cancelZipRef.current = false;
      setErrorMessage("");
      setSuccessMessage("");

      const zipResult = await generateBulkZipArchive({
        certificates: generatedCertificates,
        commonDetails,
        renderCertificateBlob: async (certificate) => {
          setExportCertificate(certificate);
          // Wait for DOM & offscreen SVG to update
          await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)));

          if (batchSvgRef.current) {
            return await generateCertificatePdfBlob(batchSvgRef.current);
          }
          throw new Error("Export SVG canvas element not ready.");
        },
        onProgress: (progress) => {
          setZipProgress(progress.message);
        },
        shouldCancel: () => cancelZipRef.current
      });

      if (!zipResult || !zipResult.zipBlob) {
        throw new Error("Failed to produce ZIP archive.");
      }

      const zipUrl = URL.createObjectURL(zipResult.zipBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = zipUrl;
      downloadLink.download = zipResult.zipFileName;
      downloadLink.click();

      setTimeout(() => URL.revokeObjectURL(zipUrl), 2000);

      if (zipResult.failedCount > 0) {
        setError(`ZIP archive downloaded containing ${zipResult.successfulPdfCount} certificates. ${zipResult.failedCount} failed: ${zipResult.failedNames.join(", ")}`);
      } else {
        setSuccess(`ZIP archive containing ${zipResult.successfulPdfCount} certificates downloaded successfully.`);
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
          BULK STUDIO WORKSPACE (UP TO 1000 PARTICIPANTS)
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black text-slate-950 tracking-tight font-sans">
          Bulk Certificate Generator
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-600 font-medium leading-relaxed">
          Upload a CSV participant roster, paste manual names, or add participants individually. Batch generation executes in lightweight sequential chunks of 50 for smooth, high-volume processing up to 1000 certificates without browser freezes or network timeouts.
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
              {failedBatchState && (
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRetryFailedBatch}
                    disabled={isGenerating || isPreparingZip}
                    className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-black text-white hover:bg-rose-800 transition disabled:opacity-50"
                  >
                    Retry Remaining Batches
                  </button>
                </div>
              )}
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

      {/* Live Generation Progress Banner */}
      {isGenerating && generationProgress && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/95 p-5 text-xs font-bold text-blue-900 shadow-sm animate-fade-in space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span className="font-black text-sm text-blue-950">
                {generationProgress.message || "Generating certificates..."}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCancelGeneration}
              className="rounded-lg border border-rose-300 bg-white px-3 py-1 text-xs font-black text-rose-700 hover:bg-rose-50 transition"
            >
              Cancel Generation
            </button>
          </div>

          <div className="w-full bg-blue-200/70 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    ((generationProgress.processedCount || 0) /
                      (generationProgress.totalCount || 1)) *
                      100
                  )
                )}%`
              }}
            />
          </div>

          <div className="flex justify-between text-[11px] font-semibold text-blue-700">
            <span>
              Batch {generationProgress.currentBatch || 1} of {generationProgress.totalBatches || 1}
            </span>
            <span>
              {generationProgress.processedCount || 0} / {generationProgress.totalCount || 0} Certificates Processed
            </span>
          </div>
        </div>
      )}

      {/* Phase 1: Participant Input Options */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Option A: Manual Roster */}
        <div className="app-glass-surface-strong p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-blue-600">Option A</span>
            <span className="text-xs font-bold text-slate-400">One Name Per Line (200+ Lines Supported)</span>
          </div>
          <h3 className="text-lg font-black text-slate-950 font-sans">Enter Manual Participant List</h3>

          <textarea
            value={manualNames}
            onChange={(event) => setManualNames(event.target.value)}
            disabled={isGenerating || isPreparingZip}
            className="min-h-36 w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
            placeholder={"Pritkumar Koradiya\nKenil Dobariya\nNayan Tarapara\nOm Singh"}
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
              Preferred CSV header: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono">participantName</code> (up to 1000 rows)
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
              <p className="text-xs font-medium text-slate-500 mt-1">Supports standard CSV spreadsheets (200+, 500+, 1000 rows)</p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs font-mono text-slate-600 border border-slate-100">
            participantName<br />
            Pritkumar Koradiya<br />
            Kenil Dobariya<br />
            Nayan Tarapara
          </div>
        </div>
      </div>

      {/* CSV Import Report Banner */}
      {csvImportSummary && csvImportSummary.invalidCount > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs font-bold text-amber-900 shadow-xs flex items-start justify-between gap-3 animate-fade-in">
          <div>
            <p className="font-black text-amber-950">CSV Import Summary</p>
            <p className="mt-0.5">
              Imported {csvImportSummary.totalRows} rows — <span className="text-emerald-700 font-black">{csvImportSummary.validCount} valid</span>, <span className="text-rose-700 font-black">{csvImportSummary.invalidCount} invalid</span>.
            </p>
            <div className="mt-2 max-h-24 overflow-y-auto space-y-0.5 text-[11px] font-medium text-amber-800">
              {csvImportSummary.errors.slice(0, 5).map((err, i) => (
                <p key={i}>• {err}</p>
              ))}
              {csvImportSummary.errors.length > 5 && (
                <p className="font-bold">... and {csvImportSummary.errors.length - 5} more</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveInvalidRows}
            className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-black text-white hover:bg-amber-700 transition shrink-0"
          >
            Remove Invalid Rows
          </button>
        </div>
      )}

      {/* Participant Roster Queue Table */}
      <div className="rounded-3xl border border-slate-200/90 bg-white/90 p-6 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-950 font-sans">Participant Queue</h3>
            <p className="text-xs font-medium text-slate-500">Review or modify names before launching batch generation</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`rounded-full border px-3 py-1.5 text-xs font-black ${
                invalidParticipants.length > 0
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-blue-50 border-blue-200 text-blue-700"
              }`}
            >
              Valid participants: {validParticipants.length} / {participants.length}
            </span>

            {participants.length > 0 && (
              <button
                type="button"
                onClick={handleClearQueue}
                disabled={isGenerating || isPreparingZip}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
              >
                Clear Queue
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setModalError("");
                setNewParticipantName("");
                setIsAddModalOpen(true);
              }}
              disabled={participants.length >= MAX_PARTICIPANTS_LIMIT || isGenerating || isPreparingZip}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              + Add Participant
            </button>
          </div>
        </div>

        {participants.length > MAX_PARTICIPANTS_LIMIT && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-800 flex items-center gap-2">
            <span>⚠️</span>
            <span>Maximum 1000 participants can be generated at once. Please reduce your queue size.</span>
          </div>
        )}

        {participants.length > 0 ? (
          <div className="space-y-3">
            {/* Search & Stats Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <input
                type="text"
                value={queueSearch}
                onChange={(e) => {
                  setQueueSearch(e.target.value);
                  setQueuePage(1);
                }}
                placeholder="Search participant names in queue..."
                className="h-9 w-full sm:w-72 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold outline-none focus:border-blue-500 focus:bg-white"
              />
              <span className="text-xs font-bold text-slate-400">
                Showing {paginatedParticipants.length} of {filteredParticipants.length} participants
              </span>
            </div>

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
                  {paginatedParticipants.map((participant, index) => {
                    const isEditing = editingParticipantId === participant.id;
                    const isValid = participant.participantName && participant.participantName.trim() !== "";
                    const absoluteIndex = (queuePage - 1) * ITEMS_PER_PAGE + index + 1;

                    return (
                      <tr
                        key={participant.id}
                        className={`transition ${isValid ? "hover:bg-slate-50/60" : "bg-rose-50/40"}`}
                      >
                        <td className="py-3 px-3 font-bold text-slate-400">{absoluteIndex}</td>
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
                              {participant.participantName || "(Empty Name — Click Edit to Fix)"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-medium text-slate-600">
                            {commonDetails.organizationName || "Common Organization"}
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

            {/* Pagination Controls */}
            {totalQueuePages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-slate-600">
                <span>
                  Page {queuePage} of {totalQueuePages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQueuePage((p) => Math.max(1, p - 1))}
                    disabled={queuePage === 1}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueuePage((p) => Math.min(totalQueuePages, p + 1))}
                    disabled={queuePage === totalQueuePages}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
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
              <input
                className={inputClass}
                name="organizationName"
                value={commonDetails.organizationName}
                onChange={handleCommonChange}
                placeholder="e.g. PP Savani University"
                disabled={isGenerating || isPreparingZip}
              />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Event Name *
              <input
                className={inputClass}
                name="eventName"
                value={commonDetails.eventName}
                onChange={handleCommonChange}
                placeholder="e.g. Hackathon 2026"
                disabled={isGenerating || isPreparingZip}
              />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Certificate Category *
              <select
                className={inputClass}
                name="certificateCategory"
                value={commonDetails.certificateCategory}
                onChange={handleCommonChange}
                disabled={isGenerating || isPreparingZip}
              >
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
              <input
                className={inputClass}
                name="certificateTitle"
                value={commonDetails.certificateTitle}
                onChange={handleCommonChange}
                disabled={isGenerating || isPreparingZip}
              />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Event Date *
              <input
                className={inputClass}
                type="date"
                name="eventDate"
                value={commonDetails.eventDate}
                onChange={handleCommonChange}
                disabled={isGenerating || isPreparingZip}
              />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Template Style *
              <select
                className={inputClass}
                name="templateStyle"
                value={commonDetails.templateStyle}
                onChange={handleCommonChange}
                disabled={isGenerating || isPreparingZip}
              >
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

          {/* Action Buttons Strip */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => handleGenerateBulkCertificates(0)}
              disabled={
                isGenerating ||
                isPreparingZip ||
                validParticipants.length === 0 ||
                validParticipants.length > MAX_PARTICIPANTS_LIMIT
              }
              className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-black text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-60 active:scale-98 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>
                    Generating {generationProgress?.processedCount || 0} / {validParticipants.length} Certificates...
                  </span>
                </>
              ) : validParticipants.length > MAX_PARTICIPANTS_LIMIT ? (
                <span>Maximum 1000 participants allowed</span>
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
                  <span>Preparing ZIP...</span>
                </>
              ) : (
                <span>Download All as ZIP ({generatedCertificates.length})</span>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600">Generated Batch</span>
              <h3 className="text-lg font-black text-slate-950 font-sans">
                Generated Certificate Records ({generatedCertificates.length} Total)
              </h3>
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

          {/* Search Bar for Generated Results */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <input
              type="text"
              value={resultsSearch}
              onChange={(e) => {
                setResultsSearch(e.target.value);
                setResultsPage(1);
              }}
              placeholder="Search generated certificates..."
              className="h-9 w-full sm:w-72 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold outline-none focus:border-blue-500 focus:bg-white"
            />
            <span className="text-xs font-bold text-slate-400">
              Showing {paginatedResults.length} of {filteredResults.length} records
            </span>
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
                {paginatedResults.map((cert, idx) => {
                  const absoluteIdx = (resultsPage - 1) * ITEMS_PER_PAGE + idx + 1;
                  return (
                    <tr key={cert._id || cert.certificateId || idx} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-bold text-slate-400">{absoluteIdx}</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Results Pagination Controls */}
          {totalResultsPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-slate-600">
              <span>
                Page {resultsPage} of {totalResultsPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setResultsPage((p) => Math.max(1, p - 1))}
                  disabled={resultsPage === 1}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setResultsPage((p) => Math.min(totalResultsPages, p + 1))}
                  disabled={resultsPage === totalResultsPages}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
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
