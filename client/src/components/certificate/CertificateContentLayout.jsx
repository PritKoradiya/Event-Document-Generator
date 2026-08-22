import React from "react";
import {
  getParticipantNameSize,
  getCertificateTitleSize,
  getDescriptionSize
} from "../../utils/certificateTextSizing.js";
import CertificateSignatureBlock from "./CertificateSignatureBlock.jsx";

function CertificateContentLayout({
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
  isDarkTheme = false,
  themeColors = {}
}) {
  // Theme Color Overrides
  const primaryTextColor = themeColors.primaryText || (isDarkTheme ? "#f8fafc" : "#0f172a");
  const secondaryTextColor = themeColors.secondaryText || (isDarkTheme ? "#cbd5e1" : "#475569");
  const accentColor = themeColors.accent || (isDarkTheme ? "#fbbf24" : "#1e3a8a");
  const lineColor = themeColors.line || (isDarkTheme ? "rgba(251,191,36,0.4)" : "rgba(30,58,138,0.25)");

  // Dynamic Font Sizes
  const nameStyle = getParticipantNameSize(participantName);
  const titleStyle = getCertificateTitleSize(certificateTitle);
  const descStyle = getDescriptionSize(description);

  const displayCategory = (certificateCategory || category || "").trim();
  const resolvedPosition = singleSignaturePosition || "center";

  // Resolve signature boxes
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

  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      })
    : "August 15, 2026";

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col justify-between pointer-events-none select-none"
      style={{
        paddingTop: "80px",
        paddingBottom: "75px",
        paddingLeft: "110px",
        paddingRight: "110px"
      }}
    >
      {/* ROW 1: HEADER SECTION */}
      <div className="flex flex-col items-center justify-center text-center">
        {displayCategory && (
          <span
            className="text-[19px] font-black uppercase tracking-[0.3em] mb-2"
            style={{ color: accentColor }}
          >
            {displayCategory.toUpperCase()}
          </span>
        )}

        <h1
          className="font-serif font-black uppercase tracking-tight"
          style={{
            color: primaryTextColor,
            fontSize: titleStyle.fontSize,
            lineHeight: titleStyle.lineHeight
          }}
        >
          {certificateTitle || "Certificate of Participation"}
        </h1>

        <div className="mt-3 flex items-center gap-3 w-72 justify-center">
          <div className="h-0.5 flex-1" style={{ background: lineColor }} />
          <div className="h-2 w-2 rounded-full" style={{ background: accentColor }} />
          <div className="h-0.5 flex-1" style={{ background: lineColor }} />
        </div>
      </div>

      {/* ROW 2: RECIPIENT SECTION */}
      <div className="flex flex-col items-center justify-center text-center my-auto">
        <p
          className="text-[20px] font-extrabold uppercase tracking-[0.2em] mb-2"
          style={{ color: secondaryTextColor }}
        >
          THIS CERTIFICATE IS PROUDLY PRESENTED TO
        </p>

        <div className="max-w-[1200px] px-4 my-1">
          <h2
            className="font-serif font-black tracking-normal text-center leading-tight overflow-hidden line-clamp-2"
            style={{
              color: primaryTextColor,
              fontSize: nameStyle.fontSize,
              lineHeight: nameStyle.lineHeight,
              wordBreak: "break-word"
            }}
          >
            {participantName || "Participant Name"}
          </h2>
        </div>

        {/* Recipient Underline */}
        <div
          className="my-3 h-1 w-96 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`
          }}
        />

        {(eventName || organizationName) && (
          <p
            className="text-[22px] font-bold tracking-wide max-w-[1100px] leading-snug"
            style={{ color: secondaryTextColor }}
          >
            for successful participation in{" "}
            <span className="font-extrabold" style={{ color: primaryTextColor }}>
              {eventName}
            </span>
            {organizationName ? ` organized by ${organizationName}` : ""}
          </p>
        )}
      </div>

      {/* ROW 3: MESSAGE & DATE SECTION */}
      <div className="flex flex-col items-center justify-center text-center my-auto">
        {description && (
          <p
            className="max-w-[1050px] font-medium leading-relaxed line-clamp-3 text-center"
            style={{
              color: secondaryTextColor,
              fontSize: descStyle.fontSize,
              lineHeight: descStyle.lineHeight
            }}
          >
            {description}
          </p>
        )}

        <div className="mt-2 text-[19px] font-bold" style={{ color: secondaryTextColor }}>
          Given on <span className="font-extrabold" style={{ color: primaryTextColor }}>{formattedDate}</span>
        </div>
      </div>

      {/* ROW 4: FOOTER SECTION (NO CERTIFICATE ID, NO SEAL) */}
      {boxes.length > 0 && (
        <div
          className={`flex items-end pt-4 border-t ${
            boxes.length === 1
              ? resolvedPosition === "left"
                ? "justify-start"
                : resolvedPosition === "right"
                ? "justify-end"
                : "justify-center"
              : "justify-between"
          }`}
          style={{ borderColor: lineColor }}
        >
          {boxes.map((box, index) => (
            <CertificateSignatureBlock
              key={index}
              personName={box.signerName}
              subtitle={box.signerDesignation}
              signatureMode={box.signatureMode}
              signatureImage={box.signatureImage}
              lineColor={primaryTextColor}
              textColor={primaryTextColor}
              subtitleColor={secondaryTextColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CertificateContentLayout;
