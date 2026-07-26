/**
 * Fits text inside a specific maximum PDF width (in mm) by reducing font size in 0.2-point increments.
 */
export const fitPdfTextToWidth = ({
  pdf,
  text,
  preferredSize,
  minimumSize,
  maxWidth,
  fontStyle = "normal"
}) => {
  if (!pdf || !text) return preferredSize;

  let currentSize = preferredSize;
  pdf.setFont("times", fontStyle);
  pdf.setFontSize(currentSize);

  let textWidth = pdf.getTextWidth(text);

  while (textWidth > maxWidth && currentSize > minimumSize + 0.01) {
    currentSize = Math.max(minimumSize, Number((currentSize - 0.2).toFixed(2)));
    pdf.setFontSize(currentSize);
    textWidth = pdf.getTextWidth(text);
  }

  return currentSize;
};

export const fitPdfTextAndString = ({
  pdf,
  text,
  preferredSize = 10.5,
  minimumSize = 8.5,
  maxWidth,
  fontStyle = "normal"
}) => {
  if (!pdf || !text) return { fontSize: preferredSize, text: text || "" };

  let currentSize = preferredSize;
  pdf.setFont("times", fontStyle);
  pdf.setFontSize(currentSize);

  let textWidth = pdf.getTextWidth(text);

  while (textWidth > maxWidth && currentSize > minimumSize + 0.01) {
    currentSize = Math.max(minimumSize, Number((currentSize - 0.2).toFixed(2)));
    pdf.setFontSize(currentSize);
    textWidth = pdf.getTextWidth(text);
  }

  let fittedText = text;
  if (textWidth > maxWidth) {
    pdf.setFontSize(minimumSize);
    fittedText = text;
    while (fittedText.length > 3 && pdf.getTextWidth(fittedText + "...") > maxWidth) {
      fittedText = fittedText.slice(0, -1);
    }
    fittedText = fittedText + "...";
  }

  return { fontSize: currentSize, text: fittedText };
};

// Canvas context singleton for SVG text measurement
let measurementCanvasCtx = null;
const getMeasurementCanvasContext = () => {
  if (typeof document === "undefined") return null;
  if (!measurementCanvasCtx) {
    const canvas = document.createElement("canvas");
    measurementCanvasCtx = canvas.getContext("2d");
  }
  return measurementCanvasCtx;
};

/**
 * Fits text inside a specific maximum SVG width (in mm) by reducing font size in 0.2-point increments.
 */
export const fitSvgAttendanceText = ({
  text,
  preferredSize,
  minimumSize,
  maxWidth,
  fontFamily = "'Times New Roman', Times, serif",
  fontWeight = "normal"
}) => {
  if (!text) return preferredSize;
  const ctx = getMeasurementCanvasContext();
  if (!ctx) return preferredSize;

  let currentSize = preferredSize;

  const getMeasuredWidthMm = (size) => {
    const pxSize = (size * 96) / 72;
    ctx.font = `${fontWeight} ${pxSize}px ${fontFamily}`;
    const pxWidth = ctx.measureText(text).width;
    return (pxWidth * 25.4) / 96;
  };

  let textWidthMm = getMeasuredWidthMm(currentSize);

  while (textWidthMm > maxWidth && currentSize > minimumSize + 0.01) {
    currentSize = Math.max(minimumSize, Number((currentSize - 0.2).toFixed(2)));
    textWidthMm = getMeasuredWidthMm(currentSize);
  }

  return currentSize;
};

export const fitSvgTextAndString = ({
  text,
  preferredSize = 10.5,
  minimumSize = 8.5,
  maxWidth,
  fontFamily = "'Times New Roman', Times, serif",
  fontWeight = "normal"
}) => {
  if (!text) return { fontSize: preferredSize, text: "" };
  const ctx = getMeasurementCanvasContext();
  if (!ctx) return { fontSize: preferredSize, text };

  let currentSize = preferredSize;

  const getMeasuredWidthMm = (str, size) => {
    const pxSize = (size * 96) / 72;
    ctx.font = `${fontWeight} ${pxSize}px ${fontFamily}`;
    const pxWidth = ctx.measureText(str).width;
    return (pxWidth * 25.4) / 96;
  };

  let textWidthMm = getMeasuredWidthMm(text, currentSize);

  while (textWidthMm > maxWidth && currentSize > minimumSize + 0.01) {
    currentSize = Math.max(minimumSize, Number((currentSize - 0.2).toFixed(2)));
    textWidthMm = getMeasuredWidthMm(text, currentSize);
  }

  let fittedText = text;
  if (textWidthMm > maxWidth) {
    currentSize = minimumSize;
    fittedText = text;
    while (fittedText.length > 3 && getMeasuredWidthMm(fittedText + "...", minimumSize) > maxWidth) {
      fittedText = fittedText.slice(0, -1);
    }
    fittedText = fittedText + "...";
  }

  return { fontSize: currentSize, text: fittedText };
};

export default {
  fitPdfTextToWidth,
  fitPdfTextAndString,
  fitSvgAttendanceText,
  fitSvgTextAndString
};
