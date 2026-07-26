const MAX_OPTION_NAME_LENGTH = 100;
const MAX_DISPLAY_NAME_LENGTH = 150;
const RESERVED_ATTENDANCE_OPTION_VALUES = new Set([
  "ADD_NEW_DEPARTMENT",
  "ADD_NEW_CLASS",
  "ADD NEW DEPARTMENT",
  "ADD NEW CLASS",
  "+ ADD NEW DEPARTMENT",
  "+ ADD NEW CLASS",
  "ALL DEPARTMENTS",
  "ALL CLASSES"
]);

const createValidationError = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

const removeOptionPrefix = (value) => {
  return value
    .replace(/^[\s+\-\u2013\u2014\u2022]+/, "")
    .replace(/^(?:DEPARTMENT|CLASS)\s*[:\-]\s*/i, "");
};

const normalizeRequiredText = (
  value,
  label,
  maximumLength,
  uppercase = false
) => {
  const normalizedValue = removeOptionPrefix(
    String(value ?? "").trim().replace(/\s+/g, " ")
  );
  const comparableValue = normalizedValue.toUpperCase();

  if (!normalizedValue) {
    throw createValidationError(`${label} is required.`);
  }

  if (RESERVED_ATTENDANCE_OPTION_VALUES.has(comparableValue)) {
    throw createValidationError(`${label} contains a reserved option value.`);
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

const resolveClassName = (source = {}) => {
  return source.className ?? source.class ?? source.selectedClass;
};

export {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_OPTION_NAME_LENGTH,
  normalizeClassName,
  normalizeDepartmentName,
  normalizeDisplayName,
  resolveClassName
};
