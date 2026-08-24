import mongoose from "mongoose";
import Certificate from "../models/Certificate.js";
import { isEmailConfigured } from "../config/email.js";
import emailService from "../services/emailService.js";
import emailQueueService from "../services/emailQueueService.js";
import { normalizeEmail } from "../utils/normalizeEmail.js";
import { isValidEmail } from "../utils/validateEmail.js";
import { generateCertificateEmailContent } from "../utils/certificateEmailTemplate.js";

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const createCertificateIdFromNumber = (number) => {
  return `CERT-2026-${String(number).padStart(4, "0")}`;
};

const getNextCertificateNumber = async () => {
  const certificates = await Certificate.find(
    { certificateId: /^CERT-2026-[0-9]+$/ },
    { certificateId: 1, _id: 0 }
  ).lean();

  const latestNumber = certificates.reduce((highest, certificate) => {
    const number = Number(certificate.certificateId.replace("CERT-2026-", ""));
    return Number.isSafeInteger(number) ? Math.max(highest, number) : highest;
  }, 0);

  return latestNumber + 1;
};

const generateCertificateId = async () => {
  const nextNumber = await getNextCertificateNumber();

  return createCertificateIdFromNumber(nextNumber);
};

const requiredFields = [
  "participantName",
  "organizationName",
  "eventName",
  "certificateCategory",
  "certificateTitle",
  "eventDate",
  "templateStyle"
];

const signatureModes = ["blank", "image"];
const signatureLayouts = ["dr-only", "authorized-only", "both"];
const singleSignaturePositions = ["left", "center", "right"];
const maxSignatureImageBytes = 2 * 1024 * 1024;
const MAX_PDF_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB maximum attachment limit
const maxBulkParticipants = 1000;
const BULK_INSERT_CHUNK_SIZE = 50;
const legacySignatureFields = [
  "drSignatureName",
  "drSignatureMode",
  "drSignatureImage",
  "authorizedSignatureName",
  "authorizedSignatureMode",
  "authorizedSignatureImage",
  "signatureLayout"
];

class SignatureConfigurationError extends Error {}

const hasOwnProperty = (object, property) => Object.prototype.hasOwnProperty.call(object, property);

const getSignatureField = (source, existingCertificate, field, defaultValue) => {
  if (hasOwnProperty(source, field)) {
    return source[field];
  }

  return existingCertificate?.[field] ?? defaultValue;
};

const getDataUrlByteLength = (image) => {
  const [, base64Data] = image.split(",", 2);
  return Math.floor((base64Data.length * 3) / 4) - (base64Data.endsWith("==") ? 2 : base64Data.endsWith("=") ? 1 : 0);
};

const validateSignatureImage = (image, mode) => {
  if (mode === "blank") {
    if (image !== null && image !== undefined) {
      throw new SignatureConfigurationError("Signature image must be null when signature mode is blank");
    }

    return null;
  }

  if (typeof image !== "string" || image.trim().length === 0) {
    throw new SignatureConfigurationError("Signature image is required when signature mode is image");
  }

  const trimmedImage = image.trim();
  const isImageDataUrl = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/i.test(trimmedImage);
  const isSafeImagePath = /^(https?:\/\/[^\s]+|\/uploads\/[^\s]+)$/i.test(trimmedImage);

  if (!isImageDataUrl && !isSafeImagePath) {
    throw new SignatureConfigurationError("Signature image must be a valid image data URL or safe image path");
  }

  if (isImageDataUrl && getDataUrlByteLength(trimmedImage) > maxSignatureImageBytes) {
    throw new SignatureConfigurationError("Signature image is too large. Please use a smaller image.");
  }

  return image;
};

