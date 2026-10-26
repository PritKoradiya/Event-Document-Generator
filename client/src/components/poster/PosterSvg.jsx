import React, { forwardRef, useEffect } from "react";
import posterData from "../../data/posterData.js";
import PosterSvgFrame from "./PosterSvgFrame.jsx";
import PosterSvgMedia from "./PosterSvgMedia.jsx";
import PosterSvgContent from "./PosterSvgContent.jsx";
import PosterSvgForeground from "./PosterSvgForeground.jsx";
import PpsuExpertTalkPosterSvg from "./PpsuExpertTalkPosterSvg.jsx";
import { validatePosterLayout } from "../../utils/validatePosterLayout.js";

const templateMap = posterData.reduce((acc, item) => {
  acc[item.designKey] = item;
  acc[item.name] = item;
  return acc;
}, {});

const PosterSvg = forwardRef(function PosterSvg(
  {
    id = "poster-svg-canvas",
    posterFormat = "standard",
    eventType = "",
    mainTitle = "",
    speaker = "",
    speakerPhoto = "",
    posterTitle = "ANNUAL INNOVATION & TECH SUMMIT 2026",
    tagline = "Empowering Next-Gen Innovators & Leaders",
    category = "Seminar",
    eventDate = "2026-08-15",
    eventTime = "10:00 AM - 04:00 PM",
    venue = "Main Auditorium, PP Savani University",
    speakerName = "Dr. Pritkumar Koradiya",
    speakerDesignation = "AI & Cloud Architecture Specialist",
    organizerName = "School of Engineering & Tech Club",
    description = "Join us for an immersive day of insightful technical talks, hands-on demonstrations, collaborative activities, and networking opportunities with leading industry professionals.",
    contactInformation = "+91 98765 43210 | info@ppsu.ac.in",
    registrationText = "Free Entry • Scan QR to Register Online",
    templateStyle = "Seminar Poster",
    designKey = "seminar-poster",
    posterImage = "",
    organizationLogo = "",
    posterId = "POSTER-2026-0001"
  },
  ref
) {
  const isPpsuFormat =
    posterFormat === "ppsu-expert-talk" ||
    designKey === "ppsu-expert-talk" ||
    templateStyle === "PPSU Expert Talk Poster";

  if (isPpsuFormat) {
    return (
      <PpsuExpertTalkPosterSvg
        ref={ref}
        id={id}
        eventType={eventType || (category === "Seminar" ? "Expert Talk" : category)}
        mainTitle={mainTitle || posterTitle}
        eventDate={eventDate}
        eventTime={eventTime}
        venue={venue}
        speaker={
          speaker ||
          (speakerName
            ? `${speakerName}${speakerDesignation ? `\n${speakerDesignation}` : ""}`
            : "")
        }
        speakerPhoto={speakerPhoto}
      />
    );
  }

  const currentConfig =
    templateMap[designKey] ||
    templateMap[templateStyle] ||
    posterData[0];

  const theme = currentConfig.theme || posterData[0].theme;
  const layoutVariant = currentConfig.layoutVariant || "classic";

  useEffect(() => {
    validatePosterLayout({
      posterTitle,
      tagline,
      category,
      templateStyle,
      designKey
    });
  }, [posterTitle, tagline, category, templateStyle, designKey]);

  return (
    <svg
      id={id}
      ref={ref}
      viewBox="0 0 1080 1350"
      width="1080"
      height="1350"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      preserveAspectRatio="xMidYMid meet"
      className="poster-svg"
      style={{ display: "block", width: "100%", height: "auto" }}
    >
      {/* Layer 1: Background & Structural Shapes */}
      <PosterSvgFrame theme={theme} layoutVariant={layoutVariant} />

      {/* Layer 2: Uploaded Media & Logos */}
      <PosterSvgMedia
        posterImage={posterImage}
        organizationLogo={organizationLogo}
        theme={theme}
      />

      {/* Layer 3: Dynamic Poster Content & Text */}
      <PosterSvgContent
        posterTitle={posterTitle}
        tagline={tagline}
        category={category || currentConfig.category}
        eventDate={eventDate}
        eventTime={eventTime}
        venue={venue}
        speakerName={speakerName}
        speakerDesignation={speakerDesignation}
        organizerName={organizerName}
        description={description}
        contactInformation={contactInformation}
        registrationText={registrationText}
        posterId={posterId}
        theme={theme}
      />

      {/* Layer 4: Non-Overlapping Foreground Accents */}
      <PosterSvgForeground theme={theme} layoutVariant={layoutVariant} />
    </svg>
  );
});

export default React.memo(PosterSvg);
