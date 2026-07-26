import { Outlet } from "react-router-dom";
import { brandingData } from "../data/brandingData.js";
import BackgroundSettingsToggle from "../components/ui/BackgroundSettingsToggle.jsx";

function LandingLayout() {
  return (
    <div className="relative min-h-screen bg-transparent text-slate-100 flex flex-col justify-between overflow-x-hidden">
      {/* Landing Header */}
      <header className="relative z-20 w-full border-b border-slate-800/80 bg-[rgba(3,10,28,0.72)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left Logo / Mark */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-[1px] shadow-lg shadow-blue-500/20">
              <div className="flex h-full w-full items-center justify-center rounded-[11px] bg-slate-950 text-white text-xs font-black">
                EDG
              </div>
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-white font-sans">
                {brandingData.appName}
              </span>
              <span className="ml-2 hidden sm:inline-block rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-extrabold text-blue-400 border border-blue-500/20">
                PRO
              </span>
            </div>
          </div>

          {/* Right Ownership, Motion Setting & Status Badge */}
          <div className="flex items-center gap-3">
            <BackgroundSettingsToggle />

            <span className="hidden md:inline-flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span>Developed by</span>
              <strong className="text-slate-200 font-bold">{brandingData.developerName}</strong>
            </span>

            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-extrabold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Platform Ready</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Landing Content */}
      <main className="relative z-10 flex-1 flex flex-col justify-center">
        <Outlet />
      </main>

      {/* Compact Ownership Footer */}
      <footer className="relative z-20 border-t border-slate-800/80 bg-slate-950/80 py-3 text-center text-xs font-semibold text-slate-500">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6">
          <p>&copy; {brandingData.copyrightYear} {brandingData.appName}. {brandingData.rightsText}</p>
          <p>
            Designed & Developed by{" "}
            <span className="text-slate-300 font-bold hover:text-blue-400 transition">
              {brandingData.developerName}
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingLayout;
