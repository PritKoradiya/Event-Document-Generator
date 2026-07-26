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

    const certificateId = await generateCertificateId();
    const certificate = await Certificate.create({
      ...req.body,
      authorizedSignatureName: req.body.authorizedSignatureName || "Authorized Person",
      generationType: "Single",
      status: "Generated",
      certificateId
    });

    return res.status(201).json({
      success: true,
      message: "Certificate generated successfully",
      data: certificate
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate certificate"
    });
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
      authorizedSignatureName: req.body.authorizedSignatureName || "Authorized Person",
      certificateId,
      status: "Draft",
      generationType: "Single"
    });

    return res.status(201).json({
      success: true,
      message: "Certificate draft saved successfully",
      data: certificate
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to save certificate draft"
    });
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
      authorizedSignatureName: commonDetails.authorizedSignatureName || "Authorized Person",
      certificateId: createCertificateIdFromNumber(nextCertificateNumber + index),
      generationType: "Bulk"
    }));

    const savedCertificates = await Certificate.insertMany(certificatesToSave);

    return res.status(201).json({
      success: true,
      message: "Bulk certificates generated successfully",
      count: savedCertificates.length,
      data: savedCertificates
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to generate bulk certificates"
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
      data: certificates
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
      data: certificate
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

    const updateData = {
      ...req.body,
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
      data: updatedCertificate
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update certificate"
    });
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