const validateSignatureBoxes = (signatureBoxes) => {
  if (!Array.isArray(signatureBoxes)) {
    throw new SignatureConfigurationError("signatureBoxes must be an array");
  }

  if (signatureBoxes.length > 3) {
    throw new SignatureConfigurationError("Maximum 3 signature boxes are allowed");
  }

  return signatureBoxes.map((box) => {
    if (!box || typeof box !== "object" || Array.isArray(box)) {
      throw new SignatureConfigurationError("Each signature box must be an object");
    }

    const signerName = box.signerName ?? "";
    const signerDesignation = box.signerDesignation ?? "";
    const signatureMode = box.signatureMode ?? "blank";
    const signatureImage = box.signatureImage ?? null;

    if (typeof signerName !== "string" || typeof signerDesignation !== "string") {
      throw new SignatureConfigurationError("Signer name and designation must be strings");
    }

    if (signerName.trim().length === 0 && signerDesignation.trim().length === 0) {
      throw new SignatureConfigurationError("Signature box must contain a signer name or designation.");
    }

    if (!signatureModes.includes(signatureMode)) {
      throw new SignatureConfigurationError("Invalid signature mode");
    }

    return {
      signerName,
      signerDesignation,
      signatureMode,
      signatureImage: validateSignatureImage(signatureImage, signatureMode)
    };
  });
};

const getSignatureConfiguration = (source = {}, existingCertificate = null) => {
  const singleSignaturePosition = getSignatureField(source, existingCertificate, "singleSignaturePosition", "center");

  if (!singleSignaturePositions.includes(singleSignaturePosition)) {
    throw new SignatureConfigurationError("Invalid single signature position");
  }

  if (hasOwnProperty(source, "signatureBoxes")) {
    return {
      signatureBoxes: validateSignatureBoxes(source.signatureBoxes),
      singleSignaturePosition
    };
  }

  const includesLegacySignatureFields = legacySignatureFields.some((field) => hasOwnProperty(source, field));

  if (!includesLegacySignatureFields && existingCertificate && Array.isArray(existingCertificate.signatureBoxes)) {
    return {
      signatureBoxes: existingCertificate.signatureBoxes,
      singleSignaturePosition
    };
  }

  const drSignatureMode = getSignatureField(source, existingCertificate, "drSignatureMode", "blank");
  const authorizedSignatureMode = getSignatureField(source, existingCertificate, "authorizedSignatureMode", "blank");
  const signatureLayout = getSignatureField(source, existingCertificate, "signatureLayout", "both");

  if (!signatureModes.includes(drSignatureMode)) {
    throw new SignatureConfigurationError("Invalid legacy doctor signature mode");
  }

  if (!signatureModes.includes(authorizedSignatureMode)) {
    throw new SignatureConfigurationError("Invalid legacy authorized signature mode");
  }

  if (!signatureLayouts.includes(signatureLayout)) {
    throw new SignatureConfigurationError("Invalid signature layout");
  }

  const drSignatureImage = validateSignatureImage(
    getSignatureField(source, existingCertificate, "drSignatureImage", null),
    drSignatureMode
  );
  const authorizedSignatureImage = validateSignatureImage(
    getSignatureField(source, existingCertificate, "authorizedSignatureImage", null),
    authorizedSignatureMode
  );

  return {
    drSignatureName: getSignatureField(source, existingCertificate, "drSignatureName", ""),
    drSignatureMode,
    drSignatureImage,
    authorizedSignatureName: getSignatureField(source, existingCertificate, "authorizedSignatureName", ""),
    authorizedSignatureMode,
    authorizedSignatureImage,
    signatureLayout,
    singleSignaturePosition,
    signatureBoxes: []
  };
};

const addSignatureDefaults = (certificate) => {
  const certificateData = certificate.toObject ? certificate.toObject() : certificate;

  return {
    ...certificateData,
    signatureBoxes: Array.isArray(certificateData.signatureBoxes) ? certificateData.signatureBoxes : [],
    drSignatureName: certificateData.drSignatureName ?? "",
    drSignatureMode: certificateData.drSignatureMode ?? "blank",
    drSignatureImage: certificateData.drSignatureImage ?? null,
    authorizedSignatureName: certificateData.authorizedSignatureName ?? "",
    authorizedSignatureMode: certificateData.authorizedSignatureMode ?? "blank",
    authorizedSignatureImage: certificateData.authorizedSignatureImage ?? null,
    signatureLayout: certificateData.signatureLayout ?? "both",
    singleSignaturePosition: certificateData.singleSignaturePosition ?? "center",
    recipientEmail: certificateData.recipientEmail ?? "",
    emailStatus: certificateData.emailStatus ?? "not-sent",
    emailSentAt: certificateData.emailSentAt ?? null,
    emailLastError: certificateData.emailLastError ?? "",
    emailSendAttempts: certificateData.emailSendAttempts ?? 0
  };
};

