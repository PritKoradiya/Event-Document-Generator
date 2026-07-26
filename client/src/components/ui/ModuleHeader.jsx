import MainDashboardButton from "../navigation/MainDashboardButton.jsx";
import { Link } from "react-router-dom";

function ModuleHeader({
  title,
  subtitle,
  badge = "Workspace Ready",
  theme = "certificate",
  primaryAction
}) {
  let badgeColors = "border-blue-200/80 bg-blue-50/80 text-blue-700";
  let iconBg = "bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/20";
  let iconSymbol = "🏆";
  let btnBg = "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700";

  if (theme === "report") {
    badgeColors = "border-purple-200/80 bg-purple-50/80 text-purple-700";
    iconBg = "bg-gradient-to-br from-purple-600 to-pink-600 shadow-purple-500/20";
    iconSymbol = "📋";
    btnBg = "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700";
  } else if (theme === "attendance") {
    badgeColors = "border-teal-200/80 bg-teal-50/80 text-teal-800";
    iconBg = "bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 shadow-teal-500/20";
    iconSymbol = "📑";
    btnBg = "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-teal-700";
  }

  return (
    <header className="app-glass-toolbar sticky top-0 z-30 mb-6 p-4 transition-all">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left Branding */}
        <div className="flex items-center gap-3.5">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white text-lg font-black shadow-md ${iconBg}`}>
            {iconSymbol}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl font-sans">
                {title}
              </h1>
              {badge && (
                <span className={`hidden sm:inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${badgeColors}`}>
                  {badge}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-500 sm:text-sm">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <MainDashboardButton />
          {primaryAction && (
            primaryAction.to ? (
              <Link
                to={primaryAction.to}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-md transition-all duration-200 active:scale-98 ${btnBg}`}
              >
                <span>{primaryAction.label}</span>
                <span>→</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={primaryAction.onClick}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-md transition-all duration-200 active:scale-98 ${btnBg}`}
              >
                <span>{primaryAction.label}</span>
                <span>→</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}

export default ModuleHeader;
