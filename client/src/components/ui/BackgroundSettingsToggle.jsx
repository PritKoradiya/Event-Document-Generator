import { useState, useEffect, useRef } from "react";

function BackgroundSettingsToggle() {
  const getNormalizedMode = () => {
    try {
      const saved = localStorage.getItem("eventDocumentBackgroundMode");
      return ["full", "reduced", "off"].includes(saved) ? saved : "full";
    } catch {
      return "full";
    }
  };

  const [mode, setMode] = useState(getNormalizedMode);
  const [videoStatus, setVideoStatus] = useState("Loading");
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    try {
      localStorage.setItem("eventDocumentBackgroundMode", newMode);
      window.dispatchEvent(new Event("bgModeChange"));
    } catch (e) {
      console.warn("Could not save background mode to localStorage", e);
    }
    setIsOpen(false);
  };

  // Listen to video status updates from GalaxyBackground (DEV diagnostic badge)
  useEffect(() => {
    const handleStatusChange = (e) => {
      if (e.detail?.status) {
        setVideoStatus(e.detail.status);
      }
    };
    window.addEventListener("galaxyVideoStatusChange", handleStatusChange);
    return () => {
      window.removeEventListener("galaxyVideoStatusChange", handleStatusChange);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const modeLabels = {
    full: "Full Galaxy",
    reduced: "Stars Only",
    off: "Static Off"
  };

  return (
    <div className="relative inline-flex items-center gap-2 text-left" ref={menuRef}>
      {/* DEV Video Status Diagnostic Badge (Rendered ONLY in DEV mode) */}
      {import.meta.env.DEV && (
        <span
          className={`hidden md:inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold border transition ${
            videoStatus === "Playing"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : videoStatus === "Loading"
              ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
              : "border-slate-700 bg-slate-900 text-slate-400"
          }`}
          title="Video Playback Status (Dev Mode Only)"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              videoStatus === "Playing"
                ? "bg-emerald-400 animate-pulse"
                : videoStatus === "Loading"
                ? "bg-amber-400 animate-ping"
                : "bg-slate-400"
            }`}
          />
          Video: {videoStatus}
        </span>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-slate-900/80 px-3 py-1.5 text-xs font-bold text-slate-200 backdrop-blur-md transition hover:border-blue-400 hover:bg-slate-800 hover:text-white"
        title="Background Motion Settings"
      >
        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="hidden sm:inline">BG:</span>
        <span className="text-cyan-300 font-extrabold">{modeLabels[mode]}</span>
        <svg
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-slate-700/80 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-2xl z-50 animate-hero-fade-in">
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1">
            Animated Background
          </div>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => handleModeChange("full")}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition ${
                mode === "full"
                  ? "bg-blue-600/30 text-cyan-300 border border-blue-500/40"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <span>Full Galaxy (Video + Stars)</span>
              {mode === "full" && <span className="text-cyan-400">✓</span>}
            </button>

            <button
              type="button"
              onClick={() => handleModeChange("reduced")}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition ${
                mode === "reduced"
                  ? "bg-blue-600/30 text-cyan-300 border border-blue-500/40"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <span>Reduced (Stars Only)</span>
              {mode === "reduced" && <span className="text-cyan-400">✓</span>}
            </button>

            <button
              type="button"
              onClick={() => handleModeChange("off")}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition ${
                mode === "off"
                  ? "bg-blue-600/30 text-cyan-300 border border-blue-500/40"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <span>Off (Static Gradient)</span>
              {mode === "off" && <span className="text-cyan-400">✓</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BackgroundSettingsToggle;
