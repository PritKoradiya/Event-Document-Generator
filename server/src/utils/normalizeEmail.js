/**
 * Normalizes an email address by trimming whitespace and converting to lowercase.
 * Returns an empty string if email is null, undefined, or empty.
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

export default normalizeEmail;
