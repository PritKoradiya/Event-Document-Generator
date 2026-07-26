import { useState } from "react";
import { NavLink } from "react-router-dom";

const reportNavItems = [
  {
    name: "Overview",
    path: "/report-dashboard",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  {
    name: "Create Event Report",
    path: "/create-event-report",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    name: "Event Report Records",
    path: "/event-reports",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  }
];

function ReportNavigation() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 sticky top-24 z-30 transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="app-glass-sidebar flex flex-col gap-2 p-3.5 transition-all">
        {/* Rail Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 mb-1">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white text-xs font-black shadow-md shadow-purple-600/30">
                RS
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                Report Studio
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 rounded-xl text-slate-400 hover:text-purple-400 hover:bg-slate-800/60 transition ${
              isCollapsed ? "mx-auto" : ""
            }`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              className={`h-4 w-4 transform transition-transform ${isCollapsed ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1.5">
          {reportNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group relative flex items-center gap-3.5 rounded-2xl px-3.5 py-3 text-sm font-bold transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 text-white shadow-lg shadow-purple-500/30"
                    : "text-slate-300 hover:bg-purple-500/10 hover:text-pink-300"
                }`
              }
              title={isCollapsed ? item.name : undefined}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-pink-300 shadow-sm" />
                  )}
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 ${isActive ? "text-white" : "text-purple-400 group-hover:scale-110"}`}>
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="truncate font-sans">{item.name}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}

export default ReportNavigation;