const sendCertificateError = (error, res, fallbackMessage) => {
  if (error instanceof SignatureConfigurationError || error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  return res.status(500).json({
    success: false,
    message: fallbackMessage
  });
};

const copySignatureConfiguration = (signatureConfiguration) => ({
  ...signatureConfiguration,
  signatureBoxes: signatureConfiguration.signatureBoxes.map((box) => ({ ...box }))
});

const validateBulkParticipants = (participants) => {
  if (!Array.isArray(participants) || participants.length === 0) {
    throw new SignatureConfigurationError("Participants must be a non-empty array.");
  }

  if (participants.length > maxBulkParticipants) {
    throw new SignatureConfigurationError("Maximum 1000 participants can be generated at once.");
  }

  return participants.map((participant) => {
    if (!participant || typeof participant !== "object" || Array.isArray(participant)) {
      throw new SignatureConfigurationError("Each participant must be an object.");
    }

    if (hasOwnProperty(participant, "signatureBoxes")) {
      throw new SignatureConfigurationError("signatureBoxes must be provided only in commonDetails.");
    }

    if (hasOwnProperty(participant, "singleSignaturePosition")) {
      throw new SignatureConfigurationError("singleSignaturePosition must be provided only in commonDetails.");
    }

    // Support participantName aliases: participantName > fullName > name
    const rawParticipantName =
      participant.participantName ??
      participant.fullName ??
      participant.name ??
      "";

    if (typeof rawParticipantName !== "string" || rawParticipantName.trim().length === 0) {
      throw new SignatureConfigurationError("Participant name is required for every participant.");
    }

    if (
      participant.organizationName !== undefined &&
      participant.organizationName !== null &&
      typeof participant.organizationName !== "string"
    ) {
      throw new SignatureConfigurationError("Participant organization name must be a string.");
    }

    // Support email aliases: email > recipientEmail > emailAddress
    const rawEmail =
      participant.email ??
      participant.recipientEmail ??
      participant.emailAddress ??
      "";

    const normalizedEmail = normalizeEmail(rawEmail);

    if (normalizedEmail.length > 0 && !isValidEmail(normalizedEmail)) {
      throw new SignatureConfigurationError(`Invalid email format for participant: ${rawParticipantName.trim()}`);
    }

    return {
      participantName: rawParticipantName.trim(),
      organizationName: participant.organizationName?.trim(),
      recipientEmail: normalizedEmail
    };
  });
};

const insertCertificatesInChunks = async (certificates) => {
  const savedCertificates = [];

  for (let start = 0; start < certificates.length; start += BULK_INSERT_CHUNK_SIZE) {
    const chunk = certificates.slice(start, start + BULK_INSERT_CHUNK_SIZE);
    const savedChunk = await Certificate.insertMany(chunk, { ordered: true });
    savedCertificates.push(...savedChunk);
  }

  return savedCertificates;
};

export const createCertificate = async (req, res) => {
  try {
    const participantName = (
      req.body.participantName ??
      req.body.fullName ??
      req.body.name ??
      ""
    ).trim();

    const normalizedBody = {
      ...req.body,
      participantName
    };

    const missingFields = requiredFields.filter((field) => !normalizedBody[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`
      });
    }

    const rawEmail = req.body.recipientEmail ?? req.body.email ?? req.body.emailAddress ?? "";
    const normalizedEmail = normalizeEmail(rawEmail);

    if (normalizedEmail.length > 0 && !isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_EMAIL",
        message: "Please provide a valid recipient email address."
      });
    }

    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please set MONGO_URI and restart the server."
      });
    }

    const signatureConfiguration = getSignatureConfiguration(normalizedBody);
    const certificateId = await generateCertificateId();
    const certificate = await Certificate.create({
      ...normalizedBody,
      ...signatureConfiguration,
      generationType: "Single",
      status: "Generated",
      certificateId,
      recipientEmail: normalizedEmail,
      emailStatus: "not-sent",
      emailSentAt: null,
      emailLastError: "",
      emailSendAttempts: 0
    });

    return res.status(201).json({
      success: true,
      message: "Certificate generated successfully",
      data: addSignatureDefaults(certificate)
    });
  } catch (error) {
    return sendCertificateError(error, res, "Failed to generate certificate");
  }
};

export const saveDraftCertificate = async (req, res) => {
  try {
    const participantName = (
      req.body.participantName ??
      req.body.fullName ??
      req.body.name ??
      ""
    ).trim();

    const rawEmail = req.body.recipientEmail ?? req.body.email ?? req.body.emailAddress ?? "";
    const normalizedEmail = normalizeEmail(rawEmail);

    if (normalizedEmail.length > 0 && !isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_EMAIL",
        message: "Please provide a valid recipient email address."
      });
    }

    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please set MONGO_URI and restart the server."
      });
    }

    const signatureConfiguration = getSignatureConfiguration(req.body);
    const certificateId = req.body.certificateId || (await generateCertificateId());
    const certificate = await Certificate.create({
      participantName,
      organizationName: req.body.organizationName || "",
      eventName: req.body.eventName || "",
      certificateCategory: req.body.certificateCategory || "",
      certificateTitle: req.body.certificateTitle || "",
      eventDate: req.body.eventDate || "",
      description: req.body.description || "",
      templateStyle: req.body.templateStyle || "",
      ...signatureConfiguration,
      certificateId,
      status: "Draft",
      generationType: "Single",
      recipientEmail: normalizedEmail,
      emailStatus: "not-sent",
      emailSentAt: null,
      emailLastError: "",
      emailSendAttempts: 0
    });

    return res.status(201).json({
      success: true,
      message: "Certificate draft saved successfully",
      data: addSignatureDefaults(certificate)
    });
  } catch (error) {
    return sendCertificateError(error, res, "Failed to save certificate draft");
  }
};

export const bulkCreateCertificates = async (req, res) => {
  try {
    const { participants, commonDetails } = req.body;

    if (!commonDetails || typeof commonDetails !== "object" || Array.isArray(commonDetails)) {
      return res.status(400).json({
        success: false,
        message: "Common certificate details are required."
      });
    }

    const requiredCommonFields = [
      "eventName",
      "certificateCategory",
      "certificateTitle",
      "eventDate",
      "templateStyle"
    ];
    const missingCommonFields = requiredCommonFields.filter((field) => !commonDetails[field]);

    if (missingCommonFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required common fields: ${missingCommonFields.join(", ")}`
      });
    }

    const validatedParticipants = validateBulkParticipants(participants);

    const commonOrg = typeof commonDetails.organizationName === "string" ? commonDetails.organizationName.trim() : "";

    const hasMissingOrg = validatedParticipants.some(
      (p) => !commonOrg && (!p.organizationName || p.organizationName.trim().length === 0)
    );

    if (hasMissingOrg) {
      return res.status(400).json({
        success: false,
        message: "Organization name is required."
      });
    }

    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please set MONGO_URI and restart the server."
      });
    }

    const signatureConfiguration = getSignatureConfiguration(commonDetails);
    const nextCertificateNumber = await getNextCertificateNumber();

    const certificatesToSave = validatedParticipants.map((participant, index) => {
      const organizationName = commonOrg || participant.organizationName || "Organization Name";

      return {
        participantName: participant.participantName,
        organizationName,
        eventName: commonDetails.eventName,
        certificateCategory: commonDetails.certificateCategory,
        certificateTitle: commonDetails.certificateTitle,
        eventDate: commonDetails.eventDate,
        description: commonDetails.description || "",
        templateStyle: commonDetails.templateStyle,
        ...copySignatureConfiguration(signatureConfiguration),
        certificateId: createCertificateIdFromNumber(nextCertificateNumber + index),
        generationType: "Bulk",
        status: "Generated",
        recipientEmail: participant.recipientEmail || "",
        emailStatus: "not-sent",
        emailSentAt: null,
        emailLastError: "",
        emailSendAttempts: 0
      };
    });

    const savedCertificates = await insertCertificatesInChunks(certificatesToSave);

    return res.status(201).json({
      success: true,
      message: "Bulk certificates generated successfully",
      count: savedCertificates.length,
      data: savedCertificates.map(addSignatureDefaults)
    });
  } catch (error) {
    if (error instanceof SignatureConfigurationError || error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (!isDatabaseConnected() || error.name === "MongoServerSelectionError") {
      return res.status(503).json({
        success: false,
        message: "Bulk certificate generation failed because the database could not complete the operation."
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Bulk certificate generation failed because a certificate ID already exists. Please try again."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Bulk certificate generation failed because the database could not complete the operation."
    });
  }
};

export const getCertificates = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please set MONGO_URI and restart the server."
      });
    }

    const certificates = await Certificate.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: certificates.length,
      data: certificates.map(addSignatureDefaults)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch certificates"
    });
  }
};

