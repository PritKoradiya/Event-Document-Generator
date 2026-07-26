import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import AppBackgroundLayout from "./layouts/AppBackgroundLayout.jsx";
import LandingLayout from "./layouts/LandingLayout.jsx";
import CertificateLayout from "./layouts/CertificateLayout.jsx";
import ReportLayout from "./layouts/ReportLayout.jsx";
import AttendanceLayout from "./layouts/AttendanceLayout.jsx";
import LoadingState from "./components/ui/LoadingState.jsx";

// Core Builder & Dashboard Pages (Synchronous)
import Dashboard from "./pages/Dashboard.jsx";
import CertificateDashboard from "./pages/CertificateDashboard.jsx";
import ReportDashboard from "./pages/ReportDashboard.jsx";
import AttendanceDashboard from "./pages/AttendanceDashboard.jsx";
import CreateCertificate from "./pages/CreateCertificate.jsx";
import CreatePoster from "./pages/CreatePoster.jsx";
import CreateEventReport from "./pages/CreateEventReport.jsx";
import CreateAttendanceSheet from "./pages/CreateAttendanceSheet.jsx";
import Categories from "./pages/Categories.jsx";
import BulkGenerate from "./pages/BulkGenerate.jsx";

// Secondary Roster & Record Pages (Lazy Loaded)
const Templates = lazy(() => import("./pages/Templates.jsx"));
const GeneratedCertificates = lazy(() => import("./pages/GeneratedCertificates.jsx"));
const PosterRecords = lazy(() => import("./pages/PosterRecords.jsx"));
const EventReports = lazy(() => import("./pages/EventReports.jsx"));
const StudentList = lazy(() => import("./pages/StudentList.jsx"));
const AttendanceRecords = lazy(() => import("./pages/AttendanceRecords.jsx"));
const AttendanceSetup = lazy(() => import("./pages/AttendanceSetup.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

function App() {
  return (
    <Suspense fallback={<LoadingState message="Loading workspace page..." />}>
      <Routes>
        <Route element={<AppBackgroundLayout />}>
          {/* 1. Public Landing Layout */}
          <Route element={<LandingLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/404" element={<NotFound />} />
          </Route>

          {/* 2. Certificate Module Layout */}
          <Route element={<CertificateLayout />}>
            <Route path="/certificate-dashboard" element={<CertificateDashboard />} />
            <Route path="/create-certificate" element={<CreateCertificate />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/bulk-generate" element={<BulkGenerate />} />
            <Route path="/generated-certificates" element={<GeneratedCertificates />} />
            <Route path="/create-poster" element={<CreatePoster />} />
            <Route path="/poster-records" element={<PosterRecords />} />
          </Route>

          {/* 3. Report Module Layout */}
          <Route element={<ReportLayout />}>
            <Route path="/report-dashboard" element={<ReportDashboard />} />
            <Route path="/create-event-report" element={<CreateEventReport />} />
            <Route path="/event-reports" element={<EventReports />} />
          </Route>

          {/* 4. Attendance Module Layout */}
          <Route element={<AttendanceLayout />}>
            <Route path="/attendance-dashboard" element={<AttendanceDashboard />} />
            <Route path="/student-list" element={<StudentList />} />
            <Route path="/create-attendance-sheet" element={<CreateAttendanceSheet />} />
            <Route path="/attendance-records" element={<AttendanceRecords />} />
            <Route path="/attendance-setup" element={<AttendanceSetup />} />
          </Route>

          {/* 5. Wildcard 404 Fallback */}
          <Route element={<LandingLayout />}>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
