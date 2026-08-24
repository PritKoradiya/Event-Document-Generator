import JSZip from "jszip";
import { generateCertificatePdfBlob, safeFileName } from "./downloadCertificatePdf.js";
import { getPayloadSizeMb } from "./getPayloadSizeMb.js";

export const BULK_REQUEST_CHUNK_SIZE = 50;
export const MAX_PARTICIPANTS_LIMIT = 1000;
export const MAX_CHUNK_PAYLOAD_MB = 8.0;
export const FALLBACK_CHUNK_SIZES = [50, 25, 10];

/**
 * Splits an array into chunks of the specified size.
 *
 * @template T
 * @param {T[]} array
 * @param {number} size
 * @returns {T[][]}
 */
export const chunkArray = (array, size = BULK_REQUEST_CHUNK_SIZE) => {
  if (!Array.isArray(array) || array.length === 0) return [];
  const chunkSize = Math.max(1, Math.floor(size));
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

/**
 * Cleans and normalizes signature boxes array.
 */
export const cleanSignatureBoxes = (boxes) => {
  if (!Array.isArray(boxes)) return [];
  return boxes.filter(
    (box) =>
      (box?.signerName && box.signerName.trim() !== "") ||
      (box?.signerDesignation && box.signerDesignation.trim() !== "")
  );
};

/**
 * Normalizes common certificate details for bulk requests and preview.
 */
export const buildCleanCommonDetails = (commonDetails = {}) => {
  const cleanedBoxes = cleanSignatureBoxes(commonDetails.signatureBoxes);

  return {
    organizationName: (commonDetails.organizationName || "").trim(),
    eventName: (commonDetails.eventName || "").trim(),
    certificateCategory: (commonDetails.certificateCategory || "").trim(),
    certificateTitle: (commonDetails.certificateTitle || "Certificate of Participation").trim(),
    eventDate: commonDetails.eventDate || "",
    description: (commonDetails.description || "For successfully participating in the event.").trim(),
    templateStyle: commonDetails.templateStyle || "Classic Certificate",
    signatureBoxes: cleanedBoxes,
    singleSignaturePosition: commonDetails.singleSignaturePosition || "center",
    // Backward-compatibility signature fields
    drSignatureName: cleanedBoxes[0]?.signerName || "",
    drSignatureMode: cleanedBoxes[0]?.signatureMode || "blank",
    drSignatureImage: cleanedBoxes[0]?.signatureImage || null,
    authorizedSignatureName: cleanedBoxes[1]?.signerName || "",
    authorizedSignatureMode: cleanedBoxes[1]?.signatureMode || "blank",
    authorizedSignatureImage: cleanedBoxes[1]?.signatureImage || null,
    signatureLayout: cleanedBoxes.length === 1 ? "dr-only" : cleanedBoxes.length >= 2 ? "both" : "none"
  };
};

/**
 * Parses raw CSV text into a validated participant list.
 * Supports standard CSVs with header "participantName" or legacy columns.
 */
export const parseParticipantCsv = (csvText) => {
  if (!csvText || typeof csvText !== "string") {
    return {
      participants: [],
      validCount: 0,
      invalidCount: 0,
      totalRows: 0,
      errors: ["CSV file is empty."]
    };
  }

  const rawLines = csvText.split(/\r?\n/);
  if (rawLines.length === 0) {
    return {
      participants: [],
      validCount: 0,
      invalidCount: 0,
      totalRows: 0,
      errors: ["CSV file is empty. No participant rows found."]
    };
  }

  // Find first non-empty line to check for header
  let headerRowIndex = -1;
  let targetColIndex = 0;
  let hasHeader = false;

  for (let i = 0; i < rawLines.length; i++) {
    const trimmed = rawLines[i].trim();
    if (trimmed.length > 0) {
      const cols = trimmed.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
      const matchIndex = cols.findIndex((col) => {
        const lower = col.toLowerCase().replace(/[\s_-]/g, "");
        return (
          lower === "participantname" ||
          lower === "participant" ||
          lower === "studentname" ||
          lower === "student" ||
          lower === "name" ||
          lower === "fullname"
        );
      });
      if (matchIndex !== -1) {
        headerRowIndex = i;
        targetColIndex = matchIndex;
        hasHeader = true;
      }
      break;
    }
  }

  const parsedParticipants = [];
  const errors = [];
  const startLineIndex = hasHeader ? headerRowIndex + 1 : 0;

  for (let i = startLineIndex; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const trimmedLine = rawLine.trim();

    // Ignore trailing completely empty lines at the very end of the file
    if (trimmedLine.length === 0 && i === rawLines.length - 1) {
      continue;
    }

    const rowNumber = i + 1;
    const cols = rawLine.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const rawName = cols[targetColIndex] !== undefined ? cols[targetColIndex] : (cols[0] || "");
    const trimmedName = rawName.trim();

    if (!trimmedName) {
      errors.push(`CSV Row ${rowNumber}: Participant name is missing.`);
      parsedParticipants.push({
        id: `csv-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        participantName: "",
        rowNumber,
        isInvalid: true
      });
    } else {
      parsedParticipants.push({
        id: `csv-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        participantName: trimmedName,
        rowNumber,
        isInvalid: false
      });
    }
  }

  const validCount = parsedParticipants.filter((p) => !p.isInvalid && p.participantName.length > 0).length;
  const invalidCount = parsedParticipants.length - validCount;

  return {
    participants: parsedParticipants,
    validCount,
    invalidCount,
    totalRows: parsedParticipants.length,
    errors
  };
};

/**
 * Parses manual line-by-line participant names.
 */
export const parseManualParticipantList = (manualText) => {
  if (!manualText || typeof manualText !== "string") {
    return { participants: [], count: 0 };
  }

  const lines = manualText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const participants = lines.map((name, index) => ({
    id: `manual-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
    participantName: name,
    isInvalid: false
  }));

  return {
    participants,
    count: participants.length
  };
};

/**
 * Executes chunked bulk generation with auto 413 reduction, preflight size check, and progress tracking.
 *
 * @param {Object} options
 * @param {Array} options.participants
 * @param {Object} options.commonDetails
 * @param {Function} options.bulkApiFn
 * @param {Function} [options.onProgress]
 * @param {Function} [options.onChunkSuccess]
 * @param {Function} [options.shouldCancel]
 * @param {number} [options.startIndex=0]
 * @returns {Promise<Object>}
 */
export const executeChunkedBulkGeneration = async ({
  participants,
  commonDetails,
  bulkApiFn,
  onProgress,
  onChunkSuccess,
  shouldCancel,
  startIndex = 0
}) => {
  const validParticipants = (participants || []).filter(
    (p) => p && p.participantName && p.participantName.trim().length > 0
  );

  const totalParticipants = validParticipants.length;
  if (totalParticipants === 0) {
    throw new Error("No valid participants to generate.");
  }

  if (totalParticipants > MAX_PARTICIPANTS_LIMIT) {
    throw new Error(`Maximum ${MAX_PARTICIPANTS_LIMIT} participants can be generated at once.`);
  }

  const cleanCommon = buildCleanCommonDetails(commonDetails);
  const remainingParticipants = validParticipants.slice(startIndex);

  let allGeneratedCertificates = [];
  const processedCertificateIds = new Set();

  const addUniqueCertificates = (newCerts) => {
    if (!Array.isArray(newCerts)) return;
    for (const cert of newCerts) {
      const key = cert.certificateId || cert._id || `${cert.participantName}-${Date.now()}`;
      if (!processedCertificateIds.has(key)) {
        processedCertificateIds.add(key);
        allGeneratedCertificates.push(cert);
      }
    }
  };

  let currentIndex = 0;
  let chunkNumber = Math.floor(startIndex / BULK_REQUEST_CHUNK_SIZE) + 1;
  const estimatedTotalChunks = Math.ceil(totalParticipants / BULK_REQUEST_CHUNK_SIZE);

  onProgress?.({
    currentBatch: chunkNumber,
    totalBatches: estimatedTotalChunks,
    processedCount: startIndex,
    totalCount: totalParticipants,
    message: `Preparing ${totalParticipants} certificates...`
  });

  while (currentIndex < remainingParticipants.length) {
    if (shouldCancel && shouldCancel()) {
      return {
        success: false,
        cancelled: true,
        generatedCertificates: allGeneratedCertificates,
        processedCount: allGeneratedCertificates.length,
        totalCount: totalParticipants,
        failedCount: totalParticipants - (startIndex + allGeneratedCertificates.length),
        message: "Bulk generation cancelled by user."
      };
    }

    let currentChunkSize = BULK_REQUEST_CHUNK_SIZE;
    let chunkItems = remainingParticipants.slice(currentIndex, currentIndex + currentChunkSize);

    // Fallback loop for oversized payloads or 413 responses
    let chunkSuccess = false;
    let fallbackIndex = 0;
    let lastError = null;

    while (!chunkSuccess && fallbackIndex < FALLBACK_CHUNK_SIZES.length) {
      currentChunkSize = FALLBACK_CHUNK_SIZES[fallbackIndex];
      chunkItems = remainingParticipants.slice(currentIndex, currentIndex + currentChunkSize);

      if (chunkItems.length === 0) break;

      const chunkPayload = {
        participants: chunkItems.map((p) => ({
          participantName: p.participantName.trim()
        })),
        commonDetails: cleanCommon
      };

      // Preflight size check
      const payloadSizeMb = getPayloadSizeMb(chunkPayload);
      if (payloadSizeMb > MAX_CHUNK_PAYLOAD_MB) {
        if (fallbackIndex < FALLBACK_CHUNK_SIZES.length - 1) {
          fallbackIndex += 1;
          continue;
        } else {
          throw new Error("Bulk request is too large. Please use smaller signature images.");
        }
      }

      const currentProcessedSoFar = startIndex + allGeneratedCertificates.length;
      onProgress?.({
        currentBatch: chunkNumber,
        totalBatches: estimatedTotalChunks,
        processedCount: currentProcessedSoFar,
        totalCount: totalParticipants,
        message: `Batch ${chunkNumber} / ${estimatedTotalChunks} — Generating certificates: ${currentProcessedSoFar} / ${totalParticipants}`
      });

      try {
        const response = await bulkApiFn(chunkPayload);
        const savedCertificates = response?.data || [];

        if (savedCertificates.length === 0) {
          throw new Error("Server returned an empty certificate list for the batch.");
        }

        addUniqueCertificates(savedCertificates);
        onChunkSuccess?.(savedCertificates, chunkItems);

        chunkSuccess = true;
        currentIndex += chunkItems.length;
        chunkNumber += 1;

        const updatedCount = startIndex + allGeneratedCertificates.length;
        onProgress?.({
          currentBatch: chunkNumber - 1,
          totalBatches: estimatedTotalChunks,
          processedCount: updatedCount,
          totalCount: totalParticipants,
          message: `Generating certificates: ${updatedCount} / ${totalParticipants}`
        });
      } catch (error) {
        lastError = error;

        // Check if 413 (Payload Too Large)
        const is413 =
          error.status === 413 ||
          (error.message && error.message.toLowerCase().includes("too large"));

        if (is413 && fallbackIndex < FALLBACK_CHUNK_SIZES.length - 1) {
          fallbackIndex += 1;
          onProgress?.({
            currentBatch: chunkNumber,
            totalBatches: estimatedTotalChunks,
            processedCount: startIndex + allGeneratedCertificates.length,
            totalCount: totalParticipants,
            message: "Bulk request is too large. The system will reduce the batch size automatically."
          });
          // Small pause before retrying with smaller sub-chunk
          await new Promise((resolve) => setTimeout(resolve, 200));
        } else {
          // Non-recoverable chunk error
          return {
            success: false,
            cancelled: false,
            generatedCertificates: allGeneratedCertificates,
            processedCount: allGeneratedCertificates.length,
            totalCount: totalParticipants,
            failedStartIndex: startIndex + allGeneratedCertificates.length,
            failedCount: totalParticipants - (startIndex + allGeneratedCertificates.length),
            failedBatchNumber: chunkNumber,
            error: lastError,
            message: `${startIndex + allGeneratedCertificates.length} of ${totalParticipants} certificates generated. Batch ${chunkNumber} failed: ${lastError.message}`
          };
        }
      }
    }

    if (!chunkSuccess) {
      return {
        success: false,
        cancelled: false,
        generatedCertificates: allGeneratedCertificates,
        processedCount: allGeneratedCertificates.length,
        totalCount: totalParticipants,
        failedStartIndex: startIndex + allGeneratedCertificates.length,
        failedCount: totalParticipants - (startIndex + allGeneratedCertificates.length),
        failedBatchNumber: chunkNumber,
        error: lastError || new Error("Failed to process batch after fallback attempts."),
        message: `${startIndex + allGeneratedCertificates.length} of ${totalParticipants} certificates generated. Batch ${chunkNumber} failed.`
      };
    }
  }

  const finalCount = startIndex + allGeneratedCertificates.length;
  onProgress?.({
    currentBatch: estimatedTotalChunks,
    totalBatches: estimatedTotalChunks,
    processedCount: finalCount,
    totalCount: totalParticipants,
    message: `Bulk generation completed. Generated: ${finalCount} / ${totalParticipants} certificates`
  });

  return {
    success: finalCount === totalParticipants,
    cancelled: false,
    generatedCertificates: allGeneratedCertificates,
    processedCount: finalCount,
    totalCount: totalParticipants,
    failedCount: totalParticipants - finalCount,
    message: `Bulk generation completed. Generated: ${finalCount} / ${totalParticipants} certificates.`
  };
};

/**
 * Creates a unique safe filename for a certificate inside a ZIP archive.
 */
export const createZipEntryFileName = (certificate, index = 0, usedNamesSet = new Set()) => {
  const baseParticipant = safeFileName(certificate.participantName || `Participant_${index + 1}`);
  const baseCertId = certificate.certificateId
    ? safeFileName(certificate.certificateId)
    : `cert_${index + 1}`;

  let candidateName = `${baseParticipant}_${baseCertId}.pdf`;

  if (usedNamesSet.has(candidateName.toLowerCase())) {
    let suffix = 2;
    while (usedNamesSet.has(`${baseParticipant}_${baseCertId}_${suffix}.pdf`.toLowerCase())) {
      suffix += 1;
    }
    candidateName = `${baseParticipant}_${baseCertId}_${suffix}.pdf`;
  }

  usedNamesSet.add(candidateName.toLowerCase());
  return candidateName;
};

/**
 * Generates a ZIP archive containing all generated certificate PDFs sequentially.
 *
 * @param {Object} options
 * @param {Array} options.certificates
 * @param {Object} options.commonDetails
 * @param {Function} options.renderCertificateBlob
 * @param {Function} [options.onProgress]
 * @param {Function} [options.shouldCancel]
 * @returns {Promise<Object>}
 */
export const generateBulkZipArchive = async ({
  certificates = [],
  commonDetails = {},
  renderCertificateBlob,
  onProgress,
  shouldCancel
}) => {
  if (!Array.isArray(certificates) || certificates.length === 0) {
    throw new Error("No certificates provided for ZIP generation.");
  }

  const zip = new JSZip();
  const totalCount = certificates.length;
  const usedFileNames = new Set();
  const failedNames = [];
  let successfulPdfCount = 0;

  onProgress?.({
    current: 0,
    total: totalCount,
    message: "Preparing ZIP..."
  });

  for (let index = 0; index < totalCount; index += 1) {
    if (shouldCancel && shouldCancel()) {
      break;
    }

    const certificate = certificates[index];
    const currentNumber = index + 1;

    onProgress?.({
      current: currentNumber,
      total: totalCount,
      message: `Creating ZIP: ${currentNumber} / ${totalCount}`
    });

    try {
      const pdfBlob = await renderCertificateBlob(certificate, index);
      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error("Generated PDF blob is empty.");
      }

      const fileName = createZipEntryFileName(certificate, index, usedFileNames);
      zip.file(fileName, pdfBlob);
      successfulPdfCount += 1;
    } catch (error) {
      console.error(`PDF generation failed for participant at index ${index} (${certificate.participantName}):`, error);
      failedNames.push(certificate.participantName || `Item ${currentNumber}`);
    }

    // Yield control to browser event loop to prevent UI freezing
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 25)));
  }

  if (successfulPdfCount === 0) {
    throw new Error("ZIP generation failed. No certificate PDFs could be created.");
  }

  onProgress?.({
    current: totalCount,
    total: totalCount,
    message: "Finalizing ZIP..."
  });

  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });

  const eventName = safeFileName(commonDetails.eventName || "Event");
  const todayDate = new Date().toISOString().split("T")[0];
  const zipFileName = `Event_Certificates_${eventName}_${todayDate}.zip`;

  return {
    success: successfulPdfCount > 0,
    zipBlob,
    zipFileName,
    totalCount,
    successfulPdfCount,
    failedCount: failedNames.length,
    failedNames
  };
};

export default {
  BULK_REQUEST_CHUNK_SIZE,
  MAX_PARTICIPANTS_LIMIT,
  MAX_CHUNK_PAYLOAD_MB,
  FALLBACK_CHUNK_SIZES,
  chunkArray,
  cleanSignatureBoxes,
  buildCleanCommonDetails,
  parseParticipantCsv,
  parseManualParticipantList,
  executeChunkedBulkGeneration,
  createZipEntryFileName,
  generateBulkZipArchive
};
