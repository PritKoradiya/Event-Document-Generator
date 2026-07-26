import { useState, useEffect, useRef } from "react";
import { getSavedBackgroundMode, setSavedBackgroundMode } from "../../utils/backgroundMode.js";

function BackgroundSettingsToggle() {
  const [mode, setMode] = useState(getSavedBackgroundMode);
  const [videoStatus, setVideoStatus] = useState("Loading");
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const handleModeChange = (newMode) => {
    const normalized = setSavedBackgroundMode(newMode);
    setMode(normalized);
    try {
      window.dispatchEvent(new Event("bgModeChange"));
    } catch (e) {
      console.warn("Could not dispatch bgModeChange event", e);
    }
    setIsOpen(false);
  };

  // Listen for external mode changes
  useEffect(() => {
    const handleExternalChange = () => {
      setMode(getSavedBackgroundMode());
    };
    window.addEventListener("bgModeChange", handleExternalChange);
    window.addEventListener("storage", handleExternalChange);
    return () => {
      window.removeEventListener("bgModeChange", handleExternalChange);
      window.removeEventListener("storage", handleExternalChange);
    };
  }, []);

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

  const buttonLabels = {
    video: "BG: Video",
    stars: "BG: Stars",
    static: "BG: Static"
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
        title="Background Settings"
      >
        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-cyan-300 font-extrabold">{buttonLabels[mode] || "BG: Video"}</span>
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
            BACKGROUND
          </div>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => handleModeChange("video")}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition ${
                mode === "video"
                  ? "bg-blue-600/30 text-cyan-300 border border-blue-500/40"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <span>Video Background</span>
              {mode === "video" && <span className="text-cyan-400 font-bold">✓</span>}
            </button>

            <button
              type="button"
              onClick={() => handleModeChange("stars")}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition ${
                mode === "stars"
                  ? "bg-blue-600/30 text-cyan-300 border border-blue-500/40"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <span>Stars Background</span>
              {mode === "stars" && <span className="text-cyan-400 font-bold">✓</span>}
            </button>

            <button
              type="button"
              onClick={() => handleModeChange("static")}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition ${
                mode === "static"
                  ? "bg-blue-600/30 text-cyan-300 border border-blue-500/40"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <span>Static Background</span>
              {mode === "static" && <span className="text-cyan-400 font-bold">✓</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BackgroundSettingsToggle;
