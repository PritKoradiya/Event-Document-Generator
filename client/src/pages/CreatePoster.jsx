import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import PosterPreview from "../components/PosterPreview.jsx";
import PosterSvgTestPanel from "../components/poster/PosterSvgTestPanel.jsx";
import posterData from "../data/posterData.js";
import { createPoster, saveDraftPoster } from "../services/posterApi.js";
import { downloadPosterPng, downloadPosterPdf } from "../utils/downloadPoster.js";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100";

const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 min-h-24 resize-y";

const initialFormData = {
  posterTitle: "ANNUAL INNOVATION & TECH SUMMIT 2026",
  tagline: "Empowering Next-Gen Innovators & Leaders",
  category: "Seminar",
  eventDate: "2026-08-15",
  eventTime: "10:00 AM - 04:00 PM",
  venue: "Main Auditorium, PP Savani University",
  speakerName: "Dr. Pritkumar Koradiya",
  speakerDesignation: "AI & Cloud Architecture Specialist",
  organizerName: "School of Engineering & Tech Club",
  description: "Join us for an immersive day of insightful technical talks, hands-on demonstrations, and networking opportunities with industry pioneers.",
  contactInformation: "+91 98765 43210 | info@ppsu.ac.in",
  registrationText: "Free Entry • Scan QR to Register Online",
  templateStyle: "Seminar Poster"
};

