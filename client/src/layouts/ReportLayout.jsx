import { Outlet } from "react-router-dom";
import ReportNavigation from "../components/navigation/ReportNavigation.jsx";
import MobileModuleNavigation from "../components/navigation/MobileModuleNavigation.jsx";
import Footer from "../components/Footer.jsx";

function ReportLayout() {
  return (
    <div className="min-h-screen bg-transparent text-slate-900 flex flex-col justify-between selection:bg-purple-500 selection:text-white">
      {/* Top Main Workspace Wrapper */}
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8">
        {/* Mobile Navigation Drawer Bar */}
        <MobileModuleNavigation module="report" />

        <div className="flex flex-1 gap-6">
          {/* Desktop Compact Navigation Rail */}
          <ReportNavigation />

          {/* Main Working Viewport Area */}
          <main className="min-w-0 flex-1 flex flex-col">
            <div className="flex-1">
              <Outlet />
            </div>
            <Footer />
          </main>
        </div>
      </div>
    </div>
  );
}

export default ReportLayout;
