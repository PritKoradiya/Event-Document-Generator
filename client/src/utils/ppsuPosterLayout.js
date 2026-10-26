import { wrapText, fitTextSize, measureTextWidth } from "./posterSvgTextLayout.js";

/**
 * PPSU_EXPERT_TALK_LAYOUT
 * ONE authoritative, centralized layout configuration for the PPSU Expert Talk Poster dynamic overlays.
 * Coordinate system is strictly based on the 1447 x 2048 native design canvas matching target reference.
 */
export const PPSU_EXPERT_TALK_LAYOUT = {
  canvas: {
    width: 1447,
    height: 2048,
    themeBackground: "/poster-themes/ppsu-expert-talk/Untitled-design.png"
  },

  // Official PPSU Branding palette
  colors: {
    gold: "#FFC72C",
    goldAccent: "#FDB813",
    white: "#FFFFFF",
    softWhite: "#F1F5F9",
    darkText: "#0F172A",
    cardBg: "#0C1E3C",
    border: "rgba(255, 255, 255, 0.2)"
  },

  // Safe dynamic area bounds (Region B)
  bounds: {
    minY: 310, // Below fixed top header
    footerTopY: 1640, // Fixed cream footer begins at y=1640
    safeMaxY: 1590 // Dynamic content must stay above 1590
  },

  // Event Type Pill (Cream/White pill in upper-left region below header)
  eventType: {
    x: 116,
    y: 360,
    width: 416,
    height: 98,
    centerX: 324,
    centerY: 409,
    rx: 49,
    maxWidth: 875,
    fontSize: 34,
    minFontSize: 22
  },

  // Main Title Zone (Fills available space between Event Type and Speaker Section)
  title: {
    x: 100,
    top: 490, // EventTypeBottom (360 + 98 = 458) + controlled gap (32)
    gapFromPill: 32, // Controlled gap 20-35 native units
    maxWidth: 815,
    maxHeight: 590, // Available height: speakerSafeTop (1115) - safetyGap (35) - top (490) = 590
    maxFontSize: 72,
    minFontSize: 22,
    lineHeightFactor: 1.08,
    safetyGap: 35
  },

  // Event Metadata (Date, Time, Venue in lower-left marked blue area above cream footer)
  eventMeta: {
    x: 100,
    y: 1440,
    width: 560,
    fontSize: 24, // Refined larger readable size (22-26px range)
    lineHeight: 42, // Compact row spacing (18px baseline gap)
    rowGap: 18,
    labelWeight: "800",
    valueWeight: "600",
    safeFooterMargin: 70
  },

  // Speaker Section (Fixed anchored position in lower-middle dynamic region)
  speaker: {
    textAnchorX: 965,
    minTopY: 1115,
    maxBottomY: 1590,
    safeTop: 1115,

    // Header "SPEAKER :"
    headerOffsetFromPhotoTop: 40,
    headerFontSize: 42,
    headerLetterSpacing: "2",

    // Speaker Name
    gapHeaderToName: 46,
    nameFontSize: 34,
    nameFontSizeLong: 28,

    // Speaker Details lines
    gapNameToDetails: 40,
    detailsFontSize: 22,
    detailsLineSpacing: 32,
    detailsMaxWidth: 580
  },

  // Speaker Photo Frame (Fixed anchored position on right side)
  speakerPhoto: {
    x: 1000,
    y: 1115,
    width: 350,
    height: 435,
    rx: 44,
    ry: 44
  }
};

// Aliases for backward compatibility
PPSU_EXPERT_TALK_LAYOUT.pill = PPSU_EXPERT_TALK_LAYOUT.eventType;
export const PPSU_POSTER_CONFIG = PPSU_EXPERT_TALK_LAYOUT;

/**
 * Layout helper for event type pill.
 * Accurately centers text within the pill boundary and dynamically expands if long.
 * @param {string} eventType
 */
