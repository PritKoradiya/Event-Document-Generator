import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Import modules to test
import posterData from "../src/data/posterData.js";
import {
  PPSU_EXPERT_TALK_LAYOUT,
  PPSU_POSTER_CONFIG,
  layoutPpsuTitle,
  layoutPpsuSpeaker,
  layoutPpsuEventType,
  calculatePpsuDynamicLayout
} from "../src/utils/ppsuPosterLayout.js";
import {
  validateSpeakerImage,
  ALLOWED_IMAGE_TYPES,
  MAX_SPEAKER_IMAGE_SIZE
} from "../src/utils/processSpeakerImage.js";
import { getSvgDimensions } from "../src/utils/downloadPoster.js";

describe("PPSU Expert Talk Poster - Frontend Modules Test Suite", () => {
  describe("1. posterData Template Configurations", () => {
    it("should include the PPSU Expert Talk Poster template", () => {
      const ppsu = posterData.find((p) => p.id === "ppsu-expert-talk");
      assert.ok(ppsu, "ppsu-expert-talk template should exist in posterData");
      assert.equal(ppsu.name, "PPSU Expert Talk Poster");
      assert.equal(ppsu.posterFormat, "ppsu-expert-talk");
      assert.equal(ppsu.category, "Expert Talk");
      assert.equal(ppsu.designKey, "ppsu-expert-talk");
      assert.equal(
        ppsu.background,
        "/poster-themes/ppsu-expert-talk/Untitled-design.png"
      );
    });

    it("should maintain all 12 original standard poster templates unmodified", () => {
      const standardTemplates = posterData.filter((p) => p.id !== "ppsu-expert-talk");
      assert.equal(standardTemplates.length, 12, "Should preserve all 12 standard templates");
      const standardIds = standardTemplates.map((p) => p.id);
      assert.ok(standardIds.includes("seminar-poster"));
      assert.ok(standardIds.includes("conference-poster"));
      assert.ok(standardIds.includes("workshop-poster"));
      assert.ok(standardIds.includes("hackathon-poster"));
      assert.ok(standardIds.includes("webinar-poster"));
    });
  });

  describe("2. Event Type Pill Geometry & Dynamic Expansion", () => {
    it("should accurately center text inside the pill with proper coordinates", () => {
      const pill = layoutPpsuEventType("IIT Lecture Series");
      assert.equal(pill.text, "IIT Lecture Series");
      assert.equal(pill.pillY, 360);
      assert.equal(pill.pillHeight, 98);
      assert.equal(pill.pillCenterY, 409);
      assert.ok(pill.fontSize >= 30, "Pill font size should be prominent (>=30px)");
      assert.ok(pill.pillWidth >= 416, "Pill width should be at least base background width");
    });

    it("should expand pill width dynamically for long event type without clipping (Part 34)", () => {
      const longPill = layoutPpsuEventType("International Expert Lecture Series");
      assert.equal(longPill.text, "International Expert Lecture Series");
      assert.ok(longPill.pillWidth > 416, "Long event type pill should expand beyond base width");
      assert.ok(longPill.pillWidth <= 875, "Expanded pill width should not exceed canvas max width");
      assert.equal(longPill.pillCenterY, 409, "Expanded pill should stay vertically centered");
    });

    it("should handle empty event type gracefully", () => {
      const emptyPill = layoutPpsuEventType("");
      assert.equal(emptyPill.text, "");
      assert.equal(emptyPill.pillWidth, 416);
    });
  });

  describe("3. Dynamic Title Fitting & Available Space (Parts 7-17, 30-33)", () => {
    it("should layout short title with maximum visual font size (Part 30)", () => {
      const title = "Expert Talk on Generative AI";
      const layout = layoutPpsuTitle(title);
      assert.ok(layout.lines.length >= 1);
      assert.ok(layout.fontSize >= 64, `Short title font size should be large (actual: ${layout.fontSize})`);
      assert.ok(layout.totalHeight <= PPSU_EXPERT_TALK_LAYOUT.title.maxHeight);
      assert.equal(layout.isValid, true);
    });

    it("should layout medium title with large readable font size (Part 31)", () => {
      const title = "Prompt Engineering Workshop on Generative AI";
      const layout = layoutPpsuTitle(title);
      assert.ok(layout.lines.length >= 1);
      assert.ok(layout.fontSize >= 50, `Medium title font size should be prominent (actual: ${layout.fontSize})`);
      assert.ok(layout.totalHeight <= PPSU_EXPERT_TALK_LAYOUT.title.maxHeight);
      assert.equal(layout.isValid, true);
    });

    it("should wrap long title across multiple lines fitting available height without overflow (Part 32)", () => {
      const longTitle =
        "Prompt Engineering: Unlocking the Power of Generative AI – Expert Talk by Distinguished Faculty from IIT Indore";
      const layout = layoutPpsuTitle(longTitle);
      assert.ok(layout.lines.length >= 2, "Long title should wrap into multiple lines");
      assert.ok(layout.fontSize >= 28, `Font size should stay readable (actual: ${layout.fontSize})`);
      assert.ok(layout.totalHeight <= PPSU_EXPERT_TALK_LAYOUT.title.maxHeight);
      assert.equal(layout.isValid, true);
    });

    it("should detect excessively long title and flag validation without overflowing poster (Part 33)", () => {
      const superLongTitle = "A very long conference headline that exceeds the entire available vertical space of this poster layout. ".repeat(25);
      const layout = layoutPpsuTitle(superLongTitle);
      assert.equal(layout.isValid, false);
      assert.equal(
        layout.errorMessage,
        "Title is too long for this poster layout. Please shorten the title."
      );
    });

    it("should handle empty title gracefully", () => {
      const layout = layoutPpsuTitle("");
      assert.deepEqual(layout.lines, []);
      assert.equal(layout.isValid, true);
    });
  });

  describe("4. Centralized Layout & Lower-Left Metadata Coordinates (Parts 1-6, 11-14, 22-26, 35-37)", () => {
    it("should have correct canvas dimensions matching native canvas (1447x2048)", () => {
      assert.equal(PPSU_EXPERT_TALK_LAYOUT.canvas.width, 1447);
      assert.equal(PPSU_EXPERT_TALK_LAYOUT.canvas.height, 2048);
      assert.equal(
        PPSU_EXPERT_TALK_LAYOUT.canvas.themeBackground,
        "/poster-themes/ppsu-expert-talk/Untitled-design.png"
      );
    });

    it("should place Date/Time/Venue in lower-left marked region with fixed coordinates (Parts 2-6, 35)", () => {
      const result = calculatePpsuDynamicLayout({
        eventType: "IIT Lecture Series",
        mainTitle: "Expert Talk on Generative AI",
        eventDate: "10/09/2026",
        eventTime: "10AM onward",
        venue: "I313 Auditorium, PP Savani University",
        speaker: "Prof. (Dr.) Chandresh Kumar Maurya\nIIT Indore"
      });

      // Metadata placed in lower-left marked area above cream footer
      assert.equal(result.coords.metaX, 100);
      assert.equal(result.coords.dateY, 1440);
      assert.equal(result.coords.timeY, 1482);
      assert.equal(result.coords.venueY, 1524);
      assert.equal(result.coords.metaFontSize, 24);
      assert.equal(result.coords.metaLineHeight, 42);

      // Metadata bottom is comfortably above fixed cream footer (1640) with safety margin > 50-80 units
      assert.ok(
        result.coords.venueY < 1640 - 50,
        "Metadata should sit comfortably above fixed cream footer"
      );

      // Metadata is separated from Speaker Section (speaker text anchor at 965, photo at 1000)
      assert.ok(result.coords.metaX < result.coords.photoX - 400);
    });

    it("should anchor speaker section firmly and never move speaker when title changes (Parts 12, 18, 36)", () => {
      const shortResult = calculatePpsuDynamicLayout({
        eventType: "Expert Talk",
        mainTitle: "Short Title",
        eventDate: "10/09/2026",
        eventTime: "10AM onward",
        venue: "Room 313",
        speaker: "Prof. (Dr.) Chandresh Kumar Maurya\nIIT Indore"
      });

      const longResult = calculatePpsuDynamicLayout({
        eventType: "Expert Talk",
        mainTitle:
          "Prompt Engineering: Unlocking the Power of Generative AI – Expert Talk by Distinguished Faculty from IIT Indore",
        eventDate: "10/09/2026",
        eventTime: "10AM onward",
        venue: "Room 313",
        speaker: "Prof. (Dr.) Chandresh Kumar Maurya\nIIT Indore"
      });

      // Speaker photo and header must remain at exactly the same anchored position
      assert.equal(shortResult.coords.photoY, 1115);
      assert.equal(longResult.coords.photoY, 1115);
      assert.equal(shortResult.coords.speakerHeaderY, 1155);
      assert.equal(longResult.coords.speakerHeaderY, 1155);
      assert.equal(shortResult.coords.photoX, 1000);
      assert.equal(longResult.coords.photoX, 1000);

      // Title never touches or enters speakerSafeTop (1115)
      const titleTop = longResult.coords.titleTop;
      const titleBottom = titleTop + longResult.titleLayout.totalHeight;
      assert.ok(
        titleBottom <= 1115 - 35,
        `Title bottom (${titleBottom}) must be <= speakerSafeTop - safetyGap (${1115 - 35})`
      );
    });

    it("should layout multiline speaker credentials with responsive name & wrapped details", () => {
      const speakerText =
        "Prof. (Dr.) Chandresh Kumar Maurya\nAssociate Professor, Department of Computer Science & Engineering,\nIIT Indore";
      const layout = layoutPpsuSpeaker(speakerText);
      assert.equal(layout.name, "Prof. (Dr.) Chandresh Kumar Maurya");
      assert.ok(layout.nameFontSize >= 28, "Speaker name font size should be >= 28");
      assert.ok(layout.detailsLines.length >= 1, "Speaker details should exist");
      assert.equal(layout.detailsFontSize, 22);
    });
  });

  describe("5. Speaker Image Processing and Validation", () => {
    it("should allow valid image types", () => {
      assert.ok(ALLOWED_IMAGE_TYPES.includes("image/png"));
      assert.ok(ALLOWED_IMAGE_TYPES.includes("image/jpeg"));
      assert.ok(ALLOWED_IMAGE_TYPES.includes("image/jpg"));
      assert.ok(ALLOWED_IMAGE_TYPES.includes("image/webp"));
    });

    it("should validate a valid mock File", () => {
      const mockFile = {
        name: "speaker.png",
        type: "image/png",
        size: 1024 * 500 // 500 KB
      };
      const result = validateSpeakerImage(mockFile);
      assert.equal(result.valid, true);
    });

    it("should reject invalid file types like PDF or text", () => {
      const mockPdf = {
        name: "document.pdf",
        type: "application/pdf",
        size: 1024 * 500
      };
      const result = validateSpeakerImage(mockPdf);
      assert.equal(result.valid, false);
      assert.match(result.error, /PNG, JPG, JPEG, and WebP/);
    });

    it("should reject files exceeding 5MB limit", () => {
      const largeFile = {
        name: "huge_photo.jpg",
        type: "image/jpeg",
        size: MAX_SPEAKER_IMAGE_SIZE + 1024
      };
      const result = validateSpeakerImage(largeFile);
      assert.equal(result.valid, false);
      assert.match(result.error, /too large/);
    });

    it("should handle null or undefined gracefully", () => {
      const result = validateSpeakerImage(null);
      assert.equal(result.valid, false);
      assert.match(result.error, /No image file/);
    });
  });

  describe("6. SVG Dimension Extraction for Export (Parts 28-29)", () => {
    it("should extract viewBox dimensions for standard poster", () => {
      const mockSvg = {
        getAttribute: (attr) => (attr === "viewBox" ? "0 0 1080 1350" : null)
      };
      const dims = getSvgDimensions(mockSvg);
      assert.equal(dims.width, 1080);
      assert.equal(dims.height, 1350);
    });

    it("should extract viewBox dimensions for PPSU Expert Talk poster (1447x2048)", () => {
      const mockSvg = {
        getAttribute: (attr) => (attr === "viewBox" ? "0 0 1447 2048" : null)
      };
      const dims = getSvgDimensions(mockSvg);
      assert.equal(dims.width, 1447);
      assert.equal(dims.height, 2048);
    });

    it("should fallback to default if element is null", () => {
      const dims = getSvgDimensions(null);
      assert.equal(dims.width, 1080);
      assert.equal(dims.height, 1350);
    });
  });
});