export const getCertificateById = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please set MONGO_URI and restart the server."
      });
    }

    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Certificate fetched successfully",
      data: addSignatureDefaults(certificate)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch certificate"
    });
  }
};

export const updateCertificate = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please set MONGO_URI and restart the server."
      });
    }

    const existingCertificate = await Certificate.findById(req.params.id);

    if (!existingCertificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found"
      });
    }

    let recipientEmail = existingCertificate.recipientEmail || "";
    let emailStatus = existingCertificate.emailStatus || "not-sent";
    let emailSentAt = existingCertificate.emailSentAt || null;
    let emailLastError = existingCertificate.emailLastError || "";
    let emailSendAttempts = existingCertificate.emailSendAttempts || 0;

    if (
      hasOwnProperty(req.body, "recipientEmail") ||
      hasOwnProperty(req.body, "email") ||
      hasOwnProperty(req.body, "emailAddress")
    ) {
      const rawEmail = req.body.recipientEmail ?? req.body.email ?? req.body.emailAddress;
      const normalizedEmail = normalizeEmail(rawEmail);

      if (normalizedEmail.length > 0 && !isValidEmail(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          code: "INVALID_EMAIL",
          message: "Please provide a valid recipient email address."
        });
      }

      // If email has changed, reset email status
      if (normalizedEmail !== normalizeEmail(existingCertificate.recipientEmail)) {
        recipientEmail = normalizedEmail;
        emailStatus = "not-sent";
        emailSentAt = null;
        emailLastError = "";
        emailSendAttempts = 0;
      }
    }

    let participantName = existingCertificate.participantName;
    if (
      hasOwnProperty(req.body, "participantName") ||
      hasOwnProperty(req.body, "fullName") ||
      hasOwnProperty(req.body, "name")
    ) {
      participantName = (
        req.body.participantName ??
        req.body.fullName ??
        req.body.name ??
        existingCertificate.participantName
      ).trim();
    }

    const signatureConfiguration = getSignatureConfiguration(req.body, existingCertificate);
    const updateData = {
      ...req.body,
      ...signatureConfiguration,
      participantName,
      recipientEmail,
      emailStatus,
      emailSentAt,
      emailLastError,
      emailSendAttempts,
      certificateId: existingCertificate.certificateId || req.body.certificateId || (await generateCertificateId()),
      status: req.body.status || existingCertificate.status
    };

    const updatedCertificate = await Certificate.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    return res.status(200).json({
      success: true,
      message: "Certificate updated successfully",
      data: addSignatureDefaults(updatedCertificate)
    });
  } catch (error) {
    return sendCertificateError(error, res, "Failed to update certificate");
  }
};

