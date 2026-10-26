/**
 * Centralized Certificate Typography Configuration.
 * Provides enhanced, professional, larger typography for PPSU custom templates
 * while safely preserving existing typography for legacy templates.
 */

import { fitTextSize, wrapText } from "./svgTextLayout.js";

/**
 * Determines if a given certificate, template style, or background belongs to PPSU.
 *
 * @param {Object|string} templateOrData
 * @returns {boolean}
 */
export function isPpsuCertificate(templateOrData) {
  if (!templateOrData) return false;

  if (typeof templateOrData === "string") {
    const s = templateOrData.toLowerCase().trim();
    return (
      s === "ppsu" ||
      s === "ppsu certificate" ||
      s === "p-p-savani-university" ||
      s === "p p savani university" ||
      s === "p p savani university certificate" ||
      s.includes("ppsu") ||
      s.includes("savani")
    );
  }

  const id = String(templateOrData.id || "").toLowerCase();
  const name = String(templateOrData.name || "").toLowerCase();
  const templateStyle = String(templateOrData.templateStyle || "").toLowerCase();
  const designKey = String(templateOrData.designKey || "").toLowerCase();
  const bg = String(templateOrData.backgroundImage || "").toLowerCase();

  return (
    id === "ppsu" ||
    id === "p-p-savani-university" ||
    id.includes("ppsu") ||
    id.includes("savani") ||
    name.includes("ppsu") ||
    name.includes("savani") ||
    templateStyle.includes("ppsu") ||
    templateStyle.includes("savani") ||
    designKey.includes("ppsu") ||
    designKey.includes("savani") ||
    bg.includes("ppsu") ||
    bg.includes("savani")
  );
}

/**
 * Computes responsive typography metrics for SVG certificate rendering.
 */
export function getCertificateTypography(templateRef = {}) {
  const isPpsu = isPpsuCertificate(templateRef);

  if (isPpsu) {
    return {
      isPpsu: true,
      category: {
        fontSize: 28,
        letterSpacing: 5,
        fontWeight: "800",
        y: 145
      },
      title: {
        preferredSize: 72,
        minimumSize: 48,
        maxWidth: 1150,
        maximumLines: 2,
        fontWeight: "900",
        fontFamily: "serif",
        y: 225
      },
      divider: {
        y: 280,
        x1: 520,
        x2: 1080,
        strokeWidth: 2.5,
        circleR: 5.5
      },
      kicker: {
        text: "THIS CERTIFICATE IS PROUDLY PRESENTED TO",
        fontSize: 22,
        letterSpacing: 3.5,
        fontWeight: "800",
        y: 345
      },
      name: {
        preferredSize: 94,
        minimumSize: 52,
        maxWidth: 1120,
        maximumLines: 2,
        fontWeight: "900",
        fontFamily: "serif",
        singleLineY: 465,
        multiLineY: 425,
        singleLineUnderlineY: 525,
        multiLineUnderlineY: 545,
        underlineX1: 360,
        underlineX2: 1240,
        underlineStrokeWidth: 3.5
      },
      eventLine: {
        preferredSize: 34,
        minimumSize: 24,
        maxWidth: 1120,
        maximumLines: 2,
        fontWeight: "700",
        fontFamily: "sans-serif",
        y: 580
      },
      date: {
        fontSize: 28,
        fontWeight: "700",
        fontFamily: "sans-serif",
        y: 652
      },
      description: {
        preferredSize: 26,
        minimumSize: 20,
        maxWidth: 1150,
        maximumLines: 3,
        fontWeight: "500",
        fontFamily: "sans-serif",
        y: 725
      },
      footerDivider: {
        y: 840,
        x1: 150,
        x2: 1450,
        strokeWidth: 1.5
      },
      signature: {
        yOffset: 855,
        lineWidth: 260,
        getNameFontSize: (name) => {
          const len = String(name || "").trim().length;
          if (len > 32) return 20;
          if (len > 24) return 23;
          if (len > 18) return 25;
          return 27;
        },
        getSubtitleFontSize: (sub) => {
          const len = String(sub || "").trim().length;
          if (len > 36) return 16;
          if (len > 26) return 18;
          if (len > 18) return 20;
          return 21;
        }
      }
    };
  }

  // Default Standard Typography for all other / older templates
  return {
    isPpsu: false,
    category: {
      fontSize: 18,
      letterSpacing: 4,
      fontWeight: "800",
      y: 145
    },
    title: {
      preferredSize: 58,
      minimumSize: 38,
      maxWidth: 1150,
      maximumLines: 2,
      fontWeight: "900",
      fontFamily: "serif",
      y: 225
    },
    divider: {
      y: 275,
      x1: 560,
      x2: 1040,
      strokeWidth: 2,
      circleR: 5
    },
    kicker: {
      text: "THIS CERTIFICATE IS PROUDLY PRESENTED TO",
      fontSize: 18,
      letterSpacing: 3,
      fontWeight: "800",
      y: 345
    },
    name: {
      preferredSize: 78,
      minimumSize: 44,
      maxWidth: 1080,
      maximumLines: 2,
      fontWeight: "900",
      fontFamily: "serif",
      singleLineY: 465,
      multiLineY: 425,
      singleLineUnderlineY: 515,
      multiLineUnderlineY: 535,
      underlineX1: 390,
      underlineX2: 1210,
      underlineStrokeWidth: 3
    },
    eventLine: {
      preferredSize: 25,
      minimumSize: 18,
      maxWidth: 1100,
      maximumLines: 2,
      fontWeight: "700",
      fontFamily: "sans-serif",
      y: 570
    },
    date: {
      fontSize: 20,
      fontWeight: "700",
      fontFamily: "sans-serif",
      y: 635
    },
    description: {
      preferredSize: 22,
      minimumSize: 16,
      maxWidth: 1150,
      maximumLines: 3,
      fontWeight: "500",
      fontFamily: "sans-serif",
      y: 715
    },
    footerDivider: {
      y: 840,
      x1: 170,
      x2: 1430,
      strokeWidth: 1.5
    },
    signature: {
      yOffset: 855,
      lineWidth: 220,
      getNameFontSize: (name) => {
        const len = String(name || "").trim().length;
        if (len > 32) return 13;
        if (len > 24) return 15;
        if (len > 18) return 16;
        return 18;
      },
      getSubtitleFontSize: (sub) => {
        const len = String(sub || "").trim().length;
        if (len > 36) return 11;
        if (len > 26) return 13;
        if (len > 18) return 14;
        return 15;
      }
    }
  };
}

export default getCertificateTypography;
