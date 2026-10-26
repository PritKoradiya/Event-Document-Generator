import React, { forwardRef } from "react";
import {
  PPSU_EXPERT_TALK_LAYOUT,
  calculatePpsuDynamicLayout
} from "../../utils/ppsuPosterLayout.js";

/**
 * PpsuExpertTalkPosterSvg
 * Pure, centralized SVG renderer for the official PPSU Expert Talk Poster.
 * All dynamic overlays are computed via PPSU_EXPERT_TALK_LAYOUT in ppsuPosterLayout.js.
 */
const PpsuExpertTalkPosterSvg = forwardRef(function PpsuExpertTalkPosterSvg(
  {
    id = "ppsu-expert-talk-svg",
    eventType = "",
    mainTitle = "",
    eventDate = "",
    eventTime = "",
    venue = "",
    speaker = "",
    speakerPhoto = "",
    themeBackground = PPSU_EXPERT_TALK_LAYOUT.canvas.themeBackground
  },
  ref
) {
  const { eventTypeLayout, titleLayout, speakerLayout, coords } =
    calculatePpsuDynamicLayout({
      eventType,
      mainTitle,
      eventDate,
      eventTime,
      venue,
      speaker
    });

  const titleLinesCount = titleLayout.lines.length;
  const { colors, canvas } = PPSU_EXPERT_TALK_LAYOUT;

  return (
    <svg
      id={id}
      ref={ref}
      viewBox={`0 0 ${canvas.width} ${canvas.height}`}
      width={canvas.width}
      height={canvas.height}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      preserveAspectRatio="xMidYMid meet"
      className="poster-svg ppsu-expert-talk-svg"
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      <defs>
        {/* Dynamic clip path for rounded speaker photo */}
        <clipPath id="ppsu-speaker-photo-clip">
          <rect
            x={coords.photoX}
            y={coords.photoY}
            width={coords.photoWidth}
            height={coords.photoHeight}
            rx={coords.photoRx}
            ry={coords.photoRy}
          />
        </clipPath>
      </defs>

      {/* 1. FIXED THEME BACKGROUND (Header + Middle Tech HUD + Dark Blue Section + Cream Footer) */}
      <image
        href={themeBackground}
        x="0"
        y="0"
        width={canvas.width}
        height={canvas.height}
        preserveAspectRatio="none"
      />

      {/* 2. DYNAMIC EVENT TYPE PILL (Shape + Centered Text) */}
      {eventTypeLayout.text && (
        <g className="ppsu-event-type-pill-group">
          {/* Dynamic white rounded pill - expands gracefully for longer text */}
          <rect
            x={coords.pillX}
            y={coords.pillY}
            width={coords.pillWidth}
            height={coords.pillHeight}
            rx={coords.pillRx}
            ry={coords.pillRx}
            fill="#FFFFFF"
          />
          <text
            x={coords.pillCenterX}
            y={coords.pillCenterY}
            textAnchor="middle"
            dominantBaseline="central"
            fill={colors.darkText}
            fontSize={eventTypeLayout.fontSize}
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="0.5"
          >
            {eventTypeLayout.text}
          </text>
        </g>
      )}

      {/* 3. DYNAMIC MAIN TITLE */}
      {titleLayout.lines.length > 0 && (
        <g className="ppsu-main-title-group">
          {titleLayout.lines.map((line, idx) => {
            // Reference style: First line(s) in Gold (#FFC72C), subsequent in White (#FFFFFF)
            const isGold = titleLinesCount <= 2 ? idx === 0 : idx < 2;
            const fillColor = isGold ? colors.gold : colors.white;

            return (
              <text
                key={`title-line-${idx}`}
                x={coords.titleX}
                y={coords.titleStartY + idx * coords.titleLineHeight}
                fill={fillColor}
                fontSize={titleLayout.fontSize}
                fontWeight="900"
                fontFamily="system-ui, -apple-system, sans-serif"
                letterSpacing="-0.5"
              >
                {line}
              </text>
            );
          })}
        </g>
      )}

      {/* 4. DYNAMIC EVENT DETAILS (Date, Time, Venue) */}
      <g className="ppsu-event-details-group">
        {eventDate && (
          <text
            x={coords.metaX}
            y={coords.dateY}
            fontSize={coords.metaFontSize}
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            <tspan fill={colors.gold} fontWeight="800">
              Date:{" "}
            </tspan>
            <tspan fill={colors.white} fontWeight="600">
              {eventDate}
            </tspan>
          </text>
        )}

        {eventTime && (
          <text
            x={coords.metaX}
            y={coords.timeY}
            fontSize={coords.metaFontSize}
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            <tspan fill={colors.gold} fontWeight="800">
              Time:{" "}
            </tspan>
            <tspan fill={colors.white} fontWeight="600">
              {eventTime}
            </tspan>
          </text>
        )}

        {venue && (
          <text
            x={coords.metaX}
            y={coords.venueY}
            fontSize={coords.metaFontSize}
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            <tspan fill={colors.gold} fontWeight="800">
              Venue:{" "}
            </tspan>
            <tspan fill={colors.white} fontWeight="600">
              {venue}
            </tspan>
          </text>
        )}
      </g>

      {/* 5. SPEAKER SECTION */}
      {/* SPEAKER : Header */}
      <text
        x={coords.speakerAnchorX}
        y={coords.speakerHeaderY}
        textAnchor="end"
        fill={colors.white}
        fontSize={coords.speakerHeaderFontSize}
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing={coords.speakerHeaderLetterSpacing}
      >
        SPEAKER :
      </text>

      {/* Speaker Information (Name + Details lines) */}
      {(speakerLayout.name || speakerLayout.detailsLines.length > 0) && (
        <g className="ppsu-speaker-info-group">
          {/* Speaker Name */}
          {speakerLayout.name && (
            <text
              x={coords.speakerAnchorX}
              y={coords.speakerNameY}
              textAnchor="end"
              fill={colors.white}
              fontSize={speakerLayout.nameFontSize}
              fontWeight="800"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {speakerLayout.name}
            </text>
          )}

          {/* Speaker Details */}
          {speakerLayout.detailsLines.map((line, idx) => (
            <text
              key={`speaker-detail-${idx}`}
              x={coords.speakerAnchorX}
              y={coords.speakerDetailsStartY + idx * coords.speakerDetailsLineSpacing}
              textAnchor="end"
              fill={colors.softWhite}
              fontSize={speakerLayout.detailsFontSize}
              fontWeight="600"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {line}
            </text>
          ))}
        </g>
      )}

      {/* 6. SPEAKER PHOTO */}
      {speakerPhoto && (
        <g className="ppsu-speaker-photo-group">
          <image
            href={speakerPhoto}
            x={coords.photoX}
            y={coords.photoY}
            width={coords.photoWidth}
            height={coords.photoHeight}
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#ppsu-speaker-photo-clip)"
          />
          {/* Subtle frame border for smooth photo edges */}
          <rect
            x={coords.photoX}
            y={coords.photoY}
            width={coords.photoWidth}
            height={coords.photoHeight}
            rx={coords.photoRx}
            ry={coords.photoRy}
            fill="none"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="2"
          />
        </g>
      )}
    </svg>
  );
});

export default React.memo(PpsuExpertTalkPosterSvg);