export const deleteCertificate = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please set MONGO_URI and restart the server."
      });
    }

    const deletedCertificate = await Certificate.findByIdAndDelete(req.params.id);

    if (!deletedCertificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Certificate deleted successfully",
      data: deletedCertificate
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete certificate"
    });
  }
};

/**
 * Extracts and validates PDF Base64 string from request body into a clean Buffer.
 */
const extractAndValidatePdfBuffer = (pdfBase64) => {
  if (!pdfBase64 || typeof pdfBase64 !== "string" || pdfBase64.trim().length === 0) {
    const error = new Error("Certificate PDF is required.");
    error.code = "PDF_REQUIRED";
    error.status = 400;
    throw error;
  }

  let cleanBase64 = pdfBase64.trim();
  if (cleanBase64.includes(",")) {
    const parts = cleanBase64.split(",");
    cleanBase64 = parts[1] || "";
  }

  // Remove any whitespace or newlines inside base64 string
  cleanBase64 = cleanBase64.replace(/\s/g, "");

  let buffer;
  try {
    buffer = Buffer.from(cleanBase64, "base64");
  } catch (err) {
    const error = new Error("The certificate PDF could not be processed.");
    error.code = "INVALID_PDF";
    error.status = 400;
    throw error;
  }

  if (!buffer || buffer.length === 0) {
    const error = new Error("The certificate PDF could not be processed.");
    error.code = "INVALID_PDF";
    error.status = 400;
    throw error;
  }

  // Basic PDF Header Validation (magic bytes %PDF)
  const header = buffer.subarray(0, 5).toString("ascii");
  if (!header.startsWith("%PDF")) {
    const error = new Error("The certificate PDF could not be processed.");
    error.code = "INVALID_PDF";
    error.status = 400;
    throw error;
  }

  // Enforce Max Attachment Size (5 MB)
  if (buffer.length > MAX_PDF_ATTACHMENT_BYTES) {
    const error = new Error("Certificate PDF is too large to send by email.");
    error.code = "PDF_TOO_LARGE";
    error.status = 413;
    throw error;
  }

  return buffer;
};

