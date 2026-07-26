export const STORAGE_KEY = "eventDocumentBackgroundMode";

/**
 * Normalize saved or raw background mode values to ensure
 * old stored values ("full", "reduced", "off", etc.) correctly map to
 * the 3 supported modes: "video", "stars", "static".
 */
export const normalizeBackgroundMode = (value) => {
  if (
    value === "video" ||
    value === "full" ||
    value === "full-galaxy"
  ) {
    return "video";
  }

  if (
    value === "stars" ||
    value === "reduced"
  ) {
    return "stars";
  }

  if (
    value === "static" ||
    value === "off"
  ) {
    return "static";
  }

  return "video";
};

export const getSavedBackgroundMode = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const normalized = normalizeBackgroundMode(saved);
    if (saved !== normalized) {
      localStorage.setItem(STORAGE_KEY, normalized);
    }
    return normalized;
  } catch {
    return "video";
  }
};

export const setSavedBackgroundMode = (newMode) => {
  const normalized = normalizeBackgroundMode(newMode);
  try {
    localStorage.setItem(STORAGE_KEY, normalized);
  } catch (e) {
    console.warn("Could not save background mode to localStorage", e);
  }
  return normalized;
};
