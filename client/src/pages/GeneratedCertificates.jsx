import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CertificatePreview from "../components/CertificatePreview.jsx";
import SignatureUploadControl from "../components/certificate/SignatureUploadControl.jsx";
import templateData from "../data/templateData.js";
import { deleteCertificate, getCertificates, updateCertificate } from "../services/certificateApi.js";
import downloadCertificatePdf from "../utils/downloadCertificatePdf.js";
import StatusPill from "../components/ui/StatusPill.jsx";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100";

const categoryOptions = [
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

const createEditData = (certificate) => ({
  participantName: certificate?.participantName || "",
  organizationName: certificate?.organizationName || "",
  eventName: certificate?.eventName || "",
  certificateCategory: certificate?.certificateCategory || "",
  certificateTitle: certificate?.certificateTitle || "",
  eventDate: certificate?.eventDate || "",
  description: certificate?.description || "",
  templateStyle: certificate?.templateStyle || "",
  drSignatureName: certificate?.drSignatureName || "Dr. Niraj Shah",
  drSignatureMode: certificate?.drSignatureMode || "blank",
  drSignatureImage: certificate?.drSignatureImage || null,
  authorizedSignatureName: certificate?.authorizedSignatureName || "Authorized Person",
  authorizedSignatureMode: certificate?.authorizedSignatureMode || "blank",
  authorizedSignatureImage: certificate?.authorizedSignatureImage || null,
  signatureLayout: certificate?.signatureLayout || "both",
  singleSignaturePosition: certificate?.singleSignaturePosition || "center",
  status: certificate?.status || "Generated"
});

function GeneratedCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [editingCertificate, setEditingCertificate] = useState(null);
  const [editData, setEditData] = useState(createEditData(null));
  const [pendingDownload, setPendingDownload] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedGenerationType, setSelectedGenerationType] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const selectedSvgRef = useRef(null);

  const categories = useMemo(() => {
    const savedCategories = certificates
      .map((certificate) => certificate.certificateCategory)
      .filter(Boolean);

    return ["All", ...new Set([...categoryOptions, ...savedCategories])];
  }, [certificates]);

  const filteredCertificates = useMemo(() => {
    const normalizedSearchTerm = searchTerm.toLowerCase().trim();

    return certificates.filter((certificate) => {
      const generationType = certificate.generationType || "Single";
      const status = certificate.status || "Generated";
      const matchesSearch =
        !normalizedSearchTerm ||
        certificate.participantName?.toLowerCase().includes(normalizedSearchTerm) ||
        certificate.eventName?.toLowerCase().includes(normalizedSearchTerm) ||
        certificate.certificateId?.toLowerCase().includes(normalizedSearchTerm);
      const matchesCategory = selectedCategory === "All" || certificate.certificateCategory === selectedCategory;
      const matchesGenerationType = selectedGenerationType === "All" || generationType === selectedGenerationType;
      const matchesStatus = selectedStatus === "All" || status === selectedStatus;

      return matchesSearch && matchesCategory && matchesGenerationType && matchesStatus;
    });
  }, [certificates, searchTerm, selectedCategory, selectedGenerationType, selectedStatus]);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const result = await getCertificates();
        const savedCertificates = result.data || [];
        setCertificates(savedCertificates);
        setSelectedCertificate(savedCertificates[0] || null);
      } catch (error) {
        setErrorMessage(error.message || "Unable to fetch certificates.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCertificates();
  }, []);

  useEffect(() => {
    if (!pendingDownload || !selectedCertificate || !selectedSvgRef.current) {
      return;
    }

    const downloadSelectedCertificate = async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await downloadCertificatePdf(selectedSvgRef.current, createPdfFileName(selectedCertificate));
      setPendingDownload(false);
    };

    downloadSelectedCertificate();
  }, [pendingDownload, selectedCertificate]);

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "N/A";
    }

    return new Date(dateValue).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const createPdfFileName = (certificate) => {
    const participantName = (certificate.participantName || "Participant").trim().replace(/\s+/g, "_");
    const certificateId = certificate.certificateId || "CERT-2026-001";

    return `${participantName}_${certificateId}.pdf`;
  };

  const handleView = (certificate) => {
    setSelectedCertificate(certificate);
  };

  const handleStartEdit = (certificate) => {
    setEditingCertificate(certificate);
    setEditData(createEditData(certificate));
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditData((currentData) => ({
      ...currentData,
      [name]: value
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingCertificate) {
      return;
    }

    try {
      setIsSavingEdit(true);

      const result = await updateCertificate(editingCertificate._id, editData);
      const updatedCertificate = result.data;

      setCertificates((currentCertificates) =>
        currentCertificates.map((certificate) =>
          certificate._id === updatedCertificate._id ? updatedCertificate : certificate
        )
      );
      setSelectedCertificate(updatedCertificate);
      setEditingCertificate(null);
      alert("Certificate updated successfully.");
    } catch (error) {
      alert(error.message || "Unable to update certificate. Please try again.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (certificate) => {
    const confirmed = window.confirm("Are you sure you want to delete this certificate?");

    if (!confirmed) {
      return;
    }

    try {
      await deleteCertificate(certificate._id);
      const remainingCertificates = certificates.filter((item) => item._id !== certificate._id);

      setCertificates(remainingCertificates);

      if (selectedCertificate?._id === certificate._id) {
        setSelectedCertificate(remainingCertificates[0] || null);
      }

      if (editingCertificate?._id === certificate._id) {
        setEditingCertificate(null);
      }

      alert("Certificate deleted successfully.");
    } catch (error) {
      alert(error.message || "Unable to delete certificate. Please try again.");
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedCertificate || !selectedSvgRef.current) {
      alert("Please select a certificate first.");
      return;
    }

    await downloadCertificatePdf(selectedSvgRef.current, createPdfFileName(selectedCertificate));
  };

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <p className="text-sm font-bold text-slate-600">Loading certificate records...</p>
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-center shadow-xs">
        <h2 className="text-xl font-black text-rose-700">Unable to load certificates</h2>
        <p className="mt-2 text-sm text-rose-600">{errorMessage}</p>
      </section>
    );
  }

  const normalizedSelectedCertificate = selectedCertificate
    ? {
        ...selectedCertificate,
        drSignatureName: selectedCertificate.drSignatureName || "Dr. Niraj Shah",
        drSignatureMode: selectedCertificate.drSignatureMode || "blank",
        drSignatureImage: selectedCertificate.drSignatureImage || null,
        authorizedSignatureName: selectedCertificate.authorizedSignatureName || "Authorized Person",
        authorizedSignatureMode: selectedCertificate.authorizedSignatureMode || "blank",
        authorizedSignatureImage: selectedCertificate.authorizedSignatureImage || null,
        signatureLayout: selectedCertificate.signatureLayout || "both",
        singleSignaturePosition: selectedCertificate.singleSignaturePosition || "center"
      }
    : null;

  return (
    <section className="space-y-8 pb-10">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Link to="/certificate-dashboard" className="hover:text-blue-600 transition">
          Certificate Studio
        </Link>
        <span>/</span>
        <span className="text-slate-800">Certificate Records</span>
      </nav>

      {/* Page Hero */}
      <div className="rounded-3xl border border-blue-100/80 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/40 p-7 shadow-xs lg:p-9 animate-hero-fade-in">
        <span className="text-xs font-black uppercase tracking-widest text-blue-600">
          DOCUMENT DATABASE
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black text-slate-950 tracking-tight font-sans">
          Certificate Records
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-600 font-medium leading-relaxed">
          Manage saved drafts and generated certificate records. Search, edit fields, filter by category, or export individual PDF files.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="app-glass-toolbar p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by participant, event, or ID..."
            className={inputClass}
          />
          <select className={inputClass} value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
            {categories.map((category) => (
              <option key={category} value={category}>
                Category: {category}
              </option>
            ))}
          </select>
          <select className={inputClass} value={selectedGenerationType} onChange={(event) => setSelectedGenerationType(event.target.value)}>
            <option value="All">Type: All</option>
            <option value="Single">Type: Single</option>
            <option value="Bulk">Type: Bulk</option>
          </select>
          <select className={inputClass} value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
            <option value="All">Status: All</option>
            <option value="Generated">Generated</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500 px-1">
          <span>Showing {filteredCertificates.length} of {certificates.length} records</span>
          {(searchTerm || selectedCategory !== "All" || selectedGenerationType !== "All" || selectedStatus !== "All") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("All");
                setSelectedGenerationType("All");
                setSelectedStatus("All");
              }}
              className="text-blue-600 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Records Table / List */}
      {certificates.length === 0 ? (
        <div className="app-glass-surface p-12 text-center shadow-xs">
          <span className="text-4xl block mb-3">🏆</span>
          <h3 className="text-xl font-black text-slate-950 font-sans">No certificate records found.</h3>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            Certificates generated or saved as drafts will automatically be recorded here.
          </p>
          <Link
            to="/create-certificate"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 transition"
          >
            <span>Create First Certificate</span>
            <span>→</span>
          </Link>
        </div>
      ) : (
        <div className="app-glass-table overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                  <th className="py-4 px-4">Participant</th>
                  <th className="py-4 px-4">Event</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">Template</th>
                  <th className="py-4 px-4">Certificate ID</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCertificates.map((cert) => {
                  const isSelected = selectedCertificate?._id === cert._id;
                  return (
                    <tr
                      key={cert._id}
                      className={`hover:bg-blue-50/30 transition ${
                        isSelected ? "bg-blue-50/50 font-semibold" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-950">
                        {cert.participantName || "Draft Participant"}
                        {cert.organizationName && (
                          <span className="block text-[11px] font-normal text-slate-500">{cert.organizationName}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{cert.eventName || "N/A"}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">{cert.certificateCategory || "N/A"}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">{cert.templateStyle || "Default"}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700">{cert.certificateId}</td>
                      <td className="py-3.5 px-4">
                        <StatusPill status={cert.status || "Generated"} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleView(cert)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            }`}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cert)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCertificate(cert);
                              setPendingDownload(true);
                            }}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                          >
                            PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cert)}
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

      {/* Selected Certificate Preview Card */}
      {normalizedSelectedCertificate && (
        <section className="rounded-3xl border border-slate-200/90 bg-white/90 p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-blue-600">Selected Record View</span>
              <h3 className="text-xl font-black text-slate-950 font-sans">
                {normalizedSelectedCertificate.participantName || "Draft Participant"} — {normalizedSelectedCertificate.certificateId}
              </h3>
            </div>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-700 transition shadow-xs"
            >
              Export PDF
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="overflow-hidden">
              <CertificatePreview
                ref={selectedSvgRef}
                certificateData={normalizedSelectedCertificate}
                previewId="generated-certificate-preview-svg"
              />
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-xs space-y-3">
              <p className="font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 text-[10px]">
                Certificate Metadata
              </p>
              <div>
                <span className="text-slate-400 font-bold block">Participant:</span>
                <span className="font-bold text-slate-800">{normalizedSelectedCertificate.participantName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Organization:</span>
                <span className="font-semibold text-slate-700">{normalizedSelectedCertificate.organizationName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Event:</span>
                <span className="font-semibold text-slate-700">{normalizedSelectedCertificate.eventName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Event Date:</span>
                <span className="font-semibold text-slate-700">{normalizedSelectedCertificate.eventDate}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Template Style:</span>
                <span className="font-semibold text-slate-700">{normalizedSelectedCertificate.templateStyle}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Record Created:</span>
                <span className="font-semibold text-slate-700">{formatDate(normalizedSelectedCertificate.createdAt)}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Edit Certificate Modal Overlay */}
      {editingCertificate && (
        <div className="app-glass-modal-overlay fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="app-glass-modal w-full max-w-3xl overflow-hidden my-8">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-950">Edit Certificate</h3>
                <p className="text-xs font-semibold text-slate-500">Certificate ID: {editingCertificate.certificateId}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCertificate(null)}
                className="text-slate-400 hover:text-slate-600 transition font-bold"
              >
                ✕
              </button>
            </div>

            <form className="p-6 space-y-6 max-h-[80vh] overflow-y-auto" onSubmit={(e) => e.preventDefault()}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Participant Name
                  <input className={inputClass} name="participantName" value={editData.participantName} onChange={handleEditChange} />
                </label>
                <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Organization Name
                  <input className={inputClass} name="organizationName" value={editData.organizationName} onChange={handleEditChange} />
                </label>
                <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Event Name
                  <input className={inputClass} name="eventName" value={editData.eventName} onChange={handleEditChange} />
                </label>
                <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Certificate Category
                  <select className={inputClass} name="certificateCategory" value={editData.certificateCategory} onChange={handleEditChange}>
                    <option value="">Select Category</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Certificate Title
                  <input className={inputClass} name="certificateTitle" value={editData.certificateTitle} onChange={handleEditChange} />
                </label>
                <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Event Date
                  <input className={inputClass} type="date" name="eventDate" value={editData.eventDate} onChange={handleEditChange} />
                </label>
                <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Template Style
                  <select className={inputClass} name="templateStyle" value={editData.templateStyle} onChange={handleEditChange}>
                    <option value="">Select Template</option>
                    {templateData.map((tpl) => (
                      <option key={tpl.id} value={tpl.name}>
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Status
                  <select className={inputClass} name="status" value={editData.status} onChange={handleEditChange}>
                    <option value="Generated">Generated</option>
                    <option value="Draft">Draft</option>
                  </select>
                </label>
              </div>

              {/* Signature Settings inside Edit Modal */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Signature Settings</h4>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Who should sign?
                  </label>
                  <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setEditData((prev) => ({ ...prev, signatureLayout: "dr-only" }))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                        editData.signatureLayout === "dr-only" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600"
                      }`}
                    >
                      Dr. Niraj Shah only
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditData((prev) => ({ ...prev, signatureLayout: "authorized-only" }))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                        editData.signatureLayout === "authorized-only" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600"
                      }`}
                    >
                      Authorized Person only
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditData((prev) => ({ ...prev, signatureLayout: "both" }))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
                        editData.signatureLayout === "both" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600"
                      }`}
                    >
                      Both
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {(editData.signatureLayout === "both" || editData.signatureLayout === "dr-only") && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-slate-600">
                        Dr. Niraj Shah Name
                        <input className={inputClass} name="drSignatureName" value={editData.drSignatureName} onChange={handleEditChange} />
                      </label>
                      <SignatureUploadControl
                        label="Signature Type"
                        personName={editData.drSignatureName || "Dr. Niraj Shah"}
                        mode={editData.drSignatureMode}
                        image={editData.drSignatureImage}
                        onModeChange={(mode) => setEditData((prev) => ({ ...prev, drSignatureMode: mode }))}
                        onImageChange={(imageDataUrl) =>
                          setEditData((prev) => ({
                            ...prev,
                            drSignatureMode: "image",
                            drSignatureImage: imageDataUrl
                          }))
                        }
                        onRemoveImage={() =>
                          setEditData((prev) => ({
                            ...prev,
                            drSignatureMode: "blank",
                            drSignatureImage: null
                          }))
                        }
                      />
                    </div>
                  )}

                  {(editData.signatureLayout === "both" || editData.signatureLayout === "authorized-only") && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-wider text-slate-600">
                        Authorized Person Name
                        <input className={inputClass} name="authorizedSignatureName" value={editData.authorizedSignatureName} onChange={handleEditChange} />
                      </label>
                      <SignatureUploadControl
                        label="Signature Type"
                        personName={editData.authorizedSignatureName || "Authorized Person"}
                        mode={editData.authorizedSignatureMode}
                        image={editData.authorizedSignatureImage}
                        onModeChange={(mode) => setEditData((prev) => ({ ...prev, authorizedSignatureMode: mode }))}
                        onImageChange={(imageDataUrl) =>
                          setEditData((prev) => ({
                            ...prev,
                            authorizedSignatureMode: "image",
                            authorizedSignatureImage: imageDataUrl
                          }))
                        }
                        onRemoveImage={() =>
                          setEditData((prev) => ({
                            ...prev,
                            authorizedSignatureMode: "blank",
                            authorizedSignatureImage: null
                          }))
                        }
                      />
                    </div>
                  )}
                </div>

                {(editData.signatureLayout === "dr-only" || editData.signatureLayout === "authorized-only") && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Signature Position
                    </label>
                    <div className="inline-flex rounded-lg bg-white p-1 border border-slate-200">
                      {["left", "center", "right"].map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setEditData((prev) => ({ ...prev, singleSignaturePosition: pos }))}
                          className={`rounded px-3 py-1 text-xs font-bold capitalize transition ${
                            editData.singleSignaturePosition === pos ? "bg-blue-600 text-white" : "text-slate-600"
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingCertificate(null)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 transition disabled:opacity-60"
                >
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default GeneratedCertificates;

