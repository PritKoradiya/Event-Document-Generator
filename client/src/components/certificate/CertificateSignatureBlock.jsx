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
  if (isSvg) {
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
        <text
          x={centerX}
          y={yOffset + 100}
          textAnchor="middle"
          fill={textColor}
          fontSize="18"
          fontWeight="800"
        >
          {personName ? personName.toUpperCase() : ""}
        </text>

        {/* Subtitle */}
        {subtitle && (
          <text
            x={centerX}
            y={yOffset + 125}
            textAnchor="middle"
            fill={subtitleColor}
            fontSize="15"
            fontWeight="700"
          >
            {subtitle}
          </text>
        )}
      </g>
    );
  }

  // HTML Layout Fallback
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {/* Signature Image or Blank space */}
      <div className="h-16 w-48 flex items-center justify-center mb-1">
        {signatureMode === "image" && signatureImage ? (
          <img
            src={signatureImage}
            alt={personName}
            className="max-h-full max-w-full object-contain pointer-events-none select-none"
          />
        ) : null}
      </div>

      {/* Signature Line */}
      <div className="h-0.5 w-48 mb-1.5" style={{ background: lineColor, opacity: 0.6 }} />

      {/* Person Name */}
      <span className="text-[17px] font-black uppercase tracking-wider" style={{ color: textColor }}>
        {personName}
      </span>

      {/* Subtitle */}
      {subtitle && (
        <span className="text-[15px] font-bold" style={{ color: subtitleColor }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}

export default CertificateSignatureBlock;
