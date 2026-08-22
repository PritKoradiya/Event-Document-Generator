import React, { forwardRef } from "react";
import templateData from "../../data/templateData.js";
import CertificateSvgFrame from "./CertificateSvgFrame.jsx";
import CertificateSvgContent from "./CertificateSvgContent.jsx";

const CERTIFICATE_WIDTH = 1600;
const CERTIFICATE_HEIGHT = 1131;

const templateMap = templateData.reduce((acc, item) => {
  if (item.id) acc[item.id] = item;
  if (item.name) acc[item.name] = item;
  if (item.designKey) acc[item.designKey] = item;
  return acc;
}, {});

const CertificateSvg = forwardRef(function CertificateSvg(
  {
    id = "certificate-svg",
    participantName = "Pritkumar Koradiya",
    organizationName = "School of Engineering, PP Savani University",
    eventName = "International Tech Summit 2026",
    certificateCategory = "Seminar",
    certificateTitle = "Certificate of Participation",
    eventDate = "2026-08-15",
    description = "for successfully attending and participating in the technical sessions and workshops.",
    templateStyle = "Classic Certificate",
    certificateId = "CERT-2026-0001",
    authorizedSignatureName = "Authorized Person",
    authorizedSignatureMode = "blank",
    authorizedSignatureImage = null,
    drSignatureName = "Dr. Niraj Shah",
    drSignatureMode = "blank",
    drSignatureImage = null,
    deanName,
    signatureLayout = "both",
    singleSignaturePosition = "center",
    designKey = "",
    backgroundImage = "",
    backgroundMode = "stretch"
  },
  ref
) {
  // Resolve selected template definition
  const selectedTemplate =
    templateMap[designKey] ||
    templateMap[templateStyle] ||
    templateData[0];

  const mergedTemplate = {
    ...selectedTemplate,
    backgroundImage: backgroundImage || selectedTemplate?.backgroundImage,
    designType: selectedTemplate?.designType || (backgroundImage ? "image-background" : "vector"),
    backgroundMode: backgroundMode || selectedTemplate?.backgroundMode || "stretch"
  };

  return (
    <svg
      ref={ref}
      id={id}
      viewBox={`0 0 ${CERTIFICATE_WIDTH} ${CERTIFICATE_HEIGHT}`}
      width={CERTIFICATE_WIDTH}
      height={CERTIFICATE_HEIGHT}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      preserveAspectRatio="xMidYMid meet"
      className="certificate-svg"
      style={{
        display: "block",
        maxWidth: "100%",
        height: "auto"
      }}
    >
      {/* 1. Decorative SVG Frame / Background */}
      <CertificateSvgFrame template={mergedTemplate} />

      {/* 2. Pure SVG Dynamic Content Layout */}
      <CertificateSvgContent
        participantName={participantName}
        organizationName={organizationName}
        eventName={eventName}
        certificateCategory={certificateCategory}
        certificateTitle={certificateTitle}
        eventDate={eventDate}
        description={description}
        certificateId={certificateId}
        authorizedSignatureName={authorizedSignatureName}
        authorizedSignatureMode={authorizedSignatureMode}
        authorizedSignatureImage={authorizedSignatureImage}
        drSignatureName={drSignatureName}
        drSignatureMode={drSignatureMode}
        drSignatureImage={drSignatureImage}
        deanName={deanName}
        signatureLayout={signatureLayout}
        singleSignaturePosition={singleSignaturePosition}
        theme={mergedTemplate.theme || {}}
      />
    </svg>
  );
});

export { CERTIFICATE_WIDTH, CERTIFICATE_HEIGHT };
export default CertificateSvg;
