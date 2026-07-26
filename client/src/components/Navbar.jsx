import { brandingData } from "../data/brandingData.js";
import BackgroundSettingsToggle from "./ui/BackgroundSettingsToggle.jsx";

function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-blue-500/20 bg-[rgba(3,10,28,0.72)] shadow-lg backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-[1600px] flex-col items-start justify-between gap-3 px-4 py-3 sm:px-5 md:flex-row md:items-center lg:px-6">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl font-sans">
            {brandingData.appName}
          </h1>
          <p className="text-xs font-semibold text-slate-400">
            {brandingData.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <BackgroundSettingsToggle />
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <span>Developed by</span>
            <strong className="text-slate-200 font-bold">{brandingData.developerName}</strong>
          </span>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
