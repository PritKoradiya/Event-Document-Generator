import React, { useState } from "react";
import ScaledCertificatePreview from "./ScaledCertificatePreview.jsx";
import CertificateCanvas from "./CertificateCanvas.jsx";
import downloadCertificatePdf from "../../utils/downloadCertificatePdf.js";

const testPresets = [
  {
    label: "1. Normal Data",
    data: {
      participantName: "Pritkumar Koradiya",
      organizationName: "PP Savani University",
      eventName: "Hackathon 2026",
      certificateCategory: "Seminar",
      certificateTitle: "Certificate of Participation",
      eventDate: "2026-08-15",
      description: "For successfully participating in the technical event.",
      templateStyle: "Classic Certificate",
      certificateId: "TEST-0001",
      authorizedSignatureName: "Authorized Person"
    }
  },
  {
    label: "2. Long Participant Name",
    data: {
      participantName: "Dr. Pritkumar Nileshbhai Koradiya-Shah",
      organizationName: "School of Engineering & Technology",
      eventName: "International AI Symposium 2026",
      certificateCategory: "Academic",
      certificateTitle: "Certificate of Excellence",
      eventDate: "2026-08-15",
      description: "For outstanding performance and research contribution.",
      templateStyle: "Academic Seal Certificate",
      certificateId: "TEST-0002",
      authorizedSignatureName: "Authorized Person"
    }
  },
  {
    label: "3. Long Event Name",
    data: {
      participantName: "Rahul Patel",
      organizationName: "PP Savani University",
      eventName: "International Conference on Artificial Intelligence, Cloud Computing & Emerging Software Architecture Technologies",
      certificateCategory: "Conference",
      certificateTitle: "Certificate of Appreciation",
      eventDate: "2026-08-15",
      description: "For valuable contributions as a keynote speaker.",
      templateStyle: "Modern Wave Certificate",
      certificateId: "TEST-0003",
      authorizedSignatureName: "Authorized Person"
    }
  },
  {
    label: "4. Long Description",
    data: {
      participantName: "Neha Sharma",
      organizationName: "PP Savani University",
      eventName: "Faculty Development Program",
      certificateCategory: "FDP",
      certificateTitle: "Certificate of Completion",
      eventDate: "2026-08-15",
      description: "For successfully attending, presenting research papers, and actively participating in all hands-on technical sessions, lab demonstrations, and interactive panel discussions conducted throughout the five-day intensive workshop.",
      templateStyle: "Gold Corner Certificate",
      certificateId: "TEST-0004",
      authorizedSignatureName: "Authorized Person"
    }
  },
  {
    label: "5. Image Background Template",
    data: {
      participantName: "Aniket Verma",
      organizationName: "PP Savani University",
      eventName: "Design Workshop 2026",
      certificateCategory: "Workshop",
      certificateTitle: "Certificate of Achievement",
      eventDate: "2026-08-15",
      description: "For completing the advanced UI/UX design masterclass.",
      templateStyle: "Royal Blue Border Certificate",
      certificateId: "TEST-0005",
      authorizedSignatureName: "Authorized Person"
    }
  },
  {
    label: "6. Dark Luxury Template",
    data: {
      participantName: "Kavya Patel",
      organizationName: "Tech Innovators Club",
      eventName: "Cyber Hackathon 2026",
      certificateCategory: "Competition",
      certificateTitle: "Certificate of Excellence",
      eventDate: "2026-08-15",
      description: "First place award winner in the 24-hour coding challenge.",
      templateStyle: "Dark Luxury Certificate",
      certificateId: "TEST-0006",
      authorizedSignatureName: "Authorized Person"
    }
  },
  {
    label: "7. Classic Appreciation Template",
    data: {
      participantName: "Pritkumar Koradiya",
      organizationName: "PP Savani University",
      eventName: "National Mentorship Summit",
      certificateCategory: "Appreciation",
      certificateTitle: "Certificate of Appreciation",
      eventDate: "2026-08-15",
      description: "In recognition of distinguished service, leadership, and exemplary dedication to academic excellence.",
      templateStyle: "Classic Appreciation Certificate",
      certificateId: "TEST-0007",
      authorizedSignatureName: "Authorized Person"
    }
  }
];

function CertificateExportTestPanel() {
  if (!import.meta.env.DEV) {
    return null;
  }

  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const currentData = testPresets[activePresetIndex].data;

  const handleTestDownload = async () => {
    await downloadCertificatePdf("test-export-canvas", `Test_${currentData.certificateId}.pdf`);
  };

  return (
    <div className="my-8 rounded-3xl border-2 border-dashed border-purple-300 bg-purple-50/40 p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-purple-200 pb-3">
        <div>
          <span className="rounded-full bg-purple-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white">
            DEV TEST PANEL
          </span>
          <h3 className="text-lg font-black text-slate-900 mt-1">Certificate Export Regression Suite</h3>
        </div>
        <button
          type="button"
          onClick={handleTestDownload}
          className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-black text-white hover:bg-purple-700 transition"
        >
          Test PDF Export
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {testPresets.map((preset, idx) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setActivePresetIndex(idx)}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activePresetIndex === idx
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-purple-100 border border-slate-200"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Off-screen Export Canvas Host */}
      <div className="certificate-export-host" aria-hidden="true">
        <CertificateCanvas id="test-export-canvas" {...currentData} exportMode />
      </div>

      {/* Live Preview Screen Rendering */}
      <div className="pt-2">
        <p className="text-xs font-bold text-slate-500 mb-2">Live Scaled Preview:</p>
        <ScaledCertificatePreview id="test-scaled-preview" certificateData={currentData} />
      </div>
    </div>
  );
}

export default CertificateExportTestPanel;
