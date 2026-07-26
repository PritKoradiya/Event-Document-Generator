import { unlink } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { isDevelopment } from "../config/env.js";
import Poster from "../models/Poster.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const posterUploadsDirectory = path.join(__dirname, "../../uploads/posters");

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const requiredFields = ["posterTitle", "category", "eventDate", "templateStyle"];
const validStatuses = ["Draft", "Generated"];

const isMissingRequiredValue = (value) => {
  return value === undefined || value === null || (typeof value === "string" && !value.trim());
};

const databaseUnavailableResponse = (res) => {
  return res.status(503).json({
    success: false,
    message: "Database is not connected. Please set MONGO_URI and restart the server."
  });
};

const createPosterIdFromNumber = (year, number) => {
  return `POSTER-${year}-${String(number).padStart(4, "0")}`;
};

const generatePosterId = async () => {
  const year = new Date().getFullYear();
  const posterIdPrefix = `POSTER-${year}-`;
  const latestPoster = await Poster.findOne({
    posterId: new RegExp(`^${posterIdPrefix}`)
  }).sort({ posterId: -1 });

  if (!latestPoster?.posterId) {
    return createPosterIdFromNumber(year, 1);
  }

  const latestNumber = Number(latestPoster.posterId.replace(posterIdPrefix, ""));
  const nextNumber = Number.isNaN(latestNumber) ? 1 : latestNumber + 1;

  return createPosterIdFromNumber(year, nextNumber);
};

const getUploadedAssetPath = (files, fieldName) => {
  const uploadedFile = files?.[fieldName]?.[0];

  return uploadedFile ? `/uploads/posters/${uploadedFile.filename}` : "";
};

const getUploadedAssetPaths = (files) => {
  return [
    getUploadedAssetPath(files, "posterImage"),
    getUploadedAssetPath(files, "organizationLogo")
  ].filter(Boolean);
};

const deleteUploadedAsset = async (assetPath) => {
  if (typeof assetPath !== "string" || !assetPath.startsWith("/uploads/posters/")) {
    return;
  }

  const fileName = path.basename(assetPath);
  const localFilePath = path.join(posterUploadsDirectory, fileName);

  try {
    await unlink(localFilePath);
  } catch (error) {
    if (error.code !== "ENOENT" && isDevelopment) {
      console.error(`Unable to delete uploaded poster asset ${fileName}:`, error.message);
    }
  }
};

const removeUploadedRequestAssets = async (files) => {
  await Promise.all(getUploadedAssetPaths(files).map(deleteUploadedAsset));
};

const isDuplicatePosterIdError = (error) => {
  return error?.code === 11000 && Boolean(error?.keyPattern?.posterId || error?.keyValue?.posterId);
};

const createPosterRecord = async (posterData) => {
  const maximumAttempts = 5;

  for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
    const posterId = await generatePosterId();

    try {
      return await Poster.create({ ...posterData, posterId });
    } catch (error) {
      if (!isDuplicatePosterIdError(error) || attempt === maximumAttempts - 1) {
        throw error;
      }
    }
  }

  throw new Error("Unable to generate a unique poster ID.");
};

const hasValidMongoId = (id) => mongoose.isValidObjectId(id);

export const createPoster = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      await removeUploadedRequestAssets(req.files);
      return databaseUnavailableResponse(res);
    }

    const missingFields = requiredFields.filter((field) => isMissingRequiredValue(req.body[field]));

    if (missingFields.length > 0) {
      await removeUploadedRequestAssets(req.files);
      return res.status(400).json({
        success: false,
        message: "Required poster information is missing."
      });
    }

    const requestedStatus = validStatuses.includes(req.body.status) ? req.body.status : "Generated";
    const poster = await createPosterRecord({
      ...req.body,
      posterImage: getUploadedAssetPath(req.files, "posterImage"),
      organizationLogo: getUploadedAssetPath(req.files, "organizationLogo"),
      status: requestedStatus
    });

    return res.status(201).json({
      success: true,
      message: "Poster generated successfully",
      data: poster
    });
  } catch (error) {
    await removeUploadedRequestAssets(req.files);
    return res.status(500).json({
      success: false,
      message: "Failed to generate poster"
    });
  }
};