/**
 * Single certificate email dispatch endpoint.
 * POST /api/certificates/:id/send-email
 */
export const sendCertificateEmailController = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please set MONGO_URI and restart the server."
      });
    }

    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found"
      });
    }

    // Authoritative recipient email from MongoDB record
    const recipientEmail = normalizeEmail(certificate.recipientEmail);

    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        code: "EMAIL_REQUIRED",
        message: "Recipient email is required for this certificate."
      });
    }

    if (!isValidEmail(recipientEmail)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_EMAIL",
        message: "The certificate recipient email address is invalid."
      });
    }

    // Validate PDF Attachment Payload
    let pdfBuffer;
    try {
      pdfBuffer = extractAndValidatePdfBuffer(req.body?.pdfBase64);
    } catch (err) {
      return res.status(err.status || 400).json({
        success: false,
        code: err.code || "INVALID_PDF",
        message: err.message || "Invalid certificate PDF."
      });
    }

    const rawFileName = req.body?.fileName || `${certificate.participantName || "Certificate"}.pdf`;
    const cleanFileName = String(rawFileName)
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const safeAttachmentName = cleanFileName.toLowerCase().endsWith(".pdf")
      ? cleanFileName
      : `${cleanFileName}.pdf`;

    // Check if SMTP is configured
    if (!isEmailConfigured()) {
      certificate.emailStatus = "failed";
      certificate.emailLastError = "Email service is not configured.";
      await certificate.save();

      return res.status(400).json({
        success: false,
        code: "EMAIL_NOT_CONFIGURED",
        message: "Email service is not configured.",
        emailStatus: "failed"
      });
    }

    // Mark status as sending & increment attempt counter
    certificate.emailStatus = "sending";
    certificate.emailSendAttempts = (certificate.emailSendAttempts || 0) + 1;
    await certificate.save();

    // Generate personalized email content
    const emailContent = generateCertificateEmailContent(certificate);

    // Send email with PDF attachment
    const sendResult = await emailService.sendCertificateEmail({
      to: recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      attachments: [
        {
          filename: safeAttachmentName,
          content: pdfBuffer,
          contentType: "application/pdf"
        }
      ]
    });

    if (sendResult.success) {
      certificate.emailStatus = "sent";
      certificate.emailSentAt = new Date();
      certificate.emailLastError = "";
      await certificate.save();

      return res.status(200).json({
        success: true,
        message: "Certificate sent successfully.",
        emailStatus: "sent",
        recipientEmail: certificate.recipientEmail
      });
    } else {
      certificate.emailStatus = "failed";
      certificate.emailLastError = sendResult.error || sendResult.message || "Failed to deliver email";
      await certificate.save();

      return res.status(sendResult.code === "EMAIL_NOT_CONFIGURED" ? 400 : 500).json({
        success: false,
        code: sendResult.code || "EMAIL_SEND_FAILED",
        message: sendResult.message || "Email could not be sent.",
        emailStatus: "failed"
      });
    }
  } catch (error) {
    console.error("sendCertificateEmailController error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process certificate email request"
    });
  }
};

