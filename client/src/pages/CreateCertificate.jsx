import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CertificatePreview from "../components/CertificatePreview.jsx";
import CertificateSvgTestPanel from "../components/certificate/CertificateSvgTestPanel.jsx";
import templateData from "../data/templateData.js";
import { createCertificate, saveDraftCertificate } from "../services/certificateApi.js";
import downloadCertificatePdf, { downloadCertificatePng } from "../utils/downloadCertificatePdf.js";
import validateCertificateLayout from "../utils/validateCertificateLayout.js";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100";

const initialFormData = {
  participantName: "",
  organizationName: "",
  eventName: "",
  category: "",
  certificateTitle: "",
  eventDate: "",
  description: "",
  templateStyle: "",
  authorizedSignatureName: "Authorized Person"
};

const certificateCategories = [
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

function CreateCertificate() {
  const [formData, setFormData] = useState(initialFormData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [generatedCertificate, setGeneratedCertificate] = useState(null);
  const certificateSvgRef = useRef(null);

  useEffect(() => {
    const selectedTemplate = localStorage.getItem("selectedCertificateTemplate");

    if (selectedTemplate) {
      setFormData((currentData) => ({
        ...currentData,
        templateStyle: selectedTemplate
      }));
    }
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentData) => ({
      ...currentData,
      [name]: value
    }));
    setGeneratedCertificate(null);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset the form?")) {
      setFormData(initialFormData);
      setGeneratedCertificate(null);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setIsSavingDraft(true);

      await saveDraftCertificate({
        participantName: formData.participantName,
        organizationName: formData.organizationName,
        eventName: formData.eventName,
        certificateCategory: formData.category,
        certificateTitle: formData.certificateTitle,
        eventDate: formData.eventDate,
        description: formData.description,
        templateStyle: formData.templateStyle,
        authorizedSignatureName: formData.authorizedSignatureName || "Authorized Person"
      });

      alert("Draft saved successfully.");
    } catch (error) {
      alert(error.message || "Unable to save draft. Please try again.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const validateForm = () => {
    const requiredFields = [
      { key: "participantName", label: "Participant Name" },
      { key: "organizationName", label: "Organization Name" },
      { key: "eventName", label: "Event Name" },
      { key: "category", label: "Certificate Category" },
      { key: "certificateTitle", label: "Certificate Title" },
      { key: "eventDate", label: "Event Date" },
      { key: "templateStyle", label: "Template Style" }
    ];

    const missingFields = requiredFields
      .filter((field) => !formData[field.key])
      .map((field) => field.label);

    if (missingFields.length > 0) {
      alert(`Please fill these required fields: ${missingFields.join(", ")}`);
      return false;
    }

    validateCertificateLayout(formData);
    return true;
  };

  const handleGenerateCertificate = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsGenerating(true);

      const result = await createCertificate({
        participantName: formData.participantName,
        organizationName: formData.organizationName,
        eventName: formData.eventName,
        certificateCategory: formData.category,
        certificateTitle: formData.certificateTitle,
        eventDate: formData.eventDate,
        description: formData.description,
        templateStyle: formData.templateStyle,
        authorizedSignatureName: formData.authorizedSignatureName || "Authorized Person"
      });

      setGeneratedCertificate(result.data);
      alert("Certificate generated and saved successfully.");
    } catch (error) {
      alert(error.message || "Unable to generate certificate. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const createPdfFileName = () => {
    const participantName = formData.participantName.trim().replace(/\s+/g, "_") || "Participant";
    const certificateId = generatedCertificate?.certificateId || "CERT-2026-001";

    return `${participantName}_${certificateId}.pdf`;
  };

  const createPngFileName = () => {
    const participantName = formData.participantName.trim().replace(/\s+/g, "_") || "Participant";
    const certificateId = generatedCertificate?.certificateId || "CERT-2026-001";

    return `${participantName}_${certificateId}.png`;
  };

  const handleDownloadPdf = async () => {
    if (!certificateSvgRef.current) {
      alert("Certificate SVG renderer is initializing. Please try again in a moment.");
      return;
    }

    await downloadCertificatePdf(certificateSvgRef.current, createPdfFileName());
  };

  const handleDownloadPng = async () => {
    if (!certificateSvgRef.current) {
      alert("Certificate SVG renderer is initializing. Please try again in a moment.");
      return;
    }

    await downloadCertificatePng(certificateSvgRef.current, createPngFileName());
  };

  const selectedTemplateName = formData.templateStyle || "Classic Certificate";
  const previewData = generatedCertificate
    ? {
        ...formData,
        certificateId: generatedCertificate.certificateId,
        createdAt: generatedCertificate.createdAt,
        authorizedSignatureName: generatedCertificate.authorizedSignatureName || formData.authorizedSignatureName
      }
    : formData;

  const descLength = (formData.description || "").length;

  return (
    <section className="space-y-8 pb-10">
      {/* DEV-Only Pure SVG Test Suite Panel */}
      <CertificateSvgTestPanel />

      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Link to="/certificate-dashboard" className="hover:text-blue-600 transition">
          Certificate Studio
        </Link>
        <span>/</span>
        <span className="text-slate-800">Certificate Builder</span>
      </nav>

      {/* Page Header */}
      <div className="app-glass-hero p-7 lg:p-9 animate-hero-fade-in">
        <span className="text-xs font-black uppercase tracking-widest text-blue-600">
          STUDIO BUILDER
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black text-slate-950 tracking-tight font-sans">
          Create Certificate
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-600 font-medium leading-relaxed">
          Fill out participant and event information, select an official template design, preview live in real-time, and export high-resolution PDF or PNG.
        </p>
      </div>

      {/* Main Form Section */}
      <form
        className="app-glass-surface-strong p-6 sm:p-8 space-y-8"
        onSubmit={(event) => event.preventDefault()}
      >
        {/* Section 1: Participant Information */}
        <div>
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-sm font-black">
              1
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-950 font-sans">Participant Information</h3>
              <p className="text-xs text-slate-500 font-semibold">Details about the recipient and organization</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Participant Name *
              <input
                className={inputClass}
                type="text"
                name="participantName"
                value={formData.participantName}
                onChange={handleChange}
                placeholder="e.g. Pritkumar Koradiya"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Organization Name *
              <input
                className={inputClass}
                type="text"
                name="organizationName"
                value={formData.organizationName}
                onChange={handleChange}
                placeholder="e.g. PP Savani University"
              />
            </label>
          </div>
        </div>

        {/* Section 2: Event Information */}
        <div>
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-sm font-black">
              2
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-950 font-sans">Event Information</h3>
              <p className="text-xs text-slate-500 font-semibold">Event title, category, date, and description</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Event Name *
              <input
                className={inputClass}
                type="text"
                name="eventName"
                value={formData.eventName}
                onChange={handleChange}
                placeholder="e.g. Hackathon 2026"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Certificate Category *
              <select className={inputClass} name="category" value={formData.category} onChange={handleChange}>
                <option value="">Select Category</option>
                {certificateCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Event Date *
              <input
                className={inputClass}
                type="date"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleChange}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 md:col-span-2 xl:col-span-3">
              <div className="flex justify-between items-center">
                <span>Certificate Description / Details</span>
                <span className={`text-[10px] font-bold ${descLength > 180 ? "text-amber-600" : "text-slate-400"}`}>
                  {descLength}/220 characters {descLength > 180 && "(Recommended max reached)"}
                </span>
              </div>
              <textarea
                className={`${inputClass} !h-28 resize-y py-3`}
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter achievement details, topic summary, or additional text..."
              />
            </label>
          </div>
        </div>

        {/* Section 3: Design & Signature */}
        <div>
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 text-sm font-black">
              3
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-950 font-sans">Design & Signature</h3>
              <p className="text-xs text-slate-500 font-semibold">Title heading, template style, and signature authority</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Certificate Title *
              <input
                className={inputClass}
                type="text"
                name="certificateTitle"
                value={formData.certificateTitle}
                onChange={handleChange}
                placeholder="Certificate of Participation"
              />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Template Style *
              <select className={inputClass} name="templateStyle" value={formData.templateStyle} onChange={handleChange}>
                <option value="">Select Template Style</option>
                {templateData.map((tpl) => (
                  <option key={tpl.id} value={tpl.name}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Authorized Signature Name
              <input
                className={inputClass}
                type="text"
                name="authorizedSignatureName"
                value={formData.authorizedSignatureName}
                onChange={handleChange}
                placeholder="Authorized Person"
              />
            </label>
          </div>
        </div>

        {/* Actions Toolbar */}
        <div className="pt-6 border-t border-slate-100 flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition active:scale-98"
          >
            Reset Form
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100 transition disabled:opacity-60 active:scale-98"
          >
            {isSavingDraft ? "Saving Draft..." : "Save Draft"}
          </button>

          <button
            type="button"
            onClick={handleGenerateCertificate}
            disabled={isGenerating}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-black text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-60 active:scale-98"
          >
            {isGenerating ? "Generating..." : "Generate Certificate"}
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-black text-white shadow-md hover:from-emerald-700 hover:to-teal-700 transition active:scale-98"
          >
            Download PDF
          </button>

          <button
            type="button"
            onClick={handleDownloadPng}
            className="rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100 transition active:scale-98"
          >
            Download PNG
          </button>
        </div>
      </form>

      {/* Certificate Live Preview Block */}
      <section className="app-glass-surface p-6 sm:p-8 space-y-6">
        {/* Preview Toolbar */}
        <div className="app-glass-toolbar sticky top-20 z-20 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Pure SVG Live Canvas</p>
            </div>
            <h3 className="text-lg font-black text-slate-950 font-sans">Certificate Live Preview</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              Style: {selectedTemplateName}
            </span>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-xs hover:bg-emerald-700 transition"
            >
              Export PDF
            </button>
          </div>
        </div>

        {/* Certificate Target Preview Root (Pure SVG directly) */}
        <div className="mx-auto w-full max-w-[1200px] overflow-hidden">
          <CertificatePreview ref={certificateSvgRef} certificateData={previewData} previewId="create-certificate-preview-svg" />
        </div>
      </section>
    </section>
  );
}

export default CreateCertificate;
