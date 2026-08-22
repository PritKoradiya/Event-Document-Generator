import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ModuleHeader from "../components/ui/ModuleHeader.jsx";
import FeatureCard from "../components/ui/FeatureCard.jsx";
import { getDashboardStats } from "../services/dashboardApi.js";

function CertificateDashboard() {
  const [statsData, setStatsData] = useState({
    total: 0,
    generated: 0,
    draft: 0,
    single: 0,
    bulk: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await getDashboardStats();
        if (result.success && result.data && result.data.certificates) {
          setStatsData(result.data.certificates);
        }
      } catch (error) {
        console.error("Failed to load certificate stats:", error);
      }
    };
    fetchStats();
  }, []);

  const featureCards = [
    {
      title: "Certificate Builder",
      description: "Design custom certificates with participant details, event dates, signatures, and live visual canvas.",
      btnText: "Open Builder",
      to: "/create-certificate",
      icon: "📝",
      badge: "Popular"
    },
    {
      title: "Event Poster Builder",
      description: "Create event posters using customizable designs, images, logos, live preview, and PNG/PDF export tools.",
      btnText: "Create Poster",
      to: "/create-poster",
      icon: "🖼️",
      badge: "New Feature"
    },
    {
      title: "Template Gallery",
      description: "Browse 24+ certificate designs and 12 dynamic event posters with instant custom styling.",
      btnText: "Explore Gallery",
      to: "/templates",
      icon: "🎨",
      badge: "36+ Designs"
    },
    {
      title: "Event Categories",
      description: "Filter designs tailored for seminars, conferences, hackathons, FDPs, competitions, and workshops.",
      btnText: "View Categories",
      to: "/categories",
      icon: "🗂️",
      badge: "14 Categories"
    },
    {
      title: "Bulk Generation",
      description: "Generate dozens or hundreds of certificates at once using CSV spreadsheet upload or manual roster.",
      btnText: "Bulk Studio",
      to: "/bulk-generate",
      icon: "⚡",
      badge: "CSV Upload"
    },
    {
      title: "Certificate Records",
      description: "Search, filter, view, edit details, update status, or delete saved certificate records anytime.",
      btnText: "Manage Records",
      to: "/generated-certificates",
      icon: "🏆",
      badge: `${statsData.total || "All"} Records`
    },
    {
      title: "Poster Records",
      description: "Explore saved event poster records, view live document renders, and download PNG or A4 PDF files.",
      btnText: "Poster Records",
      to: "/poster-records",
      icon: "📁",
      badge: "Poster Archive"
    },
    {
      title: "Export Tools",
      description: "Download single certificates & posters as PNG/PDF or export batch runs in compressed ZIP files.",
      btnText: "Export Tools",
      to: "/generated-certificates",
      icon: "📦",
      badge: "PNG, PDF & ZIP"
    }
  ];

  const quickInfoItems = [
    { label: "Certificate Templates", icon: "🎨" },
    { label: "Poster Designs", icon: "🖼️" },
    { label: "PDF Export", icon: "📥" },
    { label: "PNG Export", icon: "🖼️" },
    { label: "ZIP Export", icon: "📦" },
    { label: "Record Management", icon: "📁" }
  ];

  return (
    <section className="space-y-8 pb-12">
      {/* Top Module Header */}
      <ModuleHeader
        title="Certificate & Design Studio"
        subtitle="Professional certificate and poster creation workspace"
        theme="certificate"
        badge="Design Module"
        primaryAction={{
          label: "Create Certificate",
          to: "/create-certificate"
        }}
      />

      {/* ULTRA-PREMIUM HERO SECTION WITH CODE-BUILT ILLUSTRATION */}
      <div className="relative overflow-hidden rounded-[2rem] border border-blue-200/80 bg-gradient-to-br from-blue-900/10 via-slate-900/90 to-indigo-950/80 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl animate-module-hero-fade">
        {/* Layered Background Spotlight & Floating Orbs */}
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-gradient-to-br from-blue-500/25 via-cyan-400/20 to-transparent blur-3xl animate-float-orb" />
        <div className="absolute right-10 bottom-0 h-80 w-80 rounded-full bg-gradient-to-br from-indigo-500/25 via-purple-500/20 to-transparent blur-3xl animate-float-orb [animation-delay:6s]" />
        <div className="absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl animate-glow-pulse" />

        {/* Faint Line-Grid Texture Overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)`,
            backgroundSize: "32px 32px"
          }}
        />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Left Content Column */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-black uppercase tracking-widest text-cyan-300 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              OFFICIAL DESIGN & CERTIFICATE WORKSPACE
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15] font-sans">
              Build certificates & posters that look{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-blue-200 to-indigo-200">
                official, polished,
              </span>{" "}
              and ready to share.
            </h1>

            <p className="text-base sm:text-lg leading-relaxed text-slate-300 font-medium max-w-2xl">
              Select a certificate or poster design, enter event details, preview live, and export as PNG, A4 PDF, or ZIP archives.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link
                to="/create-certificate"
                className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/50 active:scale-98"
              >
                <span>Create Certificate</span>
                <span className="text-base font-bold">→</span>
              </Link>
              <Link
                to="/create-poster"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-400/40 bg-blue-500/10 px-6 py-3.5 text-sm font-black text-cyan-200 shadow-md backdrop-blur-md transition-all duration-300 hover:border-cyan-300 hover:bg-blue-600 hover:text-white active:scale-98"
              >
                <span>Create Event Poster</span>
              </Link>
            </div>

            {/* Quick Info Capability Bar */}
            <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {quickInfoItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-950/40 px-3 py-2 text-xs font-extrabold text-blue-200 backdrop-blur-sm">
                  <span>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Original Code-Built Certificate Illustration Graphics */}
          <div className="relative flex justify-center items-center lg:justify-end">
            <div className="relative w-full max-w-[420px] aspect-[1.35/1] rounded-2xl border border-blue-400/30 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/60 p-4 shadow-2xl overflow-hidden animate-subtle-parallax">
              {/* Corner Ornaments */}
              <div className="absolute top-2 left-2 h-9 w-9 border-t-2 border-l-2 border-amber-400/80 rounded-tl-lg" />
              <div className="absolute top-2 right-2 h-9 w-9 border-t-2 border-r-2 border-amber-400/80 rounded-tr-lg" />
              <div className="absolute bottom-2 left-2 h-9 w-9 border-b-2 border-l-2 border-amber-400/80 rounded-bl-lg" />
              <div className="absolute bottom-2 right-2 h-9 w-9 border-b-2 border-r-2 border-amber-400/80 rounded-br-lg" />

              {/* Stacked Certificate Card Layer 1 */}
              <div className="absolute inset-x-6 top-3 h-full rounded-xl bg-blue-500/10 border border-blue-400/20 transform rotate-2" />
              {/* Stacked Certificate Card Layer 2 */}
              <div className="absolute inset-x-4 top-2 h-full rounded-xl bg-indigo-500/10 border border-indigo-400/20 transform -rotate-1" />

              {/* Main Certificate Mockup Front */}
              <div className="relative h-full w-full rounded-xl border border-blue-400/40 bg-slate-900/95 p-4 flex flex-col justify-between shadow-xl">
                {/* Header Line */}
                <div className="flex items-center justify-between">
                  <div className="h-1.5 w-14 rounded-full bg-blue-400/40" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">CERTIFICATE & POSTER STUDIO</span>
                  <div className="h-1.5 w-14 rounded-full bg-blue-400/40" />
                </div>

                {/* Body Content */}
                <div className="my-auto text-center space-y-2">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">THIS IS PROUDLY PRESENTED TO</p>
                  <div className="mx-auto text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 font-serif">
                    Pritkumar Koradiya
                  </div>
                  <div className="mx-auto h-0.5 w-32 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                  <p className="text-[9px] text-slate-300 font-medium">for successful participation in the International Technology Event</p>
                </div>

                {/* Footer Signatures & Certificate ID */}
                <div className="flex items-end justify-between pt-2 border-t border-slate-800">
                  <div className="space-y-1 text-center">
                    <div className="h-0.5 w-16 bg-slate-600 mx-auto" />
                    <p className="text-[8px] font-bold text-slate-300 uppercase">Authorized Person</p>
                  </div>

                  <div className="text-center font-mono text-[9px] text-slate-400 font-bold">
                    CERT-2026-0001
                  </div>

                  <div className="space-y-1 text-center">
                    <div className="h-0.5 w-16 bg-slate-600 mx-auto" />
                    <p className="text-[8px] font-bold text-slate-300 uppercase">Dr. Niraj Shah</p>
                    <p className="text-[7px] font-bold text-slate-400 uppercase">Dean, SOE</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Mini Chip Badge */}
            <div className="absolute -bottom-4 -left-2 sm:left-4 rounded-xl border border-blue-300/40 bg-slate-900/90 px-3.5 py-2 text-xs font-black text-white shadow-xl backdrop-blur-md flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-xs">🖼️</span>
              <span>36+ Certificates & Posters</span>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE TOOLS GRID */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-blue-600">WORKSPACE TOOLS</span>
            <h2 className="text-2xl font-black text-slate-950 tracking-tight font-sans">
              Certificate & Poster Generator Tools
            </h2>
          </div>
          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            8 Modules Active
          </span>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((card) => (
            <FeatureCard key={card.title} {...card} theme="blue" />
          ))}
        </div>
      </div>
    </section>
  );
}

export default CertificateDashboard;
