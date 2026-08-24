/**
 * Normalizes an email string by trimming whitespace and converting to lowercase.
 * Returns an empty string if email is null, undefined, or not a string.
 *
 * @param {any} email
 * @returns {string}
 */
export const normalizeEmail = (email) => {
  if (email === null || email === undefined) {
    return "";
  }

  return String(email).trim().toLowerCase();
};

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validates whether an email string has a valid format.
 *
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  if (typeof email !== "string") {
    return false;
  }

  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) {
    return false;
  }

  return EMAIL_REGEX.test(trimmed);
};

/**
 * Validates participant email for forms.
 * Blank email is valid (optional). Non-empty email must match valid format.
 *
 * @param {string} email
 * @returns {{ valid: boolean, error: string }}
 */
export const validateParticipantEmail = (email) => {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    return { valid: true, error: "" };
  }

  if (!isValidEmail(normalized)) {
    return { valid: false, error: "Please enter a valid email address." };
  }

  return { valid: true, error: "" };
};

export default {
  normalizeEmail,
  isValidEmail,
  validateParticipantEmail
};
