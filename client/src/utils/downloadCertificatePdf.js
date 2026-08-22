import jsPDF from "jspdf";

const SVG_WIDTH = 1600;
const SVG_HEIGHT = 1131;

export const safeFileName = (name) => {
  const cleanedName = String(name || "certificate")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/_+/g, "_");

  return cleanedName || "certificate";
};

/**
 * Inlines image assets inside an SVG element by converting external hrefs to Base64 Data URLs.
 */
export const inlineSvgImages = async (svgClone) => {
  const images = svgClone.querySelectorAll("image");

  await Promise.all(
    [...images].map(async (img) => {
      const href = img.getAttribute("href") || img.getAttribute("xlink:href");
      if (!href || href.startsWith("data:")) {
        return;
      }

      try {
        const response = await fetch(encodeURI(href));
        const blob = await response.blob();
        const reader = new FileReader();

        const dataUrl = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        img.setAttribute("href", dataUrl);
        img.setAttribute("xlink:href", dataUrl);
      } catch (err) {
        console.warn(`Failed to inline SVG image asset: ${href}`, err);
      }
    })
  );
};

/**
 * Serializes an SVG DOM node into a clean, stand-alone XML string with inlined images.
 */
export const serializeCertificateSvg = async (svgElement) => {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const svgClone = svgElement.cloneNode(true);

  svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svgClone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  svgClone.setAttribute("width", `${SVG_WIDTH}`);
  svgClone.setAttribute("height", `${SVG_HEIGHT}`);
  svgClone.setAttribute("viewBox", `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`);

  await inlineSvgImages(svgClone);

  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgClone);
};

/**
 * Converts serialized SVG string to an HTML5 Canvas at specified resolution scale.
 */
export const svgToCanvas = async (svgString, scale = 1.5) => {
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = (err) => reject(new Error("Failed to load SVG string into Image for Canvas render."));
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(SVG_WIDTH * scale);
  canvas.height = Math.round(SVG_HEIGHT * scale);

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  URL.revokeObjectURL(url);
  return canvas;
};

/**
 * Renders an SVG element to a Canvas object.
 */
export const renderCertificateCanvas = async (svgSource, scale = 1.5) => {
  let svgElement = typeof svgSource === "string" ? document.getElementById(svgSource) : svgSource;

  if (!svgElement) {
    // Fallback lookups
    svgElement = document.querySelector("svg.certificate-svg") || document.querySelector("svg");
  }

  if (!svgElement) {
    throw new Error("Certificate SVG element not found.");
  }

  const svgString = await serializeCertificateSvg(svgElement);
  return svgToCanvas(svgString, scale);
};

/**
 * Generates an A4 Landscape PDF Blob directly from an SVG element.
 */
export const generateCertificatePdfBlob = async (svgSource) => {
  const canvas = await renderCertificateCanvas(svgSource, 1.5);
  const imageData = canvas.toDataURL("image/jpeg", 0.9);

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 4;

  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;

  const canvasRatio = canvas.width / canvas.height;
  const targetRatio = maxWidth / maxHeight;

  let renderWidth;
  let renderHeight;

  if (canvasRatio > targetRatio) {
    renderWidth = maxWidth;
    renderHeight = maxWidth / canvasRatio;
  } else {
    renderHeight = maxHeight;
    renderWidth = maxHeight * canvasRatio;
  }

  const x = (pageWidth - renderWidth) / 2;
  const y = (pageHeight - renderHeight) / 2;

  pdf.addImage(imageData, "JPEG", x, y, renderWidth, renderHeight, undefined, "FAST");
  return pdf.output("blob");
};

/**
 * Downloads a Certificate as a PDF file directly from an SVG element.
 */
export const downloadCertificatePdf = async (svgSource, fileName = "certificate.pdf") => {
  try {
    const canvas = await renderCertificateCanvas(svgSource, 1.5);
    const imageData = canvas.toDataURL("image/jpeg", 0.9);

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 4;

    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;

    const canvasRatio = canvas.width / canvas.height;
    const targetRatio = maxWidth / maxHeight;

    let renderWidth;
    let renderHeight;

    if (canvasRatio > targetRatio) {
      renderWidth = maxWidth;
      renderHeight = maxWidth / canvasRatio;
    } else {
      renderHeight = maxHeight;
      renderWidth = maxHeight * canvasRatio;
    }

    const x = (pageWidth - renderWidth) / 2;
    const y = (pageHeight - renderHeight) / 2;

    pdf.addImage(imageData, "JPEG", x, y, renderWidth, renderHeight, undefined, "FAST");

    const cleanName = safeFileName(fileName);
    const finalFileName = cleanName.toLowerCase().endsWith(".pdf") ? cleanName : `${cleanName}.pdf`;
    pdf.save(finalFileName);
    return true;
  } catch (error) {
    console.error("Certificate PDF export error:", error);
    alert(error.message || "Unable to download certificate PDF. Please try again.");
    return false;
  }
};

/**
 * Downloads a Certificate as a PNG image file directly from an SVG element.
 */
export const downloadCertificatePng = async (svgSource, fileName = "certificate.png") => {
  try {
    const canvas = await renderCertificateCanvas(svgSource, 2.0);
    const dataUrl = canvas.toDataURL("image/png");

    const cleanName = safeFileName(fileName);
    const finalFileName = cleanName.toLowerCase().endsWith(".png") ? cleanName : `${cleanName}.png`;

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = finalFileName;
    link.click();
    return true;
  } catch (error) {
    console.error("Certificate PNG export error:", error);
    alert(error.message || "Unable to download certificate PNG. Please try again.");
    return false;
  }
};

export default downloadCertificatePdf;
