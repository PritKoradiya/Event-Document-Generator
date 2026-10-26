import jsPDF from "jspdf";

export const safeFileName = (name) => {
  const cleanedName = String(name || "poster")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/_+/g, "_");

  return cleanedName || "poster";
};

/**
 * Resolves a DOM SVG element from either a React ref or a DOM element / ID.
 */
function resolveSvgElement(target) {
  if (!target) return null;
  if (target instanceof SVGElement) return target;
  if (target.current && target.current instanceof SVGElement) return target.current;
  if (typeof target === "string") {
    const el = document.getElementById(target);
    if (el instanceof SVGElement) return el;
    if (el) {
      const childSvg = el.querySelector("svg");
      if (childSvg) return childSvg;
    }
  }
  if (target instanceof HTMLElement) {
    const childSvg = target.querySelector("svg");
    if (childSvg) return childSvg;
  }
  return null;
}

/**
 * Converts an image URL (http/https/blob/data) to a base64 data URL.
 */
async function imageUrlToDataUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("data:")) return url;

  try {
    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Failed to inline image for SVG export:", url, error);
    return "";
  }
}

/**
 * Clones SVG and inlines all external image elements as Data URLs.
 */
export async function inlinePosterSvgImages(svgElement) {
  const clonedSvg = svgElement.cloneNode(true);
  const imageElements = clonedSvg.querySelectorAll("image");

  for (const imgEl of imageElements) {
    const href = imgEl.getAttribute("href") || imgEl.getAttribute("xlink:href");
    if (href && !href.startsWith("data:")) {
      const dataUrl = await imageUrlToDataUrl(href);
      if (dataUrl) {
        imgEl.setAttribute("href", dataUrl);
        imgEl.setAttribute("xlink:href", dataUrl);
      }
    }
  }

  return clonedSvg;
}

/**
 * Extracts width and height from an SVG element's viewBox or attributes.
 */
export function getSvgDimensions(svgElement) {
  if (!svgElement) return { width: 1080, height: 1350 };

  const viewBox = svgElement.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && !isNaN(parts[2]) && !isNaN(parts[3]) && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }

  const widthAttr = parseFloat(svgElement.getAttribute("width"));
  const heightAttr = parseFloat(svgElement.getAttribute("height"));
  if (!isNaN(widthAttr) && !isNaN(heightAttr) && widthAttr > 0 && heightAttr > 0) {
    return { width: widthAttr, height: heightAttr };
  }

  return { width: 1080, height: 1350 };
}

/**
 * Serializes SVG element into clean XML string with inlined images.
 */
export async function serializePosterSvg(svgElement) {
  const clonedSvg = await inlinePosterSvgImages(svgElement);
  const { width, height } = getSvgDimensions(svgElement);

  if (!clonedSvg.getAttribute("xmlns")) {
    clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  if (!clonedSvg.getAttribute("xmlns:xlink")) {
    clonedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  }

  clonedSvg.setAttribute("width", String(width));
  clonedSvg.setAttribute("height", String(height));
  clonedSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const serializer = new XMLSerializer();
  return serializer.serializeToString(clonedSvg);
}

/**
 * Draws serialized SVG string onto a canvas at high resolution.
 */
export function posterSvgToCanvas(svgString, scale = 2, customWidth, customHeight) {
  return new Promise((resolve, reject) => {
    let width = customWidth;
    let height = customHeight;

    if (!width || !height) {
      const match = svgString.match(/viewBox=["']0\s+0\s+([0-9.]+)\s+([0-9.]+)["']/i);
      if (match) {
        width = parseFloat(match[1]);
        height = parseFloat(match[2]);
      } else {
        width = 1080;
        height = 1350;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to render SVG onto Canvas for export."));
    };

    img.src = url;
  });
}

/**
 * Downloads SVG poster as a high-resolution PNG file.
 */
export async function downloadPosterPng(svgRefOrElement, fileName = "poster.png") {
  try {
    const svgElement = resolveSvgElement(svgRefOrElement);
    if (!svgElement) {
      alert("Poster SVG element was not found. Please try again.");
      return false;
    }

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const { width, height } = getSvgDimensions(svgElement);
    const serializedSvg = await serializePosterSvg(svgElement);
    const canvas = await posterSvgToCanvas(serializedSvg, 2, width, height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          alert("Failed to create PNG blob from poster SVG.");
          resolve(false);
          return;
        }

        const downloadLink = document.createElement("a");
        const cleanName = safeFileName(fileName);
        const finalFileName = cleanName.toLowerCase().endsWith(".png") ? cleanName : `${cleanName}.png`;

        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = finalFileName;
        downloadLink.click();

        setTimeout(() => URL.revokeObjectURL(downloadLink.href), 1000);
        resolve(true);
      }, "image/png");
    });
  } catch (error) {
    console.error("Poster PNG export error:", error);
    alert(error.message || "Failed to download poster PNG. Please try again.");
    return false;
  }
}

/**
 * Generates an A4 portrait PDF Blob from the poster SVG.
 */
export async function generatePosterPdfBlob(svgRefOrElement) {
  const svgElement = resolveSvgElement(svgRefOrElement);
  if (!svgElement) {
    throw new Error("Poster SVG element was not found.");
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const { width, height } = getSvgDimensions(svgElement);
  const serializedSvg = await serializePosterSvg(svgElement);
  const canvas = await posterSvgToCanvas(serializedSvg, 2, width, height);
  const imageData = canvas.toDataURL("image/jpeg", 0.95);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true
  });

  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const margin = 5; // 5mm margin
  const targetWidth = pageWidth - margin * 2; // 200mm
  const targetHeight = targetWidth * (height / width);

  let finalWidth = targetWidth;
  let finalHeight = targetHeight;
  const maxHeight = pageHeight - margin * 2;

  if (finalHeight > maxHeight) {
    finalHeight = maxHeight;
    finalWidth = finalHeight * (width / height);
  }

  const xOffset = (pageWidth - finalWidth) / 2;
  const yOffset = (pageHeight - finalHeight) / 2;

  pdf.addImage(imageData, "JPEG", xOffset, yOffset, finalWidth, finalHeight, undefined, "FAST");
  return pdf;
}

/**
 * Downloads poster SVG as a high-quality A4 portrait PDF file.
 */
export async function downloadPosterPdf(svgRefOrElement, fileName = "poster.pdf") {
  try {
    const pdf = await generatePosterPdfBlob(svgRefOrElement);
    const cleanName = safeFileName(fileName);
    const finalFileName = cleanName.toLowerCase().endsWith(".pdf") ? cleanName : `${cleanName}.pdf`;

    pdf.save(finalFileName);
    return true;
  } catch (error) {
    console.error("Poster PDF export error:", error);
    alert(error.message || "Failed to download poster PDF. Please try again.");
    return false;
  }
}
