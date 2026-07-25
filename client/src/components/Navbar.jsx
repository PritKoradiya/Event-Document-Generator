import { brandingData } from "../data/brandingData.js";
import BackgroundSettingsToggle from "./ui/BackgroundSettingsToggle.jsx";

function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-blue-500/20 bg-slate-950/80 shadow-lg backdrop-blur-xl">
      <div className="mx-auto flex min-h-20 w-full max-w-[1600px] flex-col items-start justify-between gap-4 px-4 py-4 sm:px-5 md:flex-row md:items-center lg:px-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-[32px] font-sans">
            {brandingData.appName}
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-400 sm:text-sm">
            Certificate, Poster, Report & Attendance Tools
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <BackgroundSettingsToggle />
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-black text-emerald-400 shadow-sm">
            Export Ready
          </span>
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1.5 text-xs font-black text-cyan-400 shadow-sm">
            Document Workspace
          </span>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
