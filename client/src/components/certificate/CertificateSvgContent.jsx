import React from "react";
import { wrapText } from "../../utils/svgTextLayout.js";
import CertificateSignatureBlock from "./CertificateSignatureBlock.jsx";

/**
 * Pure SVG Content Renderer for Certificate Text, Dividers, and Dynamic Signatures.
 * Uses ONLY native SVG elements (<g>, <text>, <tspan>, <line>, <circle>, <path>, <image>).
 */
function CertificateSvgContent({
  participantName = "Pritkumar Koradiya",
  organizationName = "School of Engineering, PP Savani University",
  eventName = "International Tech Summit 2026",
  certificateCategory = "Seminar",
  certificateTitle = "Certificate of Participation",
  eventDate = "2026-08-15",
  description = "for successfully attending and participating in the technical sessions and workshops.",
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
  theme = {}
}) {
  // Theme Color Scheme
  const titleColor = theme.titleColor || theme.primaryText || "#0f172a";
  const nameColor = theme.nameColor || theme.primaryText || "#0f172a";
  const bodyColor = theme.bodyColor || theme.secondaryText || "#334155";
  const mutedColor = theme.mutedColor || theme.secondaryText || "#64748b";
  const accentColor = theme.accentColor || theme.accent || "#1e3a8a";
  const borderColor = theme.borderColor || theme.line || "rgba(30,58,138,0.3)";

  // Resolved signature values with safe fallbacks
  const resolvedAuthorizedName = authorizedSignatureName || "Authorized Person";
  const resolvedAuthorizedMode = authorizedSignatureMode || "blank";
  const resolvedAuthorizedImage = authorizedSignatureImage || null;

  const resolvedDrName = drSignatureName || deanName || "Dr. Niraj Shah";
  const resolvedDrMode = drSignatureMode || "blank";
  const resolvedDrImage = drSignatureImage || null;

  const resolvedLayout = signatureLayout || "both";
  const resolvedPosition = singleSignaturePosition || "center";

  // Single signature position center-X helper
  const getSingleSignerX = (pos) => {
    if (pos === "left") return 330;
    if (pos === "right") return 1270;
    return 800; // "center"
  };

  // Date Formatting
  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      })
    : "August 15, 2026";

  // SVG Text Wrapping calculations
  const titleLayout = wrapText({
    text: certificateTitle || "Certificate of Participation",
    maxWidth: 1150,
    fontSize: 58,
    fontFamily: "serif",
    fontWeight: "900",
    maximumLines: 2
  });

  const nameLayout = wrapText({
    text: participantName || "Participant Name",
    maxWidth: 1080,
    fontSize: 78,
    fontFamily: "serif",
    fontWeight: "900",
    maximumLines: 2
  });

  const orgEventText = `for successful participation in ${eventName}${
    organizationName ? ` organized by ${organizationName}` : ""
  }`;
  const orgEventLayout = wrapText({
    text: orgEventText,
    maxWidth: 1100,
    fontSize: 25,
    fontFamily: "sans-serif",
    fontWeight: "700",
    maximumLines: 2
  });

  const descLayout = wrapText({
    text: description || "",
    maxWidth: 1150,
    fontSize: 22,
    fontFamily: "sans-serif",
    fontWeight: "500",
    maximumLines: 3
  });

  // Participant Baseline & Underline Positioning
  const isNameMultiLine = nameLayout.lines.length > 1;
  const nameFirstLineY = isNameMultiLine ? 425 : 465;
  const nameUnderlineY = isNameMultiLine ? 535 : 515;

  return (
    <g className="certificate-svg-content">
      {/* 1. CATEGORY LABEL (y = 145) */}
      {certificateCategory && (
        <text
          x="800"
          y="145"
          textAnchor="middle"
          fill={accentColor}
          fontSize="18"
          fontWeight="800"
          letterSpacing="4"
          className="uppercase"
        >
          {certificateCategory.toUpperCase()}
        </text>
      )}

      {/* 2. CERTIFICATE TITLE (y = 225) */}
      <text
        x="800"
        y="225"
        textAnchor="middle"
        fill={titleColor}
        fontSize={titleLayout.fontSize}
        fontFamily="serif"
        fontWeight="900"
      >
        {titleLayout.lines.map((line, idx) => (
          <tspan key={idx} x="800" dy={idx === 0 ? 0 : titleLayout.lineHeight}>
            {line}
          </tspan>
        ))}
      </text>

      {/* 3. DECORATIVE DIVIDER (y = 275) */}
      <line x1="560" y1="275" x2="1040" y2="275" stroke={borderColor} strokeWidth="2" />
      <circle cx="800" cy="275" r="5" fill={accentColor} />

      {/* 4. PRESENTED TO LABEL (y = 345) */}
      <text
        x="800"
        y="345"
        textAnchor="middle"
        fill={mutedColor}
        fontSize="18"
        fontWeight="800"
        letterSpacing="3"
      >
        THIS CERTIFICATE IS PROUDLY PRESENTED TO
      </text>

      {/* 5. PARTICIPANT NAME (y = nameFirstLineY) */}
      <text
        x="800"
        y={nameFirstLineY}
        textAnchor="middle"
        fill={nameColor}
        fontSize={nameLayout.fontSize}
        fontFamily="serif"
        fontWeight="900"
      >
        {nameLayout.lines.map((line, idx) => (
          <tspan key={idx} x="800" dy={idx === 0 ? 0 : nameLayout.lineHeight}>
            {line}
          </tspan>
        ))}
      </text>

      {/* 6. PARTICIPANT UNDERLINE (y = nameUnderlineY) */}
      <line
        x1="390"
        y1={nameUnderlineY}
        x2="1210"
        y2={nameUnderlineY}
        stroke={accentColor}
        strokeWidth="3"
        strokeOpacity="0.7"
      />

      {/* 7. ORGANIZATION & EVENT SENTENCE (y = 570) */}
      <text
        x="800"
        y="570"
        textAnchor="middle"
        fill={bodyColor}
        fontSize={orgEventLayout.fontSize}
        fontFamily="sans-serif"
        fontWeight="700"
      >
        {orgEventLayout.lines.map((line, idx) => (
          <tspan key={idx} x="800" dy={idx === 0 ? 0 : orgEventLayout.lineHeight}>
            {line}
          </tspan>
        ))}
      </text>

      {/* 8. EVENT DATE (y = 635) */}
      <text
        x="800"
        y="635"
        textAnchor="middle"
        fill={bodyColor}
        fontSize="20"
        fontFamily="sans-serif"
        fontWeight="700"
      >
        Given on <tspan fontWeight="800" fill={titleColor}>{formattedDate}</tspan>
      </text>

      {/* 9. DESCRIPTION (y = 715) */}
      {description && (
        <text
          x="800"
          y="715"
          textAnchor="middle"
          fill={mutedColor}
          fontSize={descLayout.fontSize}
          fontFamily="sans-serif"
          fontWeight="500"
        >
          {descLayout.lines.map((line, idx) => (
            <tspan key={idx} x="800" dy={idx === 0 ? 0 : descLayout.lineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      )}

      {/* 10. FOOTER DIVIDER (y = 840) */}
      <line x1="170" y1="840" x2="1430" y2="840" stroke={borderColor} strokeWidth="1.5" />

      {/* 11. FOOTER SIGNATURES & CERTIFICATE ID (NO SEAL) */}

      {/* Authorized Person Signature Block */}
      {(resolvedLayout === "both" || resolvedLayout === "authorized-only") && (
        <CertificateSignatureBlock
          isSvg={true}
          personName={resolvedAuthorizedName}
          signatureMode={resolvedAuthorizedMode}
          signatureImage={resolvedAuthorizedImage}
          subtitle="Authorized Signature"
          lineColor={titleColor}
          textColor={titleColor}
          subtitleColor={mutedColor}
          centerX={resolvedLayout === "both" ? 330 : getSingleSignerX(resolvedPosition)}
          yOffset={855}
        />
      )}

      {/* Dr. Niraj Shah Signature Block */}
      {(resolvedLayout === "both" || resolvedLayout === "dr-only") && (
        <CertificateSignatureBlock
          isSvg={true}
          personName={resolvedDrName}
          signatureMode={resolvedDrMode}
          signatureImage={resolvedDrImage}
          subtitle="Dean, SOE"
          lineColor={titleColor}
          textColor={titleColor}
          subtitleColor={mutedColor}
          centerX={resolvedLayout === "both" ? 1270 : getSingleSignerX(resolvedPosition)}
          yOffset={855}
        />
      )}

      {/* Centered Certificate ID */}
      <text
        x="800"
        y={resolvedLayout !== "both" && resolvedPosition === "center" ? "1010" : "955"}
        textAnchor="middle"
        fill={mutedColor}
        fontSize="16"
        fontFamily="monospace"
        fontWeight="700"
      >
        {certificateId}
      </text>
    </g>
  );
}

export default CertificateSvgContent;

