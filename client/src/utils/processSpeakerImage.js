/**
 * Utility module for processing and validating speaker photo assets.
 */

export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp"
];

export const MAX_SPEAKER_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validates whether the uploaded file is an allowed image type and within size limit.
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSpeakerImage(file) {
  if (!file) {
    return { valid: false, error: "No image file provided." };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: "Only PNG, JPG, JPEG, and WebP images are allowed."
    };
  }

  if (file.size > MAX_SPEAKER_IMAGE_SIZE) {
    return {
      valid: false,
      error: "Speaker photo is too large. Maximum size is 5MB."
    };
  }

  return { valid: true };
}

/**
 * Reads a File as a base64 Data URL.
 * @param {File|Blob} file
 * @returns {Promise<string>}
 */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || "");
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
