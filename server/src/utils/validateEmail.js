/**
 * Regular expression for standard, safe email format validation.
 */
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

export default isValidEmail;