export const saveDraftPoster = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      await removeUploadedRequestAssets(req.files);
      return databaseUnavailableResponse(res);
    }

    const poster = await createPosterRecord({
      ...req.body,
      posterImage: getUploadedAssetPath(req.files, "posterImage"),
      organizationLogo: getUploadedAssetPath(req.files, "organizationLogo"),
      status: "Draft"
    });

    return res.status(201).json({
      success: true,
      message: "Poster draft saved successfully",
      data: poster
    });
  } catch (error) {
    await removeUploadedRequestAssets(req.files);
    return res.status(500).json({
      success: false,
      message: "Failed to save poster draft"
    });
  }
};

export const getPosters = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    const posters = await Poster.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: posters.length,
      data: posters
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch posters"
    });
  }
};

export const getPosterById = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    if (!hasValidMongoId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Poster not found." });
    }

    const poster = await Poster.findById(req.params.id);

    if (!poster) {
      return res.status(404).json({ success: false, message: "Poster not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Poster fetched successfully",
      data: poster
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch poster"
    });
  }
};

export const updatePoster = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      await removeUploadedRequestAssets(req.files);
      return databaseUnavailableResponse(res);
    }

    if (!hasValidMongoId(req.params.id)) {
      await removeUploadedRequestAssets(req.files);
      return res.status(404).json({ success: false, message: "Poster not found." });
    }

    const existingPoster = await Poster.findById(req.params.id);

    if (!existingPoster) {
      await removeUploadedRequestAssets(req.files);
      return res.status(404).json({ success: false, message: "Poster not found." });
    }

    const { _id, posterId, posterImage, organizationLogo, ...editableFields } = req.body;
    const newPosterImage = getUploadedAssetPath(req.files, "posterImage");
    const newOrganizationLogo = getUploadedAssetPath(req.files, "organizationLogo");
    const updateData = {
      ...editableFields,
      posterId: existingPoster.posterId,
      posterImage: newPosterImage || existingPoster.posterImage,
      organizationLogo: newOrganizationLogo || existingPoster.organizationLogo
    };

    const resultingStatus = validStatuses.includes(updateData.status)
      ? updateData.status
      : existingPoster.status;
    updateData.status = resultingStatus;

    if (resultingStatus === "Generated") {
      const missingFields = requiredFields.filter((field) => {
        const value = updateData[field] === undefined ? existingPoster[field] : updateData[field];
        return isMissingRequiredValue(value);
      });

      if (missingFields.length > 0) {
        await removeUploadedRequestAssets(req.files);
        return res.status(400).json({
          success: false,
          message: "Required poster information is missing."
        });
      }
    }

    const updatedPoster = await Poster.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    const replacedAssets = [];

    if (newPosterImage && existingPoster.posterImage) {
      replacedAssets.push(existingPoster.posterImage);
    }

    if (newOrganizationLogo && existingPoster.organizationLogo) {
      replacedAssets.push(existingPoster.organizationLogo);
    }

    await Promise.all(replacedAssets.map(deleteUploadedAsset));

    return res.status(200).json({
      success: true,
      message: "Poster updated successfully",
      data: updatedPoster
    });
  } catch (error) {
    await removeUploadedRequestAssets(req.files);
    return res.status(500).json({
      success: false,
      message: "Failed to update poster"
    });
  }
};

export const deletePoster = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return databaseUnavailableResponse(res);
    }

    if (!hasValidMongoId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Poster not found." });
    }

    const existingPoster = await Poster.findById(req.params.id);

    if (!existingPoster) {
      return res.status(404).json({ success: false, message: "Poster not found." });
    }

    await Poster.findByIdAndDelete(req.params.id);
    await Promise.all([
      deleteUploadedAsset(existingPoster.posterImage),
      deleteUploadedAsset(existingPoster.organizationLogo)
    ]);

    return res.status(200).json({
      success: true,
      message: "Poster deleted successfully",
      data: existingPoster
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete poster"
    });
  }
};
