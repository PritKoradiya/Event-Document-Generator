import { Navigate, Route, Routes } from "react-router-dom";
import AppBackgroundLayout from "./layouts/AppBackgroundLayout.jsx";
import LandingLayout from "./layouts/LandingLayout.jsx";
import CertificateLayout from "./layouts/CertificateLayout.jsx";
import ReportLayout from "./layouts/ReportLayout.jsx";
import AttendanceLayout from "./layouts/AttendanceLayout.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import CertificateDashboard from "./pages/CertificateDashboard.jsx";
import ReportDashboard from "./pages/ReportDashboard.jsx";
import AttendanceDashboard from "./pages/AttendanceDashboard.jsx";

import CreateCertificate from "./pages/CreateCertificate.jsx";
import Templates from "./pages/Templates.jsx";
import Categories from "./pages/Categories.jsx";
import BulkGenerate from "./pages/BulkGenerate.jsx";
import GeneratedCertificates from "./pages/GeneratedCertificates.jsx";
import CreatePoster from "./pages/CreatePoster.jsx";
import PosterRecords from "./pages/PosterRecords.jsx";
import CreateEventReport from "./pages/CreateEventReport.jsx";
import EventReports from "./pages/EventReports.jsx";

import StudentList from "./pages/StudentList.jsx";
import CreateAttendanceSheet from "./pages/CreateAttendanceSheet.jsx";
import AttendanceRecords from "./pages/AttendanceRecords.jsx";

function App() {
  return (
    <Routes>
      <Route element={<AppBackgroundLayout />}>
        {/* 1. Public Landing Layout */}
        <Route element={<LandingLayout />}>
          <Route path="/" element={<Dashboard />} />
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
        </Route>
      </Route>

      {/* Catch-all redirect to Landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
