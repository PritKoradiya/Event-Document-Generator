import { safeFileName } from "./downloadCertificatePdf.js";

/**
 * Creates a clean, safe, standardized PDF filename for a certificate.
 * Format: Participant_Name_CERT-2026-0001.pdf
 *
 * @param {Object} certificate
 * @param {number} [fallbackIndex=1]
 * @returns {string}
 */
export const createCertificatePdfFileName = (certificate, fallbackIndex = 1) => {
  const participantName = safeFileName(certificate?.participantName || `Participant_${fallbackIndex}`);
  const certificateId = certificate?.certificateId
    ? safeFileName(certificate.certificateId)
    : `CERT_${fallbackIndex}`;

  return `${participantName}_${certificateId}.pdf`;
};

export default createCertificatePdfFileName;
