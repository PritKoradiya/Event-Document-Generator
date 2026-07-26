const MAX_OPTION_NAME_LENGTH = 100;
const MAX_DISPLAY_NAME_LENGTH = 150;

const createValidationError = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

const normalizeRequiredText = (value, label, maximumLength, uppercase = false) => {
  if (typeof value !== "string") {
    throw createValidationError(`${label} is required.`);
  }

  const normalizedValue = value.trim().replace(/\s+/g, " ");

  if (!normalizedValue) {
    throw createValidationError(`${label} is required.`);
  }

  if (normalizedValue.length > maximumLength) {
    throw createValidationError(
      `${label} must be ${maximumLength} characters or fewer.`
    );
  }

  return uppercase ? normalizedValue.toUpperCase() : normalizedValue;
};

const normalizeDepartmentName = (value) => {
  return normalizeRequiredText(
    value,
    "Department name",
    MAX_OPTION_NAME_LENGTH,
    true
  );
};

const normalizeClassName = (value) => {
  return normalizeRequiredText(
    value,
    "Class name",
    MAX_OPTION_NAME_LENGTH,
    true
  );
};

const normalizeDisplayName = (value) => {
  return normalizeRequiredText(
    value,
    "Display name",
    MAX_DISPLAY_NAME_LENGTH
  );
};

export {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_OPTION_NAME_LENGTH,
  normalizeClassName,
  normalizeDepartmentName,
  normalizeDisplayName
};
