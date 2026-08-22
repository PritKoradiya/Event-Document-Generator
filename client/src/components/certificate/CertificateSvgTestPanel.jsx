import React, { useRef, useState } from "react";
import CertificateSvg from "./CertificateSvg.jsx";
import downloadCertificatePdf, { downloadCertificatePng } from "../../utils/downloadCertificatePdf.js";

const testPresets = [
  {
    label: "1. Normal Content",
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
      participantName: "Dr. Pritkumar Nileshbhai Koradiya",
      organizationName: "P P Savani School of Engineering and Technology",
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
    label: "3. Two-Line Participant Name",
    data: {
      participantName: "Dr. Pritkumar Nileshbhai Koradiya-Shah University Scholar",
      organizationName: "P P Savani School of Engineering and Technology",
      eventName: "International Tech Summit 2026",
      certificateCategory: "Conference",
      certificateTitle: "Certificate of Participation",
      eventDate: "2026-08-15",
      description: "For active involvement in technical sessions.",
      templateStyle: "Modern Wave Certificate",
      certificateId: "TEST-0003",
      authorizedSignatureName: "Authorized Person"
    }
  },
  {
    label: "4. Long Event Name",
    data: {
      participantName: "Pritkumar Koradiya",
      organizationName: "P P Savani School of Engineering and Technology",
      eventName: "International Conference on Artificial Intelligence and Emerging Technologies 2026",
      certificateCategory: "Conference",
      certificateTitle: "Certificate of Participation",
      eventDate: "2026-08-15",
      description: "For valuable contributions as a conference attendee.",
      templateStyle: "Modern Wave Certificate",
      certificateId: "TEST-0004",
      authorizedSignatureName: "Authorized Person"
    }
  },
  {
    label: "5. Long Organization Name",
    data: {
      participantName: "Rahul Patel",
      organizationName: "P P Savani School of Engineering and Technology, Centre for Excellence in Computing",
      eventName: "National Tech Fest 2026",
      certificateCategory: "Workshop",
      certificateTitle: "Certificate of Achievement",
      eventDate: "2026-08-15",
      description: "For organizing student workshops.",
      templateStyle: "Gold Corner Certificate",
      certificateId: "TEST-0005",
      authorizedSignatureName: "Authorized Person"
    }
  },
  {
    label: "6. 220-Char Description",
    data: {
      participantName: "Pritkumar Koradiya",
      organizationName: "P P Savani School of Engineering and Technology",
      eventName: "International Conference on Artificial Intelligence 2026",
      certificateCategory: "Academic",
      certificateTitle: "Certificate of Participation",
      eventDate: "2026-08-15",
      description: "The participant demonstrated active involvement, professional conduct, collaborative learning, and valuable contributions throughout the event activities, technical sessions, and hands-on demonstrations.",
      templateStyle: "Classic Appreciation Certificate",
      certificateId: "TEST-0006",
      authorizedSignatureName: "Authorized Person"
    }
  },
  {
    label: "7. Dark Template",
    data: {
      participantName: "Kavya Patel",
      organizationName: "Tech Innovators Club",
      eventName: "Cyber Hackathon 2026",
      certificateCategory: "Competition",
      certificateTitle: "Certificate of Excellence",
      eventDate: "2026-08-15",
      description: "First place award winner in the 24-hour coding sprint.",
      templateStyle: "Dark Luxury Certificate",
      certificateId: "TEST-0007",
      authorizedSignatureName: "Authorized Person"
    }
  },
  {
    label: "8. PNG Background Template",
    data: {
      participantName: "Aniket Verma",
      organizationName: "PP Savani University",
      eventName: "Design Workshop 2026",
      certificateCategory: "Academic",
      certificateTitle: "Certificate of Achievement",
      eventDate: "2026-08-15",
      description: "For completing the advanced design masterclass.",
      templateStyle: "Royal Blue Border Certificate",
      certificateId: "TEST-0008",
      authorizedSignatureName: "Authorized Person"
    }
  },
  {
    label: "9. Classic Appreciation Template",
    data: {
      participantName: "Dr. Pritkumar Nileshbhai Koradiya",
      organizationName: "P P Savani School of Engineering and Technology",
      eventName: "National Mentorship Summit",
      certificateCategory: "Appreciation",
      certificateTitle: "Certificate of Appreciation",
      eventDate: "2026-08-15",
      description: "In recognition of distinguished service, leadership, and exemplary dedication to academic excellence and student mentorship.",
      templateStyle: "Classic Appreciation Certificate",
      certificateId: "TEST-0009",
      authorizedSignatureName: "Authorized Person"
    }
  }
];

function CertificateSvgTestPanel() {
  if (!import.meta.env.DEV) {
    return null;
  }

  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const svgRef = useRef(null);
  const currentData = testPresets[activePresetIndex].data;

  const handleDownloadPdf = async () => {
    if (svgRef.current) {
      await downloadCertificatePdf(svgRef.current, `Test_${currentData.certificateId}.pdf`);
    }
  };

  const handleDownloadPng = async () => {
    if (svgRef.current) {
      await downloadCertificatePng(svgRef.current, `Test_${currentData.certificateId}.png`);
    }
  };

  return (
    <div className="my-8 rounded-3xl border-2 border-dashed border-purple-300 bg-purple-50/40 p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-purple-200 pb-3 gap-3">
        <div>
          <span className="rounded-full bg-purple-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white">
            PURE SVG DEV SUITE
          </span>
          <h3 className="text-lg font-black text-slate-900 mt-1">SVG Certificate Regression Test Panel</h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-black text-white hover:bg-purple-700 transition"
          >
            Download PDF
          </button>
          <button
            type="button"
            onClick={handleDownloadPng}
            className="rounded-xl border border-purple-300 bg-white px-4 py-2 text-xs font-black text-purple-700 hover:bg-purple-50 transition"
          >
            Download PNG
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {testPresets.map((preset, idx) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setActivePresetIndex(idx)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              activePresetIndex === idx
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-white text-slate-700 hover:bg-purple-100 border border-slate-200"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Live Pure SVG Render */}
      <div className="certificate-preview-shell border rounded-2xl bg-white overflow-hidden p-2">
        <CertificateSvg ref={svgRef} id="test-svg-preview" {...currentData} />
      </div>
    </div>
  );
}

export default CertificateSvgTestPanel;
