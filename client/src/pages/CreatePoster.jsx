import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import PosterPreview from "../components/PosterPreview.jsx";
import PosterSvgTestPanel from "../components/poster/PosterSvgTestPanel.jsx";
import posterData from "../data/posterData.js";
import { createPoster, saveDraftPoster } from "../services/posterApi.js";
import { downloadPosterPng, downloadPosterPdf } from "../utils/downloadPoster.js";
import { validateSpeakerImage } from "../utils/processSpeakerImage.js";
import { layoutPpsuTitle } from "../utils/ppsuPosterLayout.js";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100";

const textareaClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 min-h-24 resize-y";

const initialStandardData = {
  posterFormat: "standard",
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
  templateStyle: "Seminar Poster",
  designKey: "seminar-poster",
  // PPSU specific fields (initialized cleanly)
  eventType: "IIT Lecture Series",
  mainTitle: "Prompt Engineering: Unlocking the Power of Generative AI – Expert Talk by Distinguished Faculty from IIT Indore",
  speaker: "Prof. (Dr.) Chandresh Kumar Maurya\nAssociate Professor, Department of\nComputer Science & Engineering,\nIIT Indore"
};

function CreatePoster() {
  const location = useLocation();
  const [formData, setFormData] = useState(initialStandardData);

  // Uploaded media states
  const [posterImageFile, setPosterImageFile] = useState(null);
  const [posterImagePreview, setPosterImagePreview] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [speakerPhotoFile, setSpeakerPhotoFile] = useState(null);
  const [speakerPhotoPreview, setSpeakerPhotoPreview] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [generatedPoster, setGeneratedPoster] = useState(null);

  const posterSvgRef = useRef(null);

  // Determine active poster format
  const isPpsuFormat =
    formData.posterFormat === "ppsu-expert-talk" ||
    formData.designKey === "ppsu-expert-talk" ||
    formData.templateStyle === "PPSU Expert Talk Poster";

  const ppsuTitleLayout = isPpsuFormat && formData.mainTitle ? layoutPpsuTitle(formData.mainTitle) : null;
  const isPpsuTitleTooLong = Boolean(ppsuTitleLayout && !ppsuTitleLayout.isValid);

  // Auto-select template from localStorage or router state if set from Gallery / Records
  useEffect(() => {
    const editPoster = location.state?.editPoster;
    if (editPoster) {
      setFormData((prev) => ({
        ...prev,
        ...editPoster,
        posterFormat: editPoster.posterFormat || (editPoster.designKey === "ppsu-expert-talk" ? "ppsu-expert-talk" : "standard"),
        eventType: editPoster.eventType || editPoster.category || prev.eventType,
        mainTitle: editPoster.mainTitle || editPoster.posterTitle || prev.mainTitle,
        speaker: editPoster.speaker || (editPoster.speakerName ? `${editPoster.speakerName}\n${editPoster.speakerDesignation || ""}` : prev.speaker)
      }));
      if (editPoster.posterImage) setPosterImagePreview(editPoster.posterImage);
      if (editPoster.organizationLogo) setLogoPreview(editPoster.organizationLogo);
      if (editPoster.speakerPhoto) setSpeakerPhotoPreview(editPoster.speakerPhoto);
      return;
    }

    const savedTemplateName = localStorage.getItem("selectedPosterTemplate");
    const savedPosterObjStr = localStorage.getItem("selectedPosterObject");

    if (savedPosterObjStr) {
      try {
        const obj = JSON.parse(savedPosterObjStr);
        const format = obj.posterFormat || (obj.id === "ppsu-expert-talk" || obj.designKey === "ppsu-expert-talk" ? "ppsu-expert-talk" : "standard");
        setFormData((prev) => ({
          ...prev,
          templateStyle: obj.name || prev.templateStyle,
          designKey: obj.designKey || prev.designKey,
          category: obj.category || prev.category,
          posterFormat: format
        }));
      } catch (e) {
        console.error("Failed to parse selectedPosterObject", e);
      }
      localStorage.removeItem("selectedPosterObject");
    } else if (savedTemplateName) {
      const matched = posterData.find((p) => p.name === savedTemplateName);
      const format = matched?.posterFormat || (matched?.id === "ppsu-expert-talk" ? "ppsu-expert-talk" : "standard");
      setFormData((prev) => ({
        ...prev,
        templateStyle: savedTemplateName,
        designKey: matched?.designKey || prev.designKey,
        posterFormat: format
      }));
      localStorage.removeItem("selectedPosterTemplate");
    }
  }, [location.state]);

  // Cleanup object URLs on unmount
  const posterPreviewRef = useRef(posterImagePreview);
  const logoPreviewRef = useRef(logoPreview);
  const speakerPreviewRef = useRef(speakerPhotoPreview);

  useEffect(() => {
    posterPreviewRef.current = posterImagePreview;
  }, [posterImagePreview]);

  useEffect(() => {
    logoPreviewRef.current = logoPreview;
  }, [logoPreview]);

  useEffect(() => {
    speakerPreviewRef.current = speakerPhotoPreview;
  }, [speakerPhotoPreview]);

  useEffect(() => {
    return () => {
      if (posterPreviewRef.current && posterPreviewRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(posterPreviewRef.current);
      }
      if (logoPreviewRef.current && logoPreviewRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewRef.current);
      }
      if (speakerPreviewRef.current && speakerPreviewRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(speakerPreviewRef.current);
      }
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      if (name === "templateStyle") {
        const matched = posterData.find((p) => p.name === value);
        if (matched) {
          updated.designKey = matched.designKey;
          updated.posterFormat = matched.posterFormat || (matched.id === "ppsu-expert-talk" ? "ppsu-expert-talk" : "standard");
        }
      }

      return updated;
    });
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

  const handleSpeakerPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateSpeakerImage(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    if (speakerPhotoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(speakerPhotoPreview);
    }

    setSpeakerPhotoFile(file);
    setSpeakerPhotoPreview(URL.createObjectURL(file));
    if (generatedPoster) setGeneratedPoster(null);
  };

  const handleRemoveSpeakerPhoto = () => {
    if (speakerPhotoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(speakerPhotoPreview);
    }
    setSpeakerPhotoFile(null);
    setSpeakerPhotoPreview("");
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to clear the form?")) {
      handleRemovePosterImage();
      handleRemoveLogo();
      handleRemoveSpeakerPhoto();
      setFormData(initialStandardData);
      setGeneratedPoster(null);
    }
  };

  const buildFormData = (status = "Generated") => {
    const data = new FormData();

    if (isPpsuFormat) {
      data.append("posterFormat", "ppsu-expert-talk");
      data.append("eventType", formData.eventType || "Expert Talk");
      data.append("mainTitle", formData.mainTitle || formData.posterTitle || "");
      data.append("eventDate", formData.eventDate || "");
      data.append("eventTime", formData.eventTime || "");
      data.append("venue", formData.venue || "");
      data.append("speaker", formData.speaker || "");
      data.append("templateStyle", formData.templateStyle || "PPSU Expert Talk Poster");
      data.append("designKey", "ppsu-expert-talk");
      data.append("status", status);

      // Legacy fields for backward compatibility
      data.append("posterTitle", formData.mainTitle || formData.posterTitle || "PPSU Expert Talk");
      data.append("category", formData.eventType || "Expert Talk");
      const speakerFirstLine = (formData.speaker || "").split("\n")[0] || "";
      data.append("speakerName", speakerFirstLine);

      if (speakerPhotoFile) {
        data.append("speakerPhoto", speakerPhotoFile);
      }
    } else {
      data.append("posterFormat", "standard");
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
    if (isPpsuFormat) {
      if (
        !formData.eventType ||
        !formData.mainTitle ||
        !formData.eventDate ||
        !formData.eventTime ||
        !formData.venue ||
        !formData.speaker
      ) {
        alert(
          "Please fill in all required fields for PPSU Expert Talk Poster: Event Type, Main Title, Date, Time, Venue, and Speaker."
        );
        return;
      }
      if (isPpsuTitleTooLong) {
        alert("Title is too long for this poster layout. Please shorten the title.");
        return;
      }
    } else {
      if (!formData.posterTitle || !formData.category || !formData.eventDate || !formData.templateStyle) {
        alert("Please fill in the required fields: Poster Title, Category, Event Date, and Template Style.");
        return;
      }
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
    const title = isPpsuFormat ? formData.mainTitle || "PPSU_Expert_Talk" : formData.posterTitle || "Poster";
    const posterId = generatedPoster?.posterId || "POSTER-2026-0001";
    return `Poster_${title}_${posterId}.${ext}`;
  };

  const handleDownloadPngAction = () => {
    downloadPosterPng(posterSvgRef.current, getPosterFileName("png"));
  };

  const handleDownloadPdfAction = () => {
    downloadPosterPdf(posterSvgRef.current, getPosterFileName("pdf"));
  };

  const selectedConfig =
    posterData.find((p) => p.name === formData.templateStyle || p.designKey === formData.designKey) ||
    posterData[0];

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-blue-600">
              {isPpsuFormat ? "PPSU BRANDED TEMPLATE" : "DESIGN & DOCUMENT CREATOR"}
            </span>
            <h1 className="mt-2 text-3xl sm:text-4xl font-black text-slate-950 tracking-tight font-sans">
              {isPpsuFormat ? "PPSU Expert Talk Poster" : "Event Poster Builder"}
            </h1>
            <p className="mt-2 max-w-3xl text-base text-slate-600 font-medium leading-relaxed">
              {isPpsuFormat
                ? "Create a professional event poster using the PPSU Expert Talk theme with fixed university branding, responsive headline typography, and speaker spotlight."
                : "Create engaging event posters using customizable templates, images, live preview, and export tools."}
            </p>
          </div>

          {/* Format Switcher Pill */}
          <div className="flex items-center gap-1 rounded-2xl bg-white/80 p-1.5 shadow-xs border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  posterFormat: "standard",
                  templateStyle: prev.templateStyle === "PPSU Expert Talk Poster" ? "Seminar Poster" : prev.templateStyle,
                  designKey: prev.designKey === "ppsu-expert-talk" ? "seminar-poster" : prev.designKey
                }));
              }}
              className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                !isPpsuFormat
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              Standard Posters
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  posterFormat: "ppsu-expert-talk",
                  templateStyle: "PPSU Expert Talk Poster",
                  designKey: "ppsu-expert-talk"
                }));
              }}
              className={`rounded-xl px-4 py-2 text-xs font-black transition ${
                isPpsuFormat
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              PPSU Expert Talk
            </button>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <form
        className="app-glass-surface-strong p-6 sm:p-8 space-y-8"
        onSubmit={(e) => e.preventDefault()}
      >
        {/* Template Selection Selector */}
        <div className="pb-6 border-b border-slate-100">
          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
            Select Poster Design / Format
            <select
              className={inputClass}
              name="templateStyle"
              value={formData.templateStyle}
              onChange={handleChange}
            >
              <optgroup label="PPSU Custom Branded Formats">
                <option value="PPSU Expert Talk Poster">
                  PPSU Expert Talk Poster (Official Theme)
                </option>
              </optgroup>
              <optgroup label="Standard Poster Formats">
                {posterData
                  .filter((p) => p.id !== "ppsu-expert-talk")
                  .map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} ({p.category})
                    </option>
                  ))}
              </optgroup>
            </select>
          </label>
        </div>

        {/* CONDITIONAL FORM: PPSU EXPERT TALK FORMAT */}
        {isPpsuFormat ? (
          <>
            {/* Section 1: Event Information */}
            <div>
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 text-sm font-black">
                  1
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-950 font-sans">EVENT INFORMATION</h3>
                  <p className="text-xs text-slate-500 font-semibold font-sans">
                    Dynamic event type badge, main headline, date, time, and auditorium venue
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 md:col-span-3">
                  Event Type *
                  <input
                    className={inputClass}
                    type="text"
                    name="eventType"
                    value={formData.eventType}
                    onChange={handleChange}
                    placeholder="e.g. IIT Lecture Series, Expert Talk, Guest Lecture"
                  />
                </label>

                <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 md:col-span-3">
                  Main Title *
                  <textarea
                    className={`${textareaClass} ${isPpsuTitleTooLong ? "border-rose-400 bg-rose-50/30" : ""}`}
                    name="mainTitle"
                    value={formData.mainTitle}
                    onChange={handleChange}
                    placeholder="e.g. Prompt Engineering: Unlocking the Power of Generative AI – Expert Talk by Distinguished Faculty from IIT Indore"
                  />
                  {isPpsuTitleTooLong && (
                    <span className="text-xs font-bold text-rose-600">
                      Title is too long for this poster layout. Please shorten the title.
                    </span>
                  )}
                </label>

                <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Date *
                  <input
                    className={inputClass}
                    type="text"
                    name="eventDate"
                    value={formData.eventDate}
                    onChange={handleChange}
                    placeholder="e.g. 02 April 2026, Thursday"
                  />
                </label>

                <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Time *
                  <input
                    className={inputClass}
                    type="text"
                    name="eventTime"
                    value={formData.eventTime}
                    onChange={handleChange}
                    placeholder="e.g. 10:00 AM"
                  />
                </label>

                <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Venue *
                  <input
                    className={inputClass}
                    type="text"
                    name="venue"
                    value={formData.venue}
                    onChange={handleChange}
                    placeholder="e.g. Auditorium | 313"
                  />
                </label>
              </div>
            </div>

            {/* Section 2: Speaker Information */}
            <div>
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 text-sm font-black">
                  2
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-950 font-sans">SPEAKER INFORMATION</h3>
                  <p className="text-xs text-slate-500 font-semibold font-sans">
                    Speaker details (name, designation, department, institute) and speaker photo
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Speaker *
                  <textarea
                    className={`${textareaClass} min-h-36`}
                    name="speaker"
                    value={formData.speaker}
                    onChange={handleChange}
                    placeholder={"Prof. (Dr.) Chandresh Kumar Maurya\nAssociate Professor, Department of\nComputer Science & Engineering,\nIIT Indore"}
                  />
                  <span className="text-[11px] font-normal text-slate-500">
                    Enter speaker name and credentials. Supports multiline format matching reference layout.
                  </span>
                </label>

                {/* Speaker Photo Upload */}
                <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/20 p-4 relative flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Speaker Photo (PNG, JPG, JPEG, WEBP • Max 5MB)
                    </label>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Supports transparent PNG or normal photo with background.
                    </p>
                  </div>

                  {speakerPhotoPreview ? (
                    <div className="space-y-3">
                      <div className="relative rounded-2xl overflow-hidden aspect-[4/5] max-w-[200px] mx-auto bg-slate-900 border-2 border-slate-200 shadow-md">
                        <img
                          src={speakerPhotoPreview}
                          alt="Speaker Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <label className="cursor-pointer rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white transition">
                          Replace Image
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={handleSpeakerPhotoChange}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleRemoveSpeakerPhoto}
                          className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 text-xs font-bold text-rose-700 transition"
                        >
                          Remove Image
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <label className="cursor-pointer rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-3 text-xs font-bold text-white transition inline-flex items-center gap-2 shadow-xs">
                        <span>📸</span>
                        <span>Upload Speaker Photo</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={handleSpeakerPhotoChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* CONDITIONAL FORM: EXISTING STANDARD POSTER FORMAT */
          <>
            {/* Section A: Event Information */}
            <div>
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-sm font-black">
                  1
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-950 font-sans">Event Information</h3>
                  <p className="text-xs text-slate-500 font-semibold font-sans">
                    Main title, tagline, date, time, and venue
                  </p>
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
                  <p className="text-xs text-slate-500 font-semibold font-sans">
                    Guest credentials and organizing department
                  </p>
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
                  <p className="text-xs text-slate-500 font-semibold font-sans">
                    Event description, contact line, and registration callout
                  </p>
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
                  <p className="text-xs text-slate-500 font-semibold font-sans">
                    Template theme selection, event image, and logo
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {/* Poster Image Upload */}
                <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/20 p-4 relative">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Event Banner Image (Max 5MB)
                  </label>
                  {posterImagePreview ? (
                    <div className="relative rounded-xl overflow-hidden aspect-[16/10] bg-slate-100 border">
                      <img
                        src={posterImagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
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
                      <img
                        src={logoPreview}
                        alt="Logo Preview"
                        className="h-full max-w-full object-contain"
                      />
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
          </>
        )}

        {/* Section Actions */}
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
              Download PDF
            </button>
          </div>
        </div>

        <div className="w-full flex justify-center py-4">
          <div className={isPpsuFormat ? "max-w-[700px] w-full" : "max-w-[650px] w-full"}>
            <PosterPreview
              ref={posterSvgRef}
              id="poster-preview-svg"
              posterFormat={isPpsuFormat ? "ppsu-expert-talk" : "standard"}
              eventType={formData.eventType}
              mainTitle={formData.mainTitle}
              speaker={formData.speaker}
              speakerPhoto={speakerPhotoPreview}
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
        </div>
      </section>

      {/* DEV-ONLY SVG CANVAS DIAGNOSTICS & HARD TEST PANEL */}
      {import.meta.env.DEV && <PosterSvgTestPanel />}
    </section>
  );
}

export default CreatePoster;