export function layoutPpsuEventType(eventType) {
  const clean = String(eventType || "").trim();
  const { eventType: pill } = PPSU_EXPERT_TALK_LAYOUT;

  if (!clean) {
    return {
      text: "",
      fontSize: pill.fontSize,
      pillX: pill.x,
      pillY: pill.y,
      pillWidth: pill.width,
      pillHeight: pill.height,
      pillCenterX: pill.centerX,
      pillCenterY: pill.centerY,
      rx: pill.rx,
      isExpanded: false
    };
  }

  let fontSize = pill.fontSize;
  const textWidth = measureTextWidth(
    clean,
    fontSize,
    "system-ui, -apple-system, sans-serif",
    "900"
  );

  let pillWidth = Math.max(pill.width, textWidth + 70);
  if (pillWidth > pill.maxWidth) {
    fontSize = fitTextSize({
      text: clean,
      preferredSize: pill.fontSize,
      minimumSize: pill.minFontSize,
      maxWidth: pill.maxWidth - 70,
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontWeight: "900"
    });
    const fittedWidth = measureTextWidth(
      clean,
      fontSize,
      "system-ui, -apple-system, sans-serif",
      "900"
    );
    pillWidth = Math.min(pill.maxWidth, Math.max(pill.width, fittedWidth + 70));
  }

  const pillX = pill.x;
  const pillY = pill.y;
  const pillHeight = pill.height;
  const pillCenterX = pillX + pillWidth / 2;
  const pillCenterY = pillY + pillHeight / 2;
  const rx = pillHeight / 2;

  return {
    text: clean,
    fontSize,
    pillX,
    pillY,
    pillWidth,
    pillHeight,
    pillCenterX,
    pillCenterY,
    rx,
    isExpanded: pillWidth > pill.width
  };
}

/**
 * Helper to wrap text into lines based on maximum width at a specific font size.
 */