/**
 * Bulk / Send-all certificates email dispatch endpoint foundation.
 * POST /api/certificates/send-all-email
 */
export const sendAllCertificateEmails = async (req, res) => {
  try {
    const { certificateIds } = req.body;

    if (!certificateIds || !Array.isArray(certificateIds) || certificateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "certificateIds must be a non-empty array."
      });
    }

    if (certificateIds.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Maximum 500 certificates can be queued for email sending."
      });
    }

    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please set MONGO_URI and restart the server."
      });
    }

    const result = await emailQueueService.queueManyCertificateEmails(certificateIds);

    return res.status(200).json({
      success: true,
      message: `Queued ${result.count} certificates for email sending.`,
      count: result.count
    });
  } catch (error) {
    console.error("sendAllCertificateEmails error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to queue certificates for email sending"
    });
  }
};

/**
 * Retry failed certificate email dispatch endpoint.
 * POST /api/certificates/:id/retry-email
 */
export const retryCertificateEmail = async (req, res) => {
  try {
    // If request contains pdfBase64, run actual send directly
    if (req.body?.pdfBase64) {
      return sendCertificateEmailController(req, res);
    }

    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please set MONGO_URI and restart the server."
      });
    }

    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found"
      });
    }

    const recipientEmail = normalizeEmail(certificate.recipientEmail);

    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        code: "EMAIL_REQUIRED",
        message: "Recipient email is required."
      });
    }

    if (!isValidEmail(recipientEmail)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_EMAIL",
        message: "Please provide a valid recipient email address."
      });
    }

    await emailQueueService.queueCertificateEmail(certificate._id);

    const updatedCert = await Certificate.findById(certificate._id);

    return res.status(200).json({
      success: true,
      message: "Certificate email queued for retry.",
      data: addSignatureDefaults(updatedCert)
    });
  } catch (error) {
    console.error("retryCertificateEmail error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retry certificate email"
    });
  }
};

/**
 * Returns overall email dispatch stats & queue status.
 * GET /api/certificates/email-status
 */
export const getCertificateEmailStatus = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please set MONGO_URI and restart the server."
      });
    }

    const [notSent, queued, sending, sent, failed, total] = await Promise.all([
      Certificate.countDocuments({ emailStatus: "not-sent" }),
      Certificate.countDocuments({ emailStatus: "queued" }),
      Certificate.countDocuments({ emailStatus: "sending" }),
      Certificate.countDocuments({ emailStatus: "sent" }),
      Certificate.countDocuments({ emailStatus: "failed" }),
      Certificate.countDocuments()
    ]);

    const queueStatus = emailQueueService.getQueueStatus();

    return res.status(200).json({
      success: true,
      notSent,
      queued,
      sending,
      sent,
      failed,
      total,
      queue: queueStatus
    });
  } catch (error) {
    console.error("getCertificateEmailStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch certificate email status"
    });
  }
};

export default {
  createCertificate,
  saveDraftCertificate,
  bulkCreateCertificates,
  getCertificates,
  getCertificateById,
  updateCertificate,
  deleteCertificate,
  sendCertificateEmailController,
  sendAllCertificateEmails,
  retryCertificateEmail,
  getCertificateEmailStatus
};
