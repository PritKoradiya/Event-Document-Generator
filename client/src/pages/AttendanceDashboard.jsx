import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ModuleHeader from "../components/ui/ModuleHeader.jsx";
import FeatureCard from "../components/ui/FeatureCard.jsx";
import { getStudents } from "../services/attendanceStudentApi.js";
import { getAttendanceSheets } from "../services/attendanceSheetApi.js";

function AttendanceDashboard() {
  const [statsData, setStatsData] = useState({
    totalStudents: 0,
    totalSheets: 0,
    generatedSheets: 0,
    draftSheets: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const studentsRes = await getStudents();
        const sheetsRes = await getAttendanceSheets();

        const allSheets = sheetsRes && sheetsRes.data ? sheetsRes.data : [];
        const generated = allSheets.filter((s) => s.status === "Generated").length;
        const draft = allSheets.filter((s) => s.status === "Draft").length;

        setStatsData({
          totalStudents: studentsRes && studentsRes.total !== undefined ? studentsRes.total : 0,
          totalSheets: allSheets.length,
          generatedSheets: generated,
          draftSheets: draft
        });
      } catch (e) {
        console.error("Failed to load dashboard stats", e);
      }
    };
    fetchData();
  }, []);

  const featureCards = [
    {
      title: "Student Master List",
      description: "Manage department-wise and class-wise student records, add individual students, or parse bulk CSV rosters.",
      btnText: "Manage Students",
      to: "/student-list",
      icon: "👥",
      badge: `${statsData.totalStudents} Students`
    },
    {
      title: "Create Attendance Sheet",
      description: "Select class, department, event title, date, coordinator name, and generate mentor-formatted attendance sheets.",
      btnText: "Create Sheet",
      to: "/create-attendance-sheet",
      icon: "✍️",
      badge: "Form & Live Preview"
    },
    {
      title: "Attendance Records",
      description: "Browse, view, filter by department or class, export to A4 PDF, and manage stored attendance document records.",
      btnText: "View Records",
      to: "/attendance-records",
      icon: "📁",
      badge: `${statsData.totalSheets} Saved`
    },
    {
      title: "Department & Class Setup",
      description: "Create departments and class options used by student rosters and attendance sheets.",
      btnText: "Manage Academic Setup",
      to: "/attendance-setup",
      icon: "⚙️",
      badge: "Academic Setup"
    },
    {
      title: "Class and Department Filter",
      description: "Filter student rosters by department (CE/IT, CSE, AIML) and class (CE4, CE6) before generating sheets.",
      btnText: "Filter Roster",
      to: "/student-list",
      icon: "🔍",
      badge: "Dynamic Filter"
    },
    {
      title: "Automatic Multipage Layout",
      description: "Auto-paginates large student lists into 39 rows per page with repeated school headers and continuous serial numbers.",
      btnText: "Test Pagination",
      to: "/create-attendance-sheet",
      icon: "📄",
      badge: "39 Rows / Page"
    },
    {
      title: "Blank Signature Columns",
      description: "Clean vector layout with blank signature columns and Event Coordinator placement on the final page.",
      btnText: "Preview Format",
      to: "/create-attendance-sheet",
      icon: "✒️",
      badge: "Mentor Format"
    }
  ];

  return (
    <section className="space-y-8 pb-12">
      {/* Top Module Header */}
      <ModuleHeader
        title="Attendance Studio"
        subtitle="Class-wise attendance document workspace"
        theme="attendance"
        badge="Attendance Module"
        primaryAction={{
          label: "Create Attendance Sheet",
          to: "/create-attendance-sheet"
        }}
      />

      {/* ULTRA-PREMIUM HERO SECTION WITH REAL STATS & ATTENDANCE TABLE GRAPHIC */}
      <div className="relative overflow-hidden rounded-[2rem] border border-teal-200/80 bg-gradient-to-br from-teal-950/20 via-slate-900/90 to-emerald-950/80 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl animate-module-hero-fade">
        {/* Layered Background Spotlight & Floating Orbs */}
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-gradient-to-br from-teal-500/25 via-emerald-400/20 to-transparent blur-3xl animate-float-orb" />
        <div className="absolute right-10 bottom-0 h-80 w-80 rounded-full bg-gradient-to-br from-cyan-500/20 via-teal-500/25 to-transparent blur-3xl animate-float-orb [animation-delay:6s]" />

        {/* Faint Dotted Texture Overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#14b8a6 1px, transparent 1px)`,
            backgroundSize: "28px 28px"
          }}
        />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Left Content Column */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/10 px-3.5 py-1 text-xs font-black uppercase tracking-widest text-teal-300 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-teal-400 animate-ping" />
              ATTENDANCE MANAGEMENT WORKSPACE
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15] font-sans">
              Generate accurate class-wise attendance documents from{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200">
                stored student records.
              </span>
            </h1>

            <p className="text-base sm:text-lg leading-relaxed text-slate-300 font-medium max-w-2xl">
              Manage student rosters, filter by department and class, and render exact multipage attendance sheets with repeated headers and blank sign columns.
            </p>

            {/* CTA & Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/create-attendance-sheet"
                className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-teal-500/30 transition-all duration-300 hover:from-emerald-500 hover:to-teal-500 hover:shadow-teal-500/50 active:scale-98"
              >
                <span>Create Attendance Sheet</span>
                <span className="text-base font-bold">→</span>
              </Link>

              <Link
                to="/student-list"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/80 px-5 py-3.5 text-sm font-black text-slate-200 shadow-md backdrop-blur-md transition-all duration-300 hover:border-teal-400 hover:bg-slate-800 hover:text-white active:scale-98"
              >
                <span>Import Student CSV</span>
              </Link>

              <Link
                to="/attendance-records"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/80 px-5 py-3.5 text-sm font-black text-slate-200 shadow-md backdrop-blur-md transition-all duration-300 hover:border-teal-400 hover:bg-slate-800 hover:text-white active:scale-98"
              >
                <span>View Records</span>
              </Link>

              <Link
                to="/attendance-setup"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-500/40 bg-teal-950/60 px-5 py-3.5 text-sm font-black text-teal-200 shadow-md backdrop-blur-md transition-all duration-300 hover:border-teal-400 hover:bg-teal-900 hover:text-white active:scale-98"
              >
                <span>⚙️ Academic Setup</span>
              </Link>
            </div>

            {/* Real Stats Bar */}
            <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold font-mono">
              <div className="rounded-xl border border-teal-500/20 bg-teal-950/40 px-3 py-2.5 text-teal-200 backdrop-blur-sm">
                <span className="text-[10px] text-teal-400 uppercase block">Total Students</span>
                <span className="text-lg font-black text-white">{statsData.totalStudents}</span>
              </div>

              <div className="rounded-xl border border-teal-500/20 bg-teal-950/40 px-3 py-2.5 text-teal-200 backdrop-blur-sm">
                <span className="text-[10px] text-teal-400 uppercase block">Total Sheets</span>
                <span className="text-lg font-black text-white">{statsData.totalSheets}</span>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/40 px-3 py-2.5 text-emerald-200 backdrop-blur-sm">
                <span className="text-[10px] text-emerald-400 uppercase block">Generated</span>
                <span className="text-lg font-black text-emerald-300">{statsData.generatedSheets}</span>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-950/40 px-3 py-2.5 text-amber-200 backdrop-blur-sm">
                <span className="text-[10px] text-amber-400 uppercase block">Draft Sheets</span>
                <span className="text-lg font-black text-amber-300">{statsData.draftSheets}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Code-built Multipage Sheet Preview Graphic */}
          <div className="relative flex justify-center items-center lg:justify-end">
            <div className="relative w-full max-w-[420px] aspect-[1.35/1] rounded-2xl border border-teal-400/30 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950/60 p-4 shadow-2xl overflow-hidden animate-subtle-parallax">
              <div className="relative h-full w-full flex flex-col justify-between bg-white/95 rounded-xl p-3 border border-slate-300 shadow-inner">
                {/* Header Simulation */}
                <div className="text-center space-y-0.5 border-b border-slate-300 pb-2">
                  <p className="text-[10px] font-black text-slate-900 uppercase">School of Engineering, PPSU</p>
                  <p className="text-[9px] font-bold text-slate-700">Computer Engineering Department</p>
                  <p className="text-[9px] font-extrabold text-teal-800">Expert Talk - Prompt Engineering</p>
                  <div className="flex justify-between text-[8px] font-mono text-slate-600 pt-1">
                    <span>Attendance Sheet</span>
                    <span>Class- CE4</span>
                    <span>Date: 23/07/2026</span>
                  </div>
                </div>

                {/* Table Simulation */}
                <div className="my-1 border border-slate-400 rounded overflow-hidden text-[7px] font-mono">
                  <div className="grid grid-cols-[1fr_2fr_4fr_2fr] gap-1 bg-slate-100 font-bold border-b border-slate-400 p-1 text-slate-800">
                    <span>Sr. No.</span>
                    <span>Enrollment No.</span>
                    <span>Name</span>
                    <span>Sign</span>
                  </div>
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="grid grid-cols-[1fr_2fr_4fr_2fr] gap-1 p-1 border-b border-slate-200 text-slate-700">
                      <span>{n}</span>
                      <span>24SE02CE00{n}</span>
                      <span className="font-sans font-semibold">STUDENT NAME {n}</span>
                      <span className="bg-slate-50 border-b border-dotted border-slate-300" />
                    </div>
                  ))}
                </div>

                {/* Coordinator Simulation */}
                <div className="text-[8px] font-serif font-bold text-slate-900 pt-1 flex justify-between">
                  <span>Event Coordinator: Dr. Jayshri Patil</span>
                  <span className="font-sans text-[7px] text-teal-700 font-black">Page 1 of 2</span>
                </div>
              </div>
            </div>

            {/* Floating Mini Badge */}
            <div className="absolute -bottom-4 -left-2 sm:left-4 rounded-xl border border-teal-300/40 bg-slate-900/90 px-3.5 py-2 text-xs font-black text-white shadow-xl backdrop-blur-md flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-600 text-xs">📑</span>
              <span>Mentor A4 Multipage Format</span>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE TOOLS GRID (6 CARDS) */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-teal-600">ATTENDANCE TOOLS</span>
            <h2 className="text-2xl font-black text-slate-950 tracking-tight font-sans">
              Attendance Generator Tools
            </h2>
          </div>
          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
            6 Modules Active
          </span>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((card) => (
            <FeatureCard key={card.title} {...card} theme="teal" />
          ))}
        </div>
      </div>
    </section>
  );
}

export default AttendanceDashboard;
