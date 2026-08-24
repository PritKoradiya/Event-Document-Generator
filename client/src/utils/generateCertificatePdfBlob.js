import { generateCertificatePdfBlob } from "./downloadCertificatePdf.js";
import { createCertificatePdfFileName } from "./certificateFileName.js";

const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Converts a Blob to a Base64 data string or Data URL.
 *
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export const convertBlobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    if (!blob) {
      return reject(new Error("Cannot convert empty Blob to Base64."));
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(String(reader.result || ""));
    };
    reader.onerror = (err) => {
      reject(err || new Error("Failed to read Blob as Data URL."));
    };
    reader.readAsDataURL(blob);
  });
};

/**
 * Generates an A4 Landscape PDF Blob and converts it to a payload ready for the backend email dispatch API.
 * Validates Blob existence, non-empty content, and 5MB size limit.
 *
 * @param {Element|string} svgSource - The SVG DOM element or element ID
 * @param {Object} certificate - Certificate metadata for filename generation
 * @returns {Promise<{ blob: Blob, pdfBase64: string, fileName: string }>}
 */
export const prepareCertificatePdfPayload = async (svgSource, certificate = {}) => {
  const blob = await generateCertificatePdfBlob(svgSource);

  if (!blob || blob.size === 0) {
    throw new Error("Certificate PDF could not be prepared.");
  }

  if (blob.size > MAX_PDF_BYTES) {
    const error = new Error("Generated certificate PDF exceeds the 5 MB attachment limit.");
    error.code = "PDF_TOO_LARGE";
    throw error;
  }

  const pdfBase64 = await convertBlobToBase64(blob);
  const fileName = createCertificatePdfFileName(certificate);

  return {
    blob,
    pdfBase64,
    fileName
  };
};

export { generateCertificatePdfBlob };
export default generateCertificatePdfBlob;
