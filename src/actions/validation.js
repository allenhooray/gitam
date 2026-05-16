const FLAG_REGEXP = /^[A-Za-z0-9_-]+$/;
const EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Converts any input to a trimmed string.
 *
 * @param {*} value - Raw input value.
 * @returns {string} Trimmed string value.
 */
const trimValue = (value) => String(value || "").trim();

/**
 * Checks whether a value is empty after trimming.
 *
 * @param {*} value - Raw input value.
 * @returns {boolean} True when the value is blank.
 */
const isBlank = (value) => !trimValue(value);

/**
 * Validates an account flag.
 *
 * @param {*} flag - Account flag to validate.
 * @throws {Error} When the flag is blank or contains unsupported characters.
 */
const validateFlag = (flag) => {
  if (isBlank(flag) || !FLAG_REGEXP.test(trimValue(flag))) {
    throw new Error(
      "Account flag must contain only letters, numbers, underscores, or hyphens."
    );
  }
};

/**
 * Validates a required account field.
 *
 * @param {string} name - Field name used in the error message.
 * @param {*} value - Field value to validate.
 * @throws {Error} When the field is blank.
 */
const validateAccountField = (name, value) => {
  if (isBlank(value)) {
    throw new Error(`Account ${name} cannot be empty.`);
  }
};

/**
 * Validates an account email address.
 *
 * @param {*} email - Email value to validate.
 * @throws {Error} When the email is blank or invalid.
 */
const validateEmail = (email) => {
  validateAccountField("email", email);
  if (!EMAIL_REGEXP.test(trimValue(email))) {
    throw new Error("Account email must be a valid email address.");
  }
};

/**
 * Normalizes and validates account creation input.
 *
 * @param {*} flag - Account flag.
 * @param {*} username - Account username.
 * @param {*} email - Account email.
 * @returns {{flag: string, username: string, email: string}} Normalized account input.
 */
const normalizeAccountInput = (flag, username, email) => {
  const normalized = {
    flag: trimValue(flag),
    username: trimValue(username),
    email: trimValue(email),
  };
  validateFlag(normalized.flag);
  validateAccountField("username", normalized.username);
  validateEmail(normalized.email);
  return normalized;
};

module.exports = {
  isBlank,
  normalizeAccountInput,
  trimValue,
  validateAccountField,
  validateEmail,
  validateFlag,
};
