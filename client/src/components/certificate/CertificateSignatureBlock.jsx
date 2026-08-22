import React from "react";

/**
 * Reusable Signature Block Component.
 * Supports both HTML (div) and SVG (g) context via `isSvg` prop.
 */
function CertificateSignatureBlock({
  personName = "",
  signatureMode = "blank",
  signatureImage = null,
  subtitle = "",
  lineColor = "#0f172a",
  textColor = "#0f172a",
  subtitleColor = "#64748b",
  className = "",
  isSvg = false,
  centerX = 330,
  yOffset = 855
}) {
  const cleanName = typeof personName === "string" ? personName.trim() : "";
  const cleanSubtitle = typeof subtitle === "string" ? subtitle.trim() : "";

  // Calculate dynamic font sizes for SVG mode based on text length to prevent overflow
  const getNameFontSize = (text) => {
    const len = text.length;
    if (len > 32) return 13;
    if (len > 24) return 15;
    if (len > 18) return 16;
    return 18;
  };

  const getSubtitleFontSize = (text) => {
    const len = text.length;
    if (len > 36) return 11;
    if (len > 26) return 13;
    if (len > 18) return 14;
    return 15;
  };

  if (isSvg) {
    const nameFontSize = getNameFontSize(cleanName);
    const subtitleFontSize = getSubtitleFontSize(cleanSubtitle);

    return (
      <g className={`signature-block ${className}`}>
        {/* Render uploaded image only when mode is "image" and signatureImage exists */}
        {signatureMode === "image" && signatureImage ? (
          <image
            href={signatureImage}
            x={centerX - 100}
            y={yOffset}
            width="200"
            height="65"
            preserveAspectRatio="xMidYMid meet"
          />
        ) : null}

        {/* Signature Line */}
        <line
          x1={centerX - 110}
          y1={yOffset + 70}
          x2={centerX + 110}
          y2={yOffset + 70}
          stroke={lineColor}
          strokeWidth="2"
          strokeOpacity="0.6"
        />

        {/* Person Name (normal clean text, NOT handwritten graphic) */}
        {cleanName && (
          <text
            x={centerX}
            y={yOffset + 98}
            textAnchor="middle"
            fill={textColor}
            fontSize={nameFontSize}
            fontWeight="800"
            fontFamily="sans-serif"
          >
            {cleanName.toUpperCase()}
          </text>
        )}

        {/* Subtitle / Designation */}
        {cleanSubtitle && (
          <text
            x={centerX}
            y={yOffset + 122}
            textAnchor="middle"
            fill={subtitleColor}
            fontSize={subtitleFontSize}
            fontWeight="700"
            fontFamily="sans-serif"
          >
            {cleanSubtitle}
          </text>
        )}
      </g>
    );
  }

  // HTML Layout Fallback
  return (
    <div className={`flex flex-col items-center text-center max-w-[240px] ${className}`}>
      {/* Signature Image or Blank space */}
      <div className="h-16 w-48 flex items-center justify-center mb-1">
        {signatureMode === "image" && signatureImage ? (
          <img
            src={signatureImage}
            alt={cleanName}
            className="max-h-full max-w-full object-contain pointer-events-none select-none"
          />
        ) : null}
      </div>

      {/* Signature Line */}
      <div className="h-0.5 w-48 mb-1.5" style={{ background: lineColor, opacity: 0.6 }} />

      {/* Person Name */}
      {cleanName && (
        <span
          className="text-[16px] font-black uppercase tracking-wider leading-tight text-center break-words max-w-full"
          style={{ color: textColor }}
        >
          {cleanName}
        </span>
      )}

      {/* Subtitle / Designation */}
      {cleanSubtitle && (
        <span
          className="text-[14px] font-bold leading-tight text-center break-words max-w-full mt-0.5"
          style={{ color: subtitleColor }}
        >
          {cleanSubtitle}
        </span>
      )}
    </div>
  );
}

export default CertificateSignatureBlock;
