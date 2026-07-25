import { useState } from "react";
import { NavLink } from "react-router-dom";
import MainDashboardButton from "./MainDashboardButton.jsx";

const certificateNavItems = [
  { name: "Overview", path: "/certificate-dashboard" },
  { name: "Create Certificate", path: "/create-certificate" },
  { name: "Poster Builder", path: "/create-poster" },
  { name: "Templates", path: "/templates" },
  { name: "Categories", path: "/categories" },
  { name: "Bulk Generate", path: "/bulk-generate" },
  { name: "Certificate Records", path: "/generated-certificates" },
  { name: "Poster Records", path: "/poster-records" }
];

const reportNavItems = [
  { name: "Overview", path: "/report-dashboard" },
  { name: "Create Event Report", path: "/create-event-report" },
  { name: "Event Report Records", path: "/event-reports" }
];

const attendanceNavItems = [
  { name: "Overview", path: "/attendance-dashboard" },
  { name: "Student Master", path: "/student-list" },
  { name: "Create Attendance Sheet", path: "/create-attendance-sheet" },
  { name: "Attendance Records", path: "/attendance-records" }
];

function MobileModuleNavigation({ module = "certificate" }) {
  const [isOpen, setIsOpen] = useState(false);

  let items = certificateNavItems;
  let title = "Certificate Studio";
  let badgeText = "CS";
  let badgeBg = "bg-blue-600";
  let activeClass = "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25";

  if (module === "report") {
    items = reportNavItems;
    title = "Report Studio";
    badgeText = "RS";
    badgeBg = "bg-purple-600";
    activeClass = "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/25";
  } else if (module === "attendance") {
    items = attendanceNavItems;
    title = "Attendance Studio";
    badgeText = "AS";
    badgeBg = "bg-teal-600";
    activeClass = "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md shadow-teal-500/25";
  }

  return (
    <div className="lg:hidden w-full mb-4 relative z-40">
      {/* Mobile Top Bar */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-700/60 bg-slate-950/85 p-3 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${badgeBg} text-white font-black text-xs shadow-sm`}>
            {badgeText}
          </span>
          <div>
            <h2 className="text-sm font-black text-slate-100 leading-none">{title}</h2>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Workspace Navigation</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <MainDashboardButton className="!px-3 !py-1.5 !text-xs" />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200 transition hover:bg-slate-800"
            aria-label="Toggle Navigation Menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Slide-Over Drawer */}
      {isOpen && (
        <div className="mt-2 rounded-2xl border border-slate-700/80 bg-slate-950/95 p-4 shadow-2xl space-y-2 animate-hero-fade-in backdrop-blur-2xl">
          <p className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
            {title} Menu
          </p>
          <nav className="grid gap-1">
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    isActive
                      ? activeClass
                      : "text-slate-300 hover:bg-slate-900 hover:text-white"
                  }`
                }
              >
                <span>{item.name}</span>
                <span className="text-xs opacity-70">→</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}

export default MobileModuleNavigation;