function wrapWordsByWidth(text, fontSize, maxWidth, fontFamily, fontWeight) {
  const words = String(text || "").trim().split(/\s+/);
  if (!words.length || !words[0]) return [];

  const lines = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = measureTextWidth(testLine, fontSize, fontFamily, fontWeight);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Single word exceeds maxWidth
        lines.push(word);
        currentLine = "";
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Dynamic deterministic text fitting for PPSU Expert Talk main title.
 * Automatically chooses the largest font size that fits within TITLE_AVAILABLE_HEIGHT and TITLE_MAX_WIDTH.
 *
 * @param {string} title - Main title text
 * @param {object} customConfig - Optional layout overrides
 * @returns {object} { lines, fontSize, lineHeight, totalHeight, isValid, errorMessage }
 */
export function layoutPpsuTitle(title, customConfig = {}) {
  const clean = String(title || "").trim();
  const cfg = { ...PPSU_EXPERT_TALK_LAYOUT.title, ...customConfig };

  const {
    maxWidth = 815,
    maxHeight = 590,
    maxFontSize = 72,
    minFontSize = 22,
    lineHeightFactor = 1.08,
    fontFamily = "system-ui, -apple-system, sans-serif",
    fontWeight = "900"
  } = cfg;

  if (!clean) {
    return {
      lines: [],
      fontSize: maxFontSize,
      lineHeight: Math.round(maxFontSize * lineHeightFactor),
      totalHeight: 0,
      isValid: true,
      errorMessage: ""
    };
  }

  // Iterate from maxFontSize down to minFontSize to find the largest fitting font size
  for (let size = maxFontSize; size >= minFontSize; size -= 1) {
    const lines = wrapWordsByWidth(clean, size, maxWidth, fontFamily, fontWeight);
    if (!lines.length) continue;

    const lineHeight = Math.round(size * lineHeightFactor);
    const totalHeight =
      lines.length === 1 ? size : (lines.length - 1) * lineHeight + size;

    // Check if every individual line strictly fits within maxWidth
    const allLinesFitWidth = lines.every(
      (line) => measureTextWidth(line, size, fontFamily, fontWeight) <= maxWidth
    );

    if (allLinesFitWidth && totalHeight <= maxHeight) {
      return {
        lines,
        fontSize: size,
        lineHeight,
        totalHeight,
        isValid: true,
        errorMessage: ""
      };
    }
  }

  // If even minFontSize cannot fit without exceeding maxHeight or maxWidth:
  const fallbackLines = wrapWordsByWidth(clean, minFontSize, maxWidth, fontFamily, fontWeight);
  const fallbackLineHeight = Math.round(minFontSize * lineHeightFactor);
  const fallbackHeight =
    fallbackLines.length === 1
      ? minFontSize
      : (fallbackLines.length - 1) * fallbackLineHeight + minFontSize;

  return {
    lines: fallbackLines,
    fontSize: minFontSize,
    lineHeight: fallbackLineHeight,
    totalHeight: fallbackHeight,
    isValid: false,
    errorMessage: "Title is too long for this poster layout. Please shorten the title."
  };
}

/**
 * Layout helper for multi-line speaker credentials text.
 * @param {string} speakerText
 */
export function layoutPpsuSpeaker(speakerText) {
  const clean = String(speakerText || "").trim();
  const { speaker: spkCfg } = PPSU_EXPERT_TALK_LAYOUT;

  if (!clean) {
    return {
      name: "",
      nameFontSize: spkCfg.nameFontSize,
      detailsLines: [],
      detailsFontSize: spkCfg.detailsFontSize,
      detailsLineSpacing: spkCfg.detailsLineSpacing,
      lines: []
    };
  }

  const rawLines = clean.split("\n").map((l) => l.trim()).filter(Boolean);
  const name = rawLines[0] || "";
  const rawDetails = rawLines.slice(1);

  // Responsive font size for speaker name
  let nameFontSize = spkCfg.nameFontSize;
  if (name.length > 45) {
    nameFontSize = 28;
  } else if (name.length > 32) {
    nameFontSize = spkCfg.nameFontSizeLong;
  }

  // Wrap details lines if needed
  const detailsLines = [];
  const detailsFontSize = spkCfg.detailsFontSize;
  const detailsMaxWidth = spkCfg.detailsMaxWidth;

  if (rawDetails.length > 0) {
    rawDetails.forEach((line) => {
      const wrapped = wrapText({
        text: line,
        fontSize: detailsFontSize,
        maxWidth: detailsMaxWidth,
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontWeight: "600",
        maximumLines: 3
      });
      detailsLines.push(...wrapped.lines);
    });
  }

  return {
    name,
    nameFontSize,
    detailsLines,
    detailsFontSize,
    detailsLineSpacing: spkCfg.detailsLineSpacing,
    // Keep backward compatible `lines` array: [name, ...detailsLines]
    lines: name ? [name, ...detailsLines] : detailsLines
  };
}

/**
 * Computes all cohesive dynamic coordinates for the PPSU Expert Talk Poster.
 * - Title dynamically occupies available space above the fixed speaker boundary.
 * - Date/Time/Venue metadata sits inside the lower-left marked region.
 * - Speaker section and photo remain firmly anchored.
 */
export function calculatePpsuDynamicLayout({
  eventType = "",
  mainTitle = "",
  eventDate = "",
  eventTime = "",
  venue = "",
  speaker = ""
}) {
  const layout = PPSU_EXPERT_TALK_LAYOUT;
  const eventTypeLayout = layoutPpsuEventType(eventType);
  const titleLayout = layoutPpsuTitle(mainTitle);
  const speakerLayout = layoutPpsuSpeaker(speaker);

  // Title Positioning
  const pillBottom = eventTypeLayout.pillY + eventTypeLayout.pillHeight;
  const titleTop = pillBottom + layout.title.gapFromPill;
  // Baseline for line 0
  const titleStartY = titleTop + Math.round(titleLayout.fontSize * 0.82);
  const titleLineHeight = titleLayout.lineHeight;

  // Metadata lines (Date, Time, Venue) in lower-left marked area
  const metaX = layout.eventMeta.x;
  const metaStartY = layout.eventMeta.y;
  const metaLineHeight = layout.eventMeta.lineHeight;

  const dateY = metaStartY;
  const timeY = dateY + (eventDate ? metaLineHeight : 0);
  const venueY = timeY + (eventTime ? metaLineHeight : 0);

  // Fixed Speaker Section (Anchored lower-middle & photo on right)
  const photoX = layout.speakerPhoto.x;
  const photoY = layout.speakerPhoto.y;
  const photoWidth = layout.speakerPhoto.width;
  const photoHeight = layout.speakerPhoto.height;
  const photoRx = layout.speakerPhoto.rx;
  const photoRy = layout.speakerPhoto.ry;

  const speakerHeaderY = photoY + layout.speaker.headerOffsetFromPhotoTop;
  const speakerNameY = speakerHeaderY + layout.speaker.gapHeaderToName;
  const speakerDetailsStartY = speakerNameY + layout.speaker.gapNameToDetails;

  return {
    eventTypeLayout,
    titleLayout,
    speakerLayout,
    coords: {
      pillX: eventTypeLayout.pillX,
      pillY: eventTypeLayout.pillY,
      pillWidth: eventTypeLayout.pillWidth,
      pillHeight: eventTypeLayout.pillHeight,
      pillCenterX: eventTypeLayout.pillCenterX,
      pillCenterY: eventTypeLayout.pillCenterY,
      pillRx: eventTypeLayout.rx,
      titleX: layout.title.x,
      titleTop,
      titleStartY,
      titleLineHeight,
      metaX,
      metaFontSize: layout.eventMeta.fontSize,
      metaLineHeight: layout.eventMeta.lineHeight,
      dateY,
      timeY,
      venueY,
      speakerAnchorX: layout.speaker.textAnchorX,
      speakerHeaderY,
      speakerHeaderFontSize: layout.speaker.headerFontSize,
      speakerHeaderLetterSpacing: layout.speaker.headerLetterSpacing,
      speakerNameY,
      speakerDetailsStartY,
      speakerDetailsLineSpacing: layout.speaker.detailsLineSpacing,
      photoX,
      photoY,
      photoWidth,
      photoHeight,
      photoRx,
      photoRy
    }
  };
}
