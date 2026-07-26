import { Link } from "react-router-dom";
import { brandingData } from "../data/brandingData.js";

function Dashboard() {
  return (
    <section className="relative z-10 mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 flex flex-col justify-center min-h-[calc(100vh-110px)]">
      {/* Hero Header Text */}
      <div className="mx-auto max-w-5xl text-center mb-8 lg:mb-10 rounded-3xl p-6 sm:p-8 galaxy-hero-surface">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-cyan-300 backdrop-blur-md mb-4 animate-hero-fade-in shadow-lg shadow-blue-500/10">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-ping" />
          SMART EVENT DOCUMENT WORKSPACE
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#ffffff] leading-[1.1] font-sans hero-title-shadow">
          {brandingData.appName}
        </h1>

        <h2 className="mt-3 text-lg sm:text-2xl font-bold text-[#73b7ff] max-w-4xl mx-auto leading-snug">
          {brandingData.subtitle}
        </h2>

        <p className="mt-4 text-sm sm:text-lg font-medium text-[#d5deed] max-w-3xl mx-auto leading-relaxed">
          Create certificates, posters, structured event reports, and multipage attendance sheets from one professional workspace.
        </p>

        <p className="mt-2 text-xs sm:text-sm font-semibold text-[#a8b6cd] tracking-wide">
          Live previews, student master lists, auto-pagination, vector PDF/PNG exports, and complete record management.
        </p>
      </div>

      {/* Four Main Module Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 max-w-7xl mx-auto w-full items-stretch">
        {/* Module Card 1: Event Certificate Generator */}
        <div className="group module-galaxy-card p-6 sm:p-7 transition-all duration-300 hover:-translate-y-2 hover:border-blue-400/50 hover:shadow-blue-500/20 flex flex-col justify-between">
          <div className="absolute -right-16 -top-16 h-60 w-60 rounded-full bg-blue-500/15 blur-3xl group-hover:bg-blue-500/30 transition-all duration-500" />
          <div className="absolute -left-16 -bottom-16 h-60 w-60 rounded-full bg-indigo-500/15 blur-3xl group-hover:bg-indigo-500/30 transition-all duration-500" />

          <div className="relative z-10">
            {/* Visual CSS Illustration: Certificate Layered Card */}
            <div className="relative mb-6 h-36 w-full overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-slate-950/80 via-slate-900/80 to-blue-950/60 p-4 shadow-inner">
              <div className="absolute top-2 left-2 h-7 w-7 border-t-2 border-l-2 border-amber-400/60 rounded-tl-lg" />
              <div className="absolute bottom-2 right-2 h-7 w-7 border-b-2 border-r-2 border-amber-400/60 rounded-br-lg" />

              <div className="absolute inset-x-6 top-3 h-full rounded-xl bg-blue-500/10 border border-blue-400/10 transform rotate-1 group-hover:rotate-2 transition-transform duration-300" />
              <div className="relative h-full w-full rounded-xl border border-blue-400/30 bg-slate-950/90 p-3 flex flex-col justify-between shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="h-1.5 w-14 rounded-full bg-blue-400/50" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-300/80">CERTIFICATE</span>
                  <div className="h-1.5 w-14 rounded-full bg-blue-400/50" />
                </div>
                <div className="my-auto text-center space-y-1.5">
                  <div className="mx-auto h-2 w-24 rounded-full bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 animate-pulse" />
                  <div className="mx-auto h-1.5 w-16 rounded-full bg-slate-600" />
                </div>
                <div className="flex items-end justify-between">
                  <div className="h-1.5 w-10 rounded-full bg-slate-700" />
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 text-[9px] font-black shadow-md transform group-hover:scale-110 transition-transform">
                    ★
                  </div>
                  <div className="h-1.5 w-10 rounded-full bg-slate-700" />
                </div>
              </div>
            </div>

            <h2 className="text-xl font-black text-white tracking-tight font-sans">
              Event Certificate Generator
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[#d1d9e8] font-medium">
              Design single or bulk event certificates using professional templates, live preview, PDF export, ZIP download, and certificate record management.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {["Live Preview", "24+ Templates", "Bulk Generate", "PDF & ZIP"].map((pill) => (
                <span
                  key={pill}
                  className="rounded-lg border border-blue-400/30 bg-blue-500/15 px-2 py-0.5 text-[11px] font-bold text-cyan-300"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-6">
            <Link
              to="/certificate-dashboard"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/40 active:scale-98"
            >
              <span>Launch Certificate Studio</span>
              <span className="text-base transition-transform duration-300 group-hover:translate-x-1.5">→</span>
            </Link>
          </div>
        </div>

        {/* Module Card 2: Poster Generator */}
        <div className="group module-galaxy-card p-6 sm:p-7 transition-all duration-300 hover:-translate-y-2 hover:border-amber-400/50 hover:shadow-amber-500/20 flex flex-col justify-between">
          <div className="absolute -right-16 -top-16 h-60 w-60 rounded-full bg-amber-500/15 blur-3xl group-hover:bg-amber-500/30 transition-all duration-500" />
          <div className="absolute -left-16 -bottom-16 h-60 w-60 rounded-full bg-orange-500/15 blur-3xl group-hover:bg-orange-500/30 transition-all duration-500" />

          <div className="relative z-10">
            {/* Visual CSS Illustration: Event Poster Frame */}
            <div className="relative mb-6 h-36 w-full overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-slate-950/80 via-slate-900/80 to-amber-950/60 p-4 shadow-inner">
              <div className="relative h-full w-full rounded-xl border border-amber-400/30 bg-slate-950/90 p-3 flex flex-col justify-between shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">EVENT POSTER</span>
                  <div className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                </div>
                <div className="my-auto space-y-1">
                  <div className="h-2.5 w-3/4 rounded-full bg-gradient-to-r from-amber-400 to-orange-400" />
                  <div className="h-1.5 w-1/2 rounded-full bg-slate-500" />
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-1">
                  <span className="text-[8px] font-mono text-slate-400">HIGH-RES PNG / PDF</span>
                  <div className="h-1.5 w-8 rounded-full bg-amber-500/60" />
                </div>
              </div>
            </div>

            <h2 className="text-xl font-black text-white tracking-tight font-sans">
              Poster Generator
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[#d1d9e8] font-medium">
              Create high-impact promotional event posters with live customizable themes, speaker details, and export as vector PDF or ultra-HD PNG.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {["Custom Themes", "Speaker Cards", "PNG Export", "Vector PDF"].map((pill) => (
                <span
                  key={pill}
                  className="rounded-lg border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-6">
            <Link
              to="/create-poster"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-amber-500/25 transition-all duration-300 hover:from-amber-500 hover:to-orange-500 hover:shadow-amber-500/40 active:scale-98"
            >
              <span>Launch Poster Studio</span>
              <span className="text-base transition-transform duration-300 group-hover:translate-x-1.5">→</span>
            </Link>
          </div>
        </div>

        {/* Module Card 3: Event Report Generator */}
        <div className="group module-galaxy-card p-6 sm:p-7 transition-all duration-300 hover:-translate-y-2 hover:border-purple-400/50 hover:shadow-purple-500/20 flex flex-col justify-between">
          <div className="absolute -right-16 -top-16 h-60 w-60 rounded-full bg-purple-500/15 blur-3xl group-hover:bg-purple-500/30 transition-all duration-500" />
          <div className="absolute -left-16 -bottom-16 h-60 w-60 rounded-full bg-pink-500/15 blur-3xl group-hover:bg-pink-500/30 transition-all duration-500" />

          <div className="relative z-10">
            {/* Visual CSS Illustration: Event Report Stacked Pages */}
            <div className="relative mb-6 h-36 w-full overflow-hidden rounded-2xl border border-purple-400/20 bg-gradient-to-br from-slate-950/80 via-slate-900/80 to-purple-950/60 p-4 shadow-inner">
              <div className="absolute right-8 top-3 h-[90%] w-24 rounded-lg bg-purple-500/10 border border-purple-400/10 transform rotate-3 group-hover:rotate-6 transition-transform duration-300" />
              
              <div className="relative h-full w-full rounded-xl border border-purple-400/30 bg-slate-950/90 p-3 flex justify-between gap-3 shadow-lg">
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="h-1.5 w-16 rounded-full bg-purple-400/60" />
                    <div className="h-1 w-full rounded-full bg-slate-700" />
                    <div className="h-1 w-4/5 rounded-full bg-slate-700" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-1 w-full rounded-full bg-slate-700" />
                    <div className="h-1 w-2/3 rounded-full bg-slate-700" />
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-1">
                    <div className="h-1 w-8 rounded-full bg-slate-600" />
                    <div className="h-1 w-8 rounded-full bg-slate-600" />
                  </div>
                </div>

                <div className="w-20 flex flex-col gap-1 justify-center">
                  <div className="h-9 w-full rounded-lg bg-gradient-to-br from-purple-500/20 to-teal-500/20 border border-purple-400/30 p-1 flex items-center justify-center transform group-hover:-translate-y-0.5 transition-transform">
                    <span className="text-[10px]">📷</span>
                  </div>
                  <div className="h-9 w-full rounded-lg bg-gradient-to-br from-pink-500/20 to-coral-500/20 border border-pink-400/30 p-1 flex items-center justify-center transform group-hover:translate-y-0.5 transition-transform">
                    <span className="text-[10px]">🖼️</span>
                  </div>
                </div>
              </div>
            </div>

            <h2 className="text-xl font-black text-white tracking-tight font-sans">
              Event Report Generator
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[#d1d9e8] font-medium">
              Create structured event reports with event details, objectives, outcomes, photo gallery, signatures, and A4 PDF export.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {["Academic Format", "Photo Upload", "Live Preview", "A4 PDF"].map((pill) => (
                <span
                  key={pill}
                  className="rounded-lg border border-purple-400/30 bg-purple-500/15 px-2 py-0.5 text-[11px] font-bold text-purple-300"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-6">
            <Link
              to="/report-dashboard"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-teal-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:from-purple-500 hover:to-pink-500 hover:shadow-purple-500/40 active:scale-98"
            >
              <span>Launch Report Studio</span>
              <span className="text-base transition-transform duration-300 group-hover:translate-x-1.5">→</span>
            </Link>
          </div>
        </div>

        {/* Module Card 4: Attendance Sheet Generator */}
        <div className="group module-galaxy-card p-6 sm:p-7 transition-all duration-300 hover:-translate-y-2 hover:border-teal-400/50 hover:shadow-teal-500/20 flex flex-col justify-between">
          <div className="absolute -right-16 -top-16 h-60 w-60 rounded-full bg-teal-500/15 blur-3xl group-hover:bg-teal-500/30 transition-all duration-500" />
          <div className="absolute -left-16 -bottom-16 h-60 w-60 rounded-full bg-emerald-500/15 blur-3xl group-hover:bg-emerald-500/30 transition-all duration-500" />

          <div className="relative z-10">
            {/* Visual CSS Illustration: Multipage Attendance Sheet Table */}
            <div className="relative mb-6 h-36 w-full overflow-hidden rounded-2xl border border-teal-400/20 bg-gradient-to-br from-slate-950/80 via-slate-900/80 to-teal-950/60 p-4 shadow-inner">
              <div className="absolute inset-x-6 top-3 h-full rounded-xl bg-teal-500/10 border border-teal-400/10 transform rotate-1 group-hover:rotate-2 transition-transform duration-300" />
              
              <div className="relative h-full w-full rounded-xl border border-teal-400/30 bg-slate-950/90 p-2.5 flex flex-col justify-between shadow-lg">
                <div className="border-b border-slate-800 pb-1 flex items-center justify-between text-[8px] font-bold text-teal-300">
                  <span>PPSU / SE / ATTENDANCE</span>
                  <span>39 ROWS / PG</span>
                </div>

                <div className="space-y-1 my-1">
                  <div className="grid grid-cols-[1fr_2fr_4fr_2fr] gap-1 bg-teal-950/60 p-1 rounded text-[7px] font-mono text-slate-400 border border-teal-500/20">
                    <span>SR</span>
                    <span>ENROLL</span>
                    <span>NAME</span>
                    <span>SIGN</span>
                  </div>
                  {[1, 2, 3].map((num) => (
                    <div key={num} className="grid grid-cols-[1fr_2fr_4fr_2fr] gap-1 px-1 text-[7px] font-mono text-slate-400">
                      <span className="text-teal-400">{num}</span>
                      <span className="h-1 bg-slate-700 rounded my-auto w-4/5" />
                      <span className="h-1 bg-slate-600 rounded my-auto w-full" />
                      <span className="border-b border-dashed border-slate-700" />
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-[8px] text-slate-500 pt-0.5 border-t border-slate-800">
                  <span>Coordinator Signed</span>
                  <span className="text-emerald-400 font-bold">Page 1 of 2</span>
                </div>
              </div>
            </div>

            <h2 className="text-xl font-black text-white tracking-tight font-sans">
              Attendance Sheet Generator
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[#d1d9e8] font-medium">
              Manage class-wise student lists and generate structured multipage attendance sheets with blank signature columns.
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {["Student Master", "Class Filter", "Auto Pagination", "Blank Sign Column"].map((pill) => (
                <span
                  key={pill}
                  className="rounded-lg border border-teal-400/30 bg-teal-500/15 px-2 py-0.5 text-[11px] font-bold text-teal-300"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-6">
            <Link
              to="/attendance-dashboard"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-teal-500/25 transition-all duration-300 hover:from-emerald-500 hover:to-teal-500 hover:shadow-teal-500/40 active:scale-98"
            >
              <span>Launch Attendance Studio</span>
              <span className="text-base transition-transform duration-300 group-hover:translate-x-1.5">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
