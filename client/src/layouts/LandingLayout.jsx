import { Outlet } from "react-router-dom";
import { brandingData } from "../data/brandingData.js";
import BackgroundSettingsToggle from "../components/ui/BackgroundSettingsToggle.jsx";

function LandingLayout() {
  return (
    <div className="relative min-h-screen bg-transparent text-slate-100 flex flex-col justify-between overflow-x-hidden">
      {/* Landing Header */}
      <header className="relative z-20 w-full border-b border-slate-800/80 bg-[rgba(3,10,28,0.72)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left Logo / Title */}
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
            </div>
          </div>

          {/* Right Controls & Developer Info */}
          <div className="flex items-center gap-4">
            <BackgroundSettingsToggle />

            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <span>Developed by</span>
              <strong className="text-slate-200 font-bold">{brandingData.developerName}</strong>
            </span>
          </div>
        </div>
      </header>

      {/* Main Landing Content */}
      <main className="relative z-10 flex-1 flex flex-col justify-center">
        <Outlet />
      </main>

      {/* Professional Ownership Footer */}
      <footer className="relative z-20 border-t border-slate-800/80 bg-slate-950/90 py-5 text-center text-xs font-medium text-slate-400">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-2 px-4 sm:px-6">
          <p className="font-black text-slate-200 font-sans tracking-tight text-sm">
            {brandingData.appName}
          </p>
          <p className="text-[11px] text-slate-400 max-w-xl">
            {brandingData.subtitle}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
            <span>&copy; {brandingData.copyrightYear} {brandingData.developerName}. {brandingData.rightsText}</span>
            <span>•</span>
            <span>{brandingData.protectionText}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingLayout;
