import mongoose from "mongoose";
import Certificate from "../models/Certificate.js";

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const createCertificateIdFromNumber = (number) => {
  return `CERT-2026-${String(number).padStart(4, "0")}`;
};

const getNextCertificateNumber = async () => {
  const latestCertificate = await Certificate.findOne({ certificateId: /^CERT-2026-/ }).sort({ certificateId: -1 });

  if (!latestCertificate?.certificateId) {
    return 1;
  }

  const latestNumber = Number(latestCertificate.certificateId.replace("CERT-2026-", ""));

  return Number.isNaN(latestNumber) ? 1 : latestNumber + 1;
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
const maxSignatureImageLength = 2 * 1024 * 1024;

class SignatureConfigurationError extends Error {}

const hasOwnProperty = (object, property) => Object.prototype.hasOwnProperty.call(object, property);

const getSignatureField = (source, existingCertificate, field, defaultValue) => {
  if (hasOwnProperty(source, field)) {
    return source[field];
  }

  return existingCertificate?.[field] ?? defaultValue;
};

const validateSignatureImage = (image, mode, label) => {
  if (mode === "blank") {
    return null;
  }

  if (typeof image !== "string" || image.trim().length === 0) {
    throw new SignatureConfigurationError(`${label} signature image is required when signature mode is image`);
  }

  if (image.length > maxSignatureImageLength) {
    throw new SignatureConfigurationError(`${label} signature image exceeds the 2 MB limit`);
  }

  return image;
};

const getSignatureConfiguration = (source = {}, existingCertificate = null) => {
  const drSignatureMode = getSignatureField(source, existingCertificate, "drSignatureMode", "blank");
  const authorizedSignatureMode = getSignatureField(source, existingCertificate, "authorizedSignatureMode", "blank");
  const signatureLayout = getSignatureField(source, existingCertificate, "signatureLayout", "both");
  const singleSignaturePosition = getSignatureField(source, existingCertificate, "singleSignaturePosition", "center");

  if (!signatureModes.includes(drSignatureMode)) {
    throw new SignatureConfigurationError("Invalid Dr. Niraj Shah signature mode");
  }

  if (!signatureModes.includes(authorizedSignatureMode)) {
    throw new SignatureConfigurationError("Invalid Authorized Person signature mode");
  }

  if (!signatureLayouts.includes(signatureLayout)) {
    throw new SignatureConfigurationError("Invalid signature layout");
  }

  if (!singleSignaturePositions.includes(singleSignaturePosition)) {
    throw new SignatureConfigurationError("Invalid single signature position");
  }

  const drSignatureImage = validateSignatureImage(
    getSignatureField(source, existingCertificate, "drSignatureImage", null),
    drSignatureMode,
    "Dr. Niraj Shah"
  );
  const authorizedSignatureImage = validateSignatureImage(
    getSignatureField(source, existingCertificate, "authorizedSignatureImage", null),
    authorizedSignatureMode,
    "Authorized Person"
  );

  return {
    drSignatureName: getSignatureField(source, existingCertificate, "drSignatureName", "Dr. Niraj Shah"),
    drSignatureMode,
    drSignatureImage,
    authorizedSignatureName: getSignatureField(source, existingCertificate, "authorizedSignatureName", "Authorized Person"),
    authorizedSignatureMode,
    authorizedSignatureImage,
    signatureLayout,
    singleSignaturePosition
  };
};

const addSignatureDefaults = (certificate) => {
  const certificateData = certificate.toObject ? certificate.toObject() : certificate;

  return {
    ...certificateData,
    drSignatureName: certificateData.drSignatureName ?? "Dr. Niraj Shah",
    drSignatureMode: certificateData.drSignatureMode ?? "blank",
    drSignatureImage: certificateData.drSignatureImage ?? null,
    authorizedSignatureName: certificateData.authorizedSignatureName ?? "Authorized Person",
    authorizedSignatureMode: certificateData.authorizedSignatureMode ?? "blank",
    authorizedSignatureImage: certificateData.authorizedSignatureImage ?? null,
    signatureLayout: certificateData.signatureLayout ?? "both",
    singleSignaturePosition: certificateData.singleSignaturePosition ?? "center"
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

export const createCertificate = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please set MONGO_URI and restart the server."
      });
    }

    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`
      });
    }

    const signatureConfiguration = getSignatureConfiguration(req.body);
    const certificateId = await generateCertificateId();
    const certificate = await Certificate.create({
      ...req.body,
      ...signatureConfiguration,
      generationType: "Single",
      status: "Generated",
      certificateId
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
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please set MONGO_URI and restart the server."
      });
    }

    const signatureConfiguration = getSignatureConfiguration(req.body);
    const certificateId = req.body.certificateId || await generateCertificateId();
    const certificate = await Certificate.create({
      participantName: req.body.participantName || "",
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
      generationType: "Single"
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
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected. Please set MONGO_URI and restart the server."
      });
    }

    const { participants, commonDetails } = req.body;

    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Participants must be a non-empty array."
      });
    }

    const participantWithoutName = participants.find((participant) => !participant.participantName);

    if (participantWithoutName) {
      return res.status(400).json({
        success: false,
        message: "Participant name is required for every participant."
      });
    }

    if (!commonDetails || typeof commonDetails !== "object") {
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

    const signatureConfiguration = getSignatureConfiguration(commonDetails);
    const nextCertificateNumber = await getNextCertificateNumber();
    const certificatesToSave = participants.map((participant, index) => ({
      participantName: participant.participantName.trim(),
      organizationName: (participant.organizationName || commonDetails.organizationName || "Organization Name").trim(),
      eventName: commonDetails.eventName,
      certificateCategory: commonDetails.certificateCategory,
      certificateTitle: commonDetails.certificateTitle,
      eventDate: commonDetails.eventDate,
      description: commonDetails.description || "",
      templateStyle: commonDetails.templateStyle,
      ...signatureConfiguration,
      certificateId: createCertificateIdFromNumber(nextCertificateNumber + index),
      generationType: "Bulk"
    }));

    const savedCertificates = await Certificate.insertMany(certificatesToSave);

    return res.status(201).json({
      success: true,
      message: "Bulk certificates generated successfully",
      count: savedCertificates.length,
      data: savedCertificates.map(addSignatureDefaults)
    });
  } catch (error) {
    return sendCertificateError(error, res, "Failed to generate bulk certificates");
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

    const signatureConfiguration = getSignatureConfiguration(req.body, existingCertificate);
    const updateData = {
      ...req.body,
      ...signatureConfiguration,
      certificateId: existingCertificate.certificateId || req.body.certificateId || await generateCertificateId(),
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
