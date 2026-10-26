import React from "react";
import { wrapText } from "../../utils/svgTextLayout.js";
import { getCertificateTypography } from "../../utils/certificateTypography.js";
import CertificateSignatureBlock from "./CertificateSignatureBlock.jsx";

/**
 * Pure SVG Content Renderer for Certificate Text, Dividers, and Dynamic Signatures.
 * Uses ONLY native SVG elements (<g>, <text>, <tspan>, <line>, <circle>, <path>, <image>).
 */
function CertificateSvgContent({
  participantName = "Pritkumar Koradiya",
  organizationName = "School of Engineering, PP Savani University",
  eventName = "International Tech Summit 2026",
  certificateCategory = "",
  category = "",
  certificateTitle = "Certificate of Participation",
  eventDate = "2026-08-15",
  description = "for successfully attending and participating in the technical sessions and workshops.",
  certificateId = "",
  signatureBoxes = null,
  singleSignaturePosition = "center",
  drSignatureName,
  drSignatureMode,
  drSignatureImage,
  authorizedSignatureName,
  authorizedSignatureMode,
  authorizedSignatureImage,
  signatureLayout,
  deanName,
  theme = {},
  template = null,
  templateStyle = "",
  designKey = "",
  backgroundImage = ""
}) {
  // Theme Color Scheme
  const titleColor = theme.titleColor || theme.primaryText || "#0f172a";
  const nameColor = theme.nameColor || theme.primaryText || "#0f172a";
  const bodyColor = theme.bodyColor || theme.secondaryText || "#334155";
  const mutedColor = theme.mutedColor || theme.secondaryText || "#64748b";
  const accentColor = theme.accentColor || theme.accent || "#1e3a8a";
  const borderColor = theme.borderColor || theme.line || "rgba(30,58,138,0.3)";

  const displayCategory = (certificateCategory || category || "").trim();
  const resolvedPosition = singleSignaturePosition || "center";

  // Resolve template typography profile
  const templateRef = template || { templateStyle, designKey, backgroundImage };
  const typo = getCertificateTypography(templateRef);
  const isPpsu = typo.isPpsu;

  // Resolve signature boxes array: use signatureBoxes if provided, else fallback to legacy layout
  const boxes = (() => {
    if (Array.isArray(signatureBoxes)) {
      return signatureBoxes;
    }
    if (signatureLayout === "dr-only") {
      return [
        {
          signerName: drSignatureName || deanName || "Dr. Niraj Shah",
          signerDesignation: "Dean, SOE",
          signatureMode: drSignatureMode || "blank",
          signatureImage: drSignatureImage || null
        }
      ];
    }
    if (signatureLayout === "authorized-only") {
      return [
        {
          signerName: authorizedSignatureName || "Authorized Person",
          signerDesignation: "Authorized Signature",
          signatureMode: authorizedSignatureMode || "blank",
          signatureImage: authorizedSignatureImage || null
        }
      ];
    }
    if (signatureLayout === "both") {
      return [
        {
          signerName: authorizedSignatureName || "Authorized Person",
          signerDesignation: "Authorized Signature",
          signatureMode: authorizedSignatureMode || "blank",
          signatureImage: authorizedSignatureImage || null
        },
        {
          signerName: drSignatureName || deanName || "Dr. Niraj Shah",
          signerDesignation: "Dean, SOE",
          signatureMode: drSignatureMode || "blank",
          signatureImage: drSignatureImage || null
        }
      ];
    }
    return [];
  })();

  // Date Formatting
  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      })
    : "August 15, 2026";

  // SVG Text Wrapping calculations with adaptive typography
  const titleLayout = wrapText({
    text: certificateTitle || "Certificate of Participation",
    maxWidth: typo.title.maxWidth,
    fontSize: typo.title.preferredSize,
    fontFamily: typo.title.fontFamily,
    fontWeight: typo.title.fontWeight,
    maximumLines: typo.title.maximumLines
  });

  const nameLayout = wrapText({
    text: participantName || "Participant Name",
    maxWidth: typo.name.maxWidth,
    fontSize: typo.name.preferredSize,
    fontFamily: typo.name.fontFamily,
    fontWeight: typo.name.fontWeight,
    maximumLines: typo.name.maximumLines
  });

  const orgEventText = `for successful participation in ${eventName}${
    organizationName ? ` organized by ${organizationName}` : ""
  }`;
  const orgEventLayout = wrapText({
    text: orgEventText,
    maxWidth: typo.eventLine.maxWidth,
    fontSize: typo.eventLine.preferredSize,
    fontFamily: typo.eventLine.fontFamily,
    fontWeight: typo.eventLine.fontWeight,
    maximumLines: typo.eventLine.maximumLines
  });

  const descLayout = wrapText({
    text: description || "",
    maxWidth: typo.description.maxWidth,
    fontSize: typo.description.preferredSize,
    fontFamily: typo.description.fontFamily,
    fontWeight: typo.description.fontWeight,
    maximumLines: typo.description.maximumLines
  });

  // Participant Baseline & Underline Positioning
  const isNameMultiLine = nameLayout.lines.length > 1;
  const nameFirstLineY = isNameMultiLine ? typo.name.multiLineY : typo.name.singleLineY;
  const nameUnderlineY = isNameMultiLine ? typo.name.multiLineUnderlineY : typo.name.singleLineUnderlineY;

  return (
    <g className="certificate-svg-content">
      {/* 1. CATEGORY LABEL (Dynamic selected category heading) */}
      {displayCategory && (
        <text
          x="800"
          y={typo.category.y}
          textAnchor="middle"
          fill={accentColor}
          fontSize={typo.category.fontSize}
          fontWeight={typo.category.fontWeight}
          letterSpacing={typo.category.letterSpacing}
          className="uppercase"
        >
          {displayCategory.toUpperCase()}
        </text>
      )}

      {/* 2. CERTIFICATE TITLE */}
      <text
        x="800"
        y={typo.title.y}
        textAnchor="middle"
        fill={titleColor}
        fontSize={titleLayout.fontSize}
        fontFamily={typo.title.fontFamily}
        fontWeight={typo.title.fontWeight}
      >
        {titleLayout.lines.map((line, idx) => (
          <tspan key={idx} x="800" dy={idx === 0 ? 0 : titleLayout.lineHeight}>
            {line}
          </tspan>
        ))}
      </text>

      {/* 3. DECORATIVE DIVIDER */}
      <line
        x1={typo.divider.x1}
        y1={typo.divider.y}
        x2={typo.divider.x2}
        y2={typo.divider.y}
        stroke={borderColor}
        strokeWidth={typo.divider.strokeWidth}
      />
      <circle cx="800" cy={typo.divider.y} r={typo.divider.circleR} fill={accentColor} />

      {/* 4. PRESENTED TO LABEL */}
      <text
        x="800"
        y={typo.kicker.y}
        textAnchor="middle"
        fill={mutedColor}
        fontSize={typo.kicker.fontSize}
        fontWeight={typo.kicker.fontWeight}
        letterSpacing={typo.kicker.letterSpacing}
      >
        {typo.kicker.text}
      </text>

      {/* 5. PARTICIPANT NAME */}
      <text
        x="800"
        y={nameFirstLineY}
        textAnchor="middle"
        fill={nameColor}
        fontSize={nameLayout.fontSize}
        fontFamily={typo.name.fontFamily}
        fontWeight={typo.name.fontWeight}
      >
        {nameLayout.lines.map((line, idx) => (
          <tspan key={idx} x="800" dy={idx === 0 ? 0 : nameLayout.lineHeight}>
            {line}
          </tspan>
        ))}
      </text>

      {/* 6. PARTICIPANT UNDERLINE */}
      <line
        x1={typo.name.underlineX1}
        y1={nameUnderlineY}
        x2={typo.name.underlineX2}
        y2={nameUnderlineY}
        stroke={accentColor}
        strokeWidth={typo.name.underlineStrokeWidth}
        strokeOpacity="0.7"
      />

      {/* 7. ORGANIZATION & EVENT SENTENCE */}
      <text
        x="800"
        y={typo.eventLine.y}
        textAnchor="middle"
        fill={bodyColor}
        fontSize={orgEventLayout.fontSize}
        fontFamily={typo.eventLine.fontFamily}
        fontWeight={typo.eventLine.fontWeight}
      >
        {orgEventLayout.lines.map((line, idx) => (
          <tspan key={idx} x="800" dy={idx === 0 ? 0 : orgEventLayout.lineHeight}>
            {line}
          </tspan>
        ))}
      </text>

      {/* 8. EVENT DATE */}
      <text
        x="800"
        y={typo.date.y}
        textAnchor="middle"
        fill={bodyColor}
        fontSize={typo.date.fontSize}
        fontFamily={typo.date.fontFamily}
        fontWeight={typo.date.fontWeight}
      >
        Given on <tspan fontWeight="800" fill={titleColor}>{formattedDate}</tspan>
      </text>

      {/* 9. DESCRIPTION */}
      {description && (
        <text
          x="800"
          y={typo.description.y}
          textAnchor="middle"
          fill={mutedColor}
          fontSize={descLayout.fontSize}
          fontFamily={typo.description.fontFamily}
          fontWeight={typo.description.fontWeight}
        >
          {descLayout.lines.map((line, idx) => (
            <tspan key={idx} x="800" dy={idx === 0 ? 0 : descLayout.lineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      )}

      {/* 10. FOOTER DIVIDER - Only show when at least 1 signature block exists */}
      {boxes.length > 0 && (
        <line
          x1={typo.footerDivider.x1}
          y1={typo.footerDivider.y}
          x2={typo.footerDivider.x2}
          y2={typo.footerDivider.y}
          stroke={borderColor}
          strokeWidth={typo.footerDivider.strokeWidth}
        />
      )}

      {/* 11. DYNAMIC FOOTER SIGNATURE BLOCKS (NO CERTIFICATE ID, NO SEAL) */}
      {boxes.map((box, index) => {
        let centerX = 800;
        if (boxes.length === 1) {
          if (resolvedPosition === "left") centerX = 330;
          else if (resolvedPosition === "right") centerX = 1270;
          else centerX = 800; // "center"
        } else if (boxes.length === 2) {
          if (index === 0) centerX = 350;
          else centerX = 1250;
        } else if (boxes.length === 3) {
          if (index === 0) centerX = 300;
          else if (index === 1) centerX = 800;
          else centerX = 1300;
        }

        return (
          <CertificateSignatureBlock
            key={index}
            isSvg={true}
            isPpsu={isPpsu}
            personName={box.signerName}
            subtitle={box.signerDesignation}
            signatureMode={box.signatureMode}
            signatureImage={box.signatureImage}
            lineColor={titleColor}
            textColor={titleColor}
            subtitleColor={mutedColor}
            centerX={centerX}
            yOffset={typo.signature.yOffset}
            lineWidth={typo.signature.lineWidth}
            nameFontSizeFn={typo.signature.getNameFontSize}
            subtitleFontSizeFn={typo.signature.getSubtitleFontSize}
          />
        );
      })}
    </g>
  );
}

export default CertificateSvgContent;
