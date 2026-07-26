import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import posterData from "../data/posterData.js";
import templateData from "../data/templateData.js";
import templateConfigs from "../components/templates/templateConfigs.js";

const categories = [
  "All",
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

const designConfigMap = {
  "academic-seal": templateConfigs.academicSeal,
  "blue-corporate": templateConfigs.blueCorporate,
  "classic-ornate": templateConfigs.classicOrnate,
  "dark-luxury": templateConfigs.darkLuxury,
  "floral-creative": templateConfigs.floralCreative,
  "gold-corner": templateConfigs.goldCorner,
  "minimal-elegant": templateConfigs.minimalElegant,
  "modern-wave": templateConfigs.modernWave,
  "playful-award": templateConfigs.playfulAward,
  "vintage-border": templateConfigs.vintageBorder
};

function MiniCornerOrnaments({ color, softColor }) {
  return (
    <>
      {["left-2 top-2", "right-2 top-2 rotate-90", "bottom-2 right-2 rotate-180", "bottom-2 left-2 -rotate-90"].map((position) => (
        <svg key={position} className={`absolute h-12 w-12 ${position}`} viewBox="0 0 100 100" aria-hidden="true">
          <path d="M10 90 C16 47 47 16 90 10" fill="none" stroke={color} strokeWidth="5" />
          <path d="M25 84 C31 58 58 31 84 25" fill="none" stroke={color} strokeWidth="2.5" />
          <circle cx="35" cy="72" r="6" fill={softColor} stroke={color} strokeWidth="2" />
        </svg>
      ))}
    </>
  );
}

function MiniWave({ primary, secondary }) {
  return (
    <>
      <svg className="absolute right-0 top-0 h-20 w-36" viewBox="0 0 180 90" preserveAspectRatio="none" aria-hidden="true">
        <path d="M35 0 H180 V72 C136 88 104 73 78 48 C58 28 47 13 35 0Z" fill={primary} opacity="0.88" />
        <path d="M82 0 H180 V38 C143 51 117 42 99 25 C91 17 86 8 82 0Z" fill={secondary} opacity="0.84" />
      </svg>
      <svg className="absolute bottom-0 left-0 h-16 w-36" viewBox="0 0 180 76" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 18 C40 2 74 15 102 39 C124 59 146 68 180 58 V76 H0Z" fill={primary} opacity="0.15" />
      </svg>
    </>
  );
}

function MiniFloral() {
  return (
    <>
      {["left-3 top-3", "right-3 bottom-3 rotate-180"].map((position) => (
        <svg key={position} className={`absolute h-20 w-20 ${position}`} viewBox="0 0 120 110" aria-hidden="true">
          <path d="M16 93 C40 60 64 35 102 14" fill="none" stroke="#0f766e" strokeWidth="4" strokeLinecap="round" />
          <circle cx="44" cy="68" r="12" fill="#f97316" opacity="0.84" />
          <circle cx="70" cy="45" r="12" fill="#14b8a6" opacity="0.84" />
          <circle cx="92" cy="26" r="10" fill="#fb923c" opacity="0.84" />
        </svg>
      ))}
    </>
  );
}

function MiniPlayful() {
  return (
    <>
      <div className="absolute left-6 top-5 h-9 w-9 rotate-12 rounded-lg bg-sky-300/35" />
      <div className="absolute right-7 top-7 h-12 w-12 rounded-full bg-orange-300/35" />
      <div className="absolute bottom-6 left-9 h-0 w-0 border-l-[18px] border-r-[18px] border-t-[32px] border-l-transparent border-r-transparent border-t-yellow-300/50" />
      <div className="absolute bottom-8 right-10 h-9 w-7 -rotate-12 bg-teal-300/35" />
    </>
  );
}

function PremiumCertificateMiniPreview({ template }) {
  const config = designConfigMap[template.designKey] || templateConfigs.blueCorporate;
  const dark = config.dark;

  return (
    <div className="aspect-[1.414/1] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-xs group-hover:shadow-md transition-shadow">
      <div className="relative h-full w-full overflow-hidden rounded-xl border" style={{ background: config.background, borderColor: config.borderColor }}>
        {(config.decoration === "ornate" || config.decoration === "academic") && <MiniCornerOrnaments color={config.accent} softColor={config.soft} />}
        {config.decoration === "wave" && <MiniWave primary={config.accent} secondary={config.secondary} />}
        {config.decoration === "floral" && <MiniFloral />}
        {config.decoration === "playful" && <MiniPlayful />}

        <div
          className="relative z-10 m-[4%] flex h-[92%] flex-col justify-between rounded-lg border p-[5%] text-center"
          style={{ background: config.panelBg, borderColor: config.borderColor }}
        >
          <div className="flex items-center gap-2">
            <div className="h-px flex-1" style={{ background: config.lineColor }} />
            <p className={`text-[8px] font-black uppercase tracking-[0.22em] ${dark ? "text-amber-100" : "text-slate-600"}`}>Certificate</p>
            <div className="h-px flex-1" style={{ background: config.lineColor }} />
          </div>

          <div>
            <p className={`text-sm font-black uppercase leading-tight ${config.headingFont} ${dark ? "text-white" : "text-slate-950"}`}>Certificate</p>
            <div className="mx-auto mt-1.5 h-1 w-16 rounded-full" style={{ background: config.lineColor }} />
            <p className="mt-1.5 truncate text-lg font-black" style={{ color: config.nameColor }}>Recipient Name</p>
          </div>

          <div className="grid grid-cols-3 items-end gap-2">
            <div className="space-y-1">
              <div className="mx-auto h-px w-12" style={{ background: config.lineColor }} />
              <div className={`mx-auto h-1 w-10 rounded-full ${dark ? "bg-white/25" : "bg-slate-200"}`} />
            </div>
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 text-[6px] font-black uppercase" style={{ borderColor: config.sealColor, color: config.sealColor }}>
              Seal
            </div>
            <div className="space-y-1">
              <div className="ml-auto h-1 w-12 rounded-full" style={{ background: dark ? "rgba(255,255,255,0.24)" : "#e2e8f0" }} />
              <div className="ml-auto h-1 w-10 rounded-full" style={{ background: dark ? "rgba(255,255,255,0.18)" : "#e2e8f0" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageBackgroundMiniPreview({ template }) {
  const isLightText = template.textTheme === "light";

  return (
    <div className="relative aspect-[1.414/1] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xs">
      <img
        src={template.backgroundImage}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <div className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white backdrop-blur-md">
        Image Background
      </div>
      <div className={`relative z-10 flex h-full flex-col items-center justify-center px-[12%] text-center ${isLightText ? "text-white" : "text-slate-950"}`}>
        <p className="text-base font-black uppercase leading-tight">Certificate</p>
        <div className={`mt-1.5 h-1 w-16 rounded-full ${isLightText ? "bg-amber-200" : "bg-blue-800"}`} />
        <p className="mt-2 max-w-full truncate font-serif text-xl font-black">Participant Name</p>
      </div>
    </div>
  );
}

function CertificateMiniPreview({ template }) {
  if (template.designType === "image-background") {
    return <ImageBackgroundMiniPreview template={template} />;
  }

  if (template.designKey) {
    return <PremiumCertificateMiniPreview template={template} />;
  }

  return (
    <div className={`flex aspect-[1.414/1] items-center justify-center rounded-2xl border-2 p-3 ${template.previewClass}`}>
      <div className={`flex h-full w-full flex-col justify-between rounded-xl border bg-white/85 p-4 text-center ${template.borderClass}`}>
        <div className={`mx-auto h-1.5 w-24 rounded-full ${template.accentClass}`} />
        <div>
          <p className={`text-base font-black uppercase ${template.headingClass}`}>Certificate</p>
          <div className="mx-auto mt-2 h-2 w-32 rounded-full bg-slate-200" />
          <div className="mx-auto mt-1.5 h-2 w-20 rounded-full bg-slate-200" />
        </div>
        <div className="grid grid-cols-3 items-end gap-3">
          <div className="h-px bg-slate-300" />
          <div className={`mx-auto h-10 w-10 rounded-full border-2 ${template.borderClass}`} />
          <div className="h-px bg-slate-300" />
        </div>
      </div>
    </div>
  );
}

function PosterMiniPreview({ poster }) {
  return (
    <div className={`relative aspect-[4/5] overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br ${poster.backgroundClass || "from-slate-900 via-blue-950 to-slate-950"} p-4 text-white shadow-xs flex flex-col justify-between`}>
      <div className="flex items-center justify-between border-b border-white/15 pb-2">
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-300">ORGANIZATION LOGO</span>
        <span className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase ${poster.badgeClass}`}>
          {poster.category}
        </span>
      </div>

      <div className="my-auto text-center space-y-1.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-cyan-300">EVENT TAGLINE</p>
        <p className="text-sm font-black uppercase leading-tight text-white font-sans truncate">
          {poster.name}
        </p>
        <div className="mx-auto h-0.5 w-12 rounded-full bg-cyan-400" />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/10 p-2 text-center text-[9px] font-bold space-y-1">
        <div className="h-1 w-full bg-white/30 rounded" />
        <div className="h-1 w-3/4 bg-white/30 rounded mx-auto" />
      </div>
    </div>
  );
}

function Templates() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("certificate");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const savedCategory = localStorage.getItem("selectedTemplateCategory");

    if (savedCategory) {
      setSelectedCategory(savedCategory);
      localStorage.removeItem("selectedTemplateCategory");
    }
  }, []);

  const activeItems = activeTab === "certificate" ? templateData : posterData;

  const filteredItems = useMemo(() => {
    return activeItems.filter((item) => {
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [activeItems, searchTerm, selectedCategory]);

  const handleUseTemplate = (templateName) => {
    localStorage.setItem("selectedCertificateTemplate", templateName);
    alert("Certificate template selected successfully.");
    navigate("/create-certificate");
  };

  const handleUsePoster = (poster) => {
    localStorage.setItem("selectedPosterTemplate", poster.name);
    localStorage.setItem("selectedPosterObject", JSON.stringify(poster));
    alert("Poster template selected successfully.");
    navigate("/create-poster");
  };

  const itemLabel = activeTab === "certificate" ? "certificate templates" : "poster designs";

  return (
    <section className="space-y-6 pb-12 overflow-visible">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Link to="/certificate-dashboard" className="hover:text-blue-600 transition">
          Certificate Studio
        </Link>
        <span>/</span>
        <span className="text-slate-800">Template Gallery</span>
      </nav>

      {/* Page Hero */}
      <div className="app-glass-hero p-7 lg:p-9 animate-hero-fade-in">
        <span className="text-xs font-black uppercase tracking-widest text-blue-600">
          TEMPLATE MARKETPLACE
        </span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black text-slate-950 tracking-tight font-sans">
          Template Gallery
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-600 font-medium leading-relaxed">
          Select from our curated collection of professional certificate templates, ornate academic seals, custom background layouts, and 12 dynamic event posters.
        </p>
      </div>

      {/* FIXED/STICKY FILTER NAVBAR (PART 1 FIX: Normal flow on mobile, lg:sticky lg:top-24 z-30) */}
      <div className="app-glass-toolbar relative top-auto lg:sticky lg:top-24 z-30 mb-8 p-4 transition-all">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("certificate")}
              className={`flex-1 lg:flex-none rounded-lg px-5 py-2 text-sm font-black transition ${
                activeTab === "certificate"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              Certificate Templates ({templateData.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("poster")}
              className={`flex-1 lg:flex-none rounded-lg px-5 py-2 text-sm font-black transition ${
                activeTab === "poster"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              Posters ({posterData.length})
            </button>
          </div>

          {/* Search & Filter Dropdown */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:min-w-[500px]">
            <div className="relative flex-1">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search templates by name..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 w-full sm:w-52"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500 px-1 border-t border-slate-100 pt-2">
          <span>Showing {filteredItems.length} {itemLabel}</span>
          {selectedCategory !== "All" && (
            <button
              onClick={() => setSelectedCategory("All")}
              className="text-blue-600 hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Grid Display */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pt-2">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="group app-glass-card p-5 flex flex-col justify-between"
          >
            <div>
              {activeTab === "certificate" ? (
                <CertificateMiniPreview template={item} />
              ) : (
                <PosterMiniPreview poster={item} />
              )}

              <div className="mt-4 flex items-start justify-between gap-2">
                <h3 className="text-lg font-black text-slate-950 font-sans tracking-tight">
                  {item.name}
                </h3>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${item.badgeClass || "bg-blue-50 text-blue-700"}`}>
                  {item.category}
                </span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-slate-600 font-medium line-clamp-2">
                {item.description}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => (activeTab === "certificate" ? handleUseTemplate(item.name) : handleUsePoster(item))}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-black text-white shadow-xs hover:bg-blue-700 transition active:scale-98"
              >
                <span>{activeTab === "certificate" ? "Use Template" : "Use Poster"}</span>
                <span>→</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-12 text-center shadow-xs">
          <p className="text-base font-bold text-slate-600">No templates match your search criteria.</p>
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("All");
            }}
            className="mt-4 rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 hover:bg-blue-100 transition"
          >
            Reset Filters
          </button>
        </div>
      )}
    </section>
  );
}

export default Templates;