function CreatePoster() {
  const [formData, setFormData] = useState(initialFormData);
  const [posterImageFile, setPosterImageFile] = useState(null);
  const [posterImagePreview, setPosterImagePreview] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [generatedPoster, setGeneratedPoster] = useState(null);

  const posterSvgRef = useRef(null);

  // Auto-select template from localStorage if set from Template Gallery
  useEffect(() => {
    const savedTemplateName = localStorage.getItem("selectedPosterTemplate");
    const savedPosterObjStr = localStorage.getItem("selectedPosterObject");

    if (savedPosterObjStr) {
      try {
        const obj = JSON.parse(savedPosterObjStr);
        setFormData((prev) => ({
          ...prev,
          templateStyle: obj.name || prev.templateStyle,
          category: obj.category || prev.category
        }));
      } catch (e) {
        console.error("Failed to parse selectedPosterObject", e);
      }
      localStorage.removeItem("selectedPosterObject");
    } else if (savedTemplateName) {
      setFormData((prev) => ({
        ...prev,
        templateStyle: savedTemplateName
      }));
      localStorage.removeItem("selectedPosterTemplate");
    }
  }, []);

  // Cleanup object URLs on unmount
  const posterPreviewRef = useRef(posterImagePreview);
  const logoPreviewRef = useRef(logoPreview);

  useEffect(() => {
    posterPreviewRef.current = posterImagePreview;
  }, [posterImagePreview]);

  useEffect(() => {
    logoPreviewRef.current = logoPreview;
  }, [logoPreview]);

  useEffect(() => {
    return () => {
      if (posterPreviewRef.current && posterPreviewRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(posterPreviewRef.current);
      }
      if (logoPreviewRef.current && logoPreviewRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewRef.current);
      }
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (generatedPoster) setGeneratedPoster(null);
  };

  const handlePosterImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Poster image size must be less than 5MB.");
      return;
    }

    if (posterImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(posterImagePreview);
    }

    setPosterImageFile(file);
    setPosterImagePreview(URL.createObjectURL(file));
    if (generatedPoster) setGeneratedPoster(null);
  };

  const handleRemovePosterImage = () => {
    if (posterImagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(posterImagePreview);
    }
    setPosterImageFile(null);
    setPosterImagePreview("");
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Logo image size must be less than 5MB.");
      return;
    }

    if (logoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    if (generatedPoster) setGeneratedPoster(null);
  };

  const handleRemoveLogo = () => {
    if (logoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoFile(null);
    setLogoPreview("");
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to clear the form?")) {
      handleRemovePosterImage();
      handleRemoveLogo();
      setFormData(initialFormData);
      setGeneratedPoster(null);
    }
  };

  const buildFormData = (status = "Generated") => {
    const data = new FormData();
    data.append("posterTitle", formData.posterTitle);
    data.append("tagline", formData.tagline);
    data.append("category", formData.category);
    data.append("eventDate", formData.eventDate);
    data.append("eventTime", formData.eventTime);
    data.append("venue", formData.venue);
    data.append("speakerName", formData.speakerName);
    data.append("speakerDesignation", formData.speakerDesignation);
    data.append("organizerName", formData.organizerName);
    data.append("description", formData.description);
    data.append("contactInformation", formData.contactInformation);
    data.append("registrationText", formData.registrationText);
    data.append("templateStyle", formData.templateStyle);
    data.append("status", status);

    const matchedPoster = posterData.find((p) => p.name === formData.templateStyle) || posterData[0];
    data.append("designKey", matchedPoster.designKey);

    if (posterImageFile) {
      data.append("posterImage", posterImageFile);
    }
    if (logoFile) {
      data.append("organizationLogo", logoFile);
    }

    return data;
  };

  const handleSaveDraft = async () => {
    try {
      setIsSavingDraft(true);
      const data = buildFormData("Draft");
      const result = await saveDraftPoster(data);
      alert(result.message || "Draft poster saved successfully.");
    } catch (error) {
      alert(error.message || "Failed to save draft poster. Please try again.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleGeneratePoster = async () => {
    if (!formData.posterTitle || !formData.category || !formData.eventDate || !formData.templateStyle) {
      alert("Please fill in the required fields: Poster Title, Category, Event Date, and Template Style.");
      return;
    }

    try {
      setIsGenerating(true);
      const data = buildFormData("Generated");
      const result = await createPoster(data);
      const posterRecord = result.data || result;
      setGeneratedPoster(posterRecord);
      alert("Poster generated successfully.");
    } catch (error) {
      alert(error.message || "Failed to generate poster. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getPosterFileName = (ext) => {
    const title = formData.posterTitle || "Poster";
    const posterId = generatedPoster?.posterId || "POSTER-2026-0001";
    return `Poster_${title}_${posterId}.${ext}`;
  };

  const handleDownloadPngAction = () => {
    downloadPosterPng(posterSvgRef.current, getPosterFileName("png"));
  };

  const handleDownloadPdfAction = () => {
    downloadPosterPdf(posterSvgRef.current, getPosterFileName("pdf"));
  };

  const selectedConfig = posterData.find((p) => p.name === formData.templateStyle) || posterData[0];

  return (
    <section className="space-y-8 pb-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Link to="/certificate-dashboard" className="hover:text-blue-600 transition">
          Certificate Studio
        </Link>
        <span>/</span>
        <span className="text-slate-800">Event Poster Builder</span>
      </nav>

      {/* Page Hero */}
      <div className="app-glass-hero p-7 lg:p-9 animate-hero-fade-in">
        <span className="text-xs font-black uppercase tracking-widest text-blue-600">
          DESIGN & DOCUMENT CREATOR
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black text-slate-950 tracking-tight font-sans">
          Event Poster Builder
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-600 font-medium leading-relaxed">
          Create engaging event posters using customizable templates, images, live preview, and export tools.
        </p>
      </div>

      {/* Full-Width Form Section */}
      <form
        className="app-glass-surface-strong p-6 sm:p-8 space-y-8"
        onSubmit={(e) => e.preventDefault()}
      >
        {/* Section A: Event Information */}
        <div>
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-sm font-black">
              1
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-950 font-sans">Event Information</h3>
              <p className="text-xs text-slate-500 font-semibold font-sans">Main title, tagline, date, time, and venue</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 md:col-span-2">
              Poster Title *
              <input
                className={inputClass}
                type="text"
                name="posterTitle"
                value={formData.posterTitle}
                onChange={handleChange}
                placeholder="e.g. ANNUAL INNOVATION & TECH SUMMIT 2026"
              />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Category *
              <select
                className={inputClass}
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="Seminar">Seminar</option>
                <option value="Conference">Conference</option>
                <option value="FDP">FDP</option>
                <option value="Expert Talk">Expert Talk</option>
                <option value="Workshop">Workshop</option>
                <option value="Webinar">Webinar</option>
                <option value="Hackathon">Hackathon</option>
                <option value="Cultural">Cultural</option>
                <option value="Sports">Sports</option>
                <option value="Technical">Technical</option>
                <option value="Training">Training</option>
              </select>
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 md:col-span-3">
              Tagline / Subtitle
              <input
                className={inputClass}
                type="text"
                name="tagline"
                value={formData.tagline}
                onChange={handleChange}
                placeholder="e.g. Empowering Next-Gen Innovators & Leaders"
              />
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

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Event Time
              <input
                className={inputClass}
                type="text"
                name="eventTime"
                value={formData.eventTime}
                onChange={handleChange}
                placeholder="e.g. 10:00 AM - 04:00 PM"
              />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Venue
              <input
                className={inputClass}
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleChange}
                placeholder="e.g. Main Auditorium, PP Savani University"
              />
            </label>
          </div>
        </div>

        {/* Section B: Speaker / Organizer */}
        <div>
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 text-sm font-black">
              2
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-950 font-sans">Speaker & Host Details</h3>
              <p className="text-xs text-slate-500 font-semibold font-sans">Guest credentials and organizing department</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Speaker / Guest Name
              <input
                className={inputClass}
                type="text"
                name="speakerName"
                value={formData.speakerName}
                onChange={handleChange}
                placeholder="e.g. Dr. Pritkumar Koradiya"
              />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Speaker Designation
              <input
                className={inputClass}
                type="text"
                name="speakerDesignation"
                value={formData.speakerDesignation}
                onChange={handleChange}
                placeholder="e.g. AI & Cloud Architecture Specialist"
              />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Organizer Name
              <input
                className={inputClass}
                type="text"
                name="organizerName"
                value={formData.organizerName}
                onChange={handleChange}
                placeholder="e.g. School of Engineering & Tech Club"
              />
            </label>
          </div>
        </div>

        {/* Section C: Poster Narrative Content */}
        <div>
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-600 text-sm font-black">
              3
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-950 font-sans">Poster Content & Contact</h3>
              <p className="text-xs text-slate-500 font-semibold font-sans">Event description, contact line, and registration callout</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 md:col-span-2">
              Event Description
              <textarea
                className={textareaClass}
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter a brief highlight summary of the event sessions..."
              />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Contact Information
              <input
                className={inputClass}
                type="text"
                name="contactInformation"
                value={formData.contactInformation}
                onChange={handleChange}
                placeholder="e.g. +91 98765 43210 | info@ppsu.ac.in"
              />
            </label>

            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Registration / Call-to-Action Text
              <input
                className={inputClass}
                type="text"
                name="registrationText"
                value={formData.registrationText}
                onChange={handleChange}
                placeholder="e.g. Free Entry • Scan QR to Register Online"
              />
            </label>
          </div>
        </div>

        {/* Section D: Design & Media */}
        <div>
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-sm font-black">
              4
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-950 font-sans">Design & Media Uploads</h3>
              <p className="text-xs text-slate-500 font-semibold font-sans">Template theme selection, event image, and logo</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 md:col-span-3">
              Poster Template Style *
              <select
                className={inputClass}
                name="templateStyle"
                value={formData.templateStyle}
                onChange={handleChange}
              >
                {posterData.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} ({p.category})
                  </option>
                ))}
              </select>
            </label>

            {/* Poster Image Upload */}
            <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/20 p-4 relative">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Event Banner Image (Max 5MB)
              </label>
              {posterImagePreview ? (
                <div className="relative rounded-xl overflow-hidden aspect-[16/10] bg-slate-100 border">
                  <img src={posterImagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={handleRemovePosterImage}
                    className="absolute top-1 right-1 rounded-full bg-rose-600 p-1 text-white text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition inline-block">
                  Browse Event Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePosterImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Organization Logo Upload */}
            <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/20 p-4 relative">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Organization Logo (Max 5MB)
              </label>
              {logoPreview ? (
                <div className="relative rounded-xl overflow-hidden aspect-[16/10] bg-slate-100 border p-2 flex items-center justify-center">
                  <img src={logoPreview} alt="Logo Preview" className="h-full max-w-full object-contain" />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute top-1 right-1 rounded-full bg-rose-600 p-1 text-white text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white transition inline-block">
                  Browse Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Section E: Actions */}
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
            disabled={isSavingDraft || isGenerating}
            className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100 transition disabled:opacity-60 active:scale-98"
          >
            {isSavingDraft ? "Saving Draft..." : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={handleGeneratePoster}
            disabled={isSavingDraft || isGenerating}
            className="rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-3 text-sm font-black text-white shadow-md hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-60 active:scale-98"
          >
            {isGenerating ? "Generating Poster..." : "Generate Poster"}
          </button>
          <button
            type="button"
            onClick={handleDownloadPngAction}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-black text-white shadow-md hover:from-emerald-700 hover:to-teal-700 transition active:scale-98"
          >
            Download PNG
          </button>
          <button
            type="button"
            onClick={handleDownloadPdfAction}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-black text-white shadow-md hover:from-purple-700 hover:to-pink-700 transition active:scale-98"
          >
            Download PDF
          </button>
        </div>
      </form>

      {/* Live Poster Preview Section Below Form */}
      <section className="app-glass-surface p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-blue-600">LIVE POSTER CANVAS</span>
            <h3 className="text-2xl font-black text-slate-950 font-sans">Live Poster Preview</h3>
            <p className="text-xs font-semibold text-slate-500">
              Selected Poster: <span className="text-blue-600 font-bold">{formData.templateStyle}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPngAction}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700 transition shadow-xs"
            >
              Download PNG
            </button>
            <button
              type="button"
              onClick={handleDownloadPdfAction}
              className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-black text-white hover:bg-purple-700 transition shadow-xs"
            >
              Download A4 PDF
            </button>
          </div>
        </div>

        <div className="w-full flex justify-center py-4">
          <PosterPreview
            ref={posterSvgRef}
            id="poster-preview-svg"
            posterTitle={formData.posterTitle}
            tagline={formData.tagline}
            category={formData.category}
            eventDate={formData.eventDate}
            eventTime={formData.eventTime}
            venue={formData.venue}
            speakerName={formData.speakerName}
            speakerDesignation={formData.speakerDesignation}
            organizerName={formData.organizerName}
            description={formData.description}
            contactInformation={formData.contactInformation}
            registrationText={formData.registrationText}
            templateStyle={formData.templateStyle}
            designKey={selectedConfig.designKey}
            posterImage={posterImagePreview}
            organizationLogo={logoPreview}
            posterId={generatedPoster?.posterId || "POSTER-2026-0001"}
          />
        </div>
      </section>

      {/* Development QA Test Panel */}
      <PosterSvgTestPanel />
    </section>
  );
}

export default CreatePoster;
