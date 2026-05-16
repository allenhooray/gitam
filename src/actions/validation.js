const FLAG_REGEXP = /^[A-Za-z0-9_-]+$/;
const EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INCLUDE_IF_REGEXP = /^(gitdir|gitdir\/i|onbranch):(.+)$/;

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

/**
 * Validates a git includeIf condition.
 *
 * @param {*} condition - Raw includeIf condition.
 * @throws {Error} When the condition is blank or unsupported.
 */
const validateIncludeIfCondition = (condition) => {
  const value = trimValue(condition);
  const match = INCLUDE_IF_REGEXP.exec(value);
  if (!match || isBlank(match[2])) {
    throw new Error(
      "includeIf condition must be gitdir:<path>, gitdir/i:<path>, or onbranch:<pattern>."
    );
  }
};

/**
 * Normalizes a gitdir includeIf value.
 *
 * @param {*} value - Raw gitdir path.
 * @returns {string} Normalized gitdir condition value.
 */
const normalizeGitdirValue = (value) => {
  const normalized = trimValue(value);
  if (isBlank(normalized)) {
    throw new Error("includeIf gitdir path cannot be empty.");
  }
  if (normalized.endsWith("/") || normalized.endsWith("**")) {
    return normalized;
  }
  return `${normalized}/`;
};

/**
 * Normalizes and validates includeIf command options.
 *
 * @param {{condition?: string, gitdir?: string, gitdirI?: string, onbranch?: string}} options - CLI options.
 * @returns {string} Normalized includeIf condition.
 */
const normalizeIncludeIfOptions = (options = {}) => {
  const provided = [
    options.condition !== undefined,
    options.gitdir !== undefined,
    options.gitdirI !== undefined,
    options.onbranch !== undefined,
  ].filter(Boolean);

  if (provided.length !== 1) {
    throw new Error(
      "Please provide exactly one of --condition, --gitdir, --gitdir-i, or --onbranch."
    );
  }

  let condition;
  if (options.condition !== undefined) {
    condition = trimValue(options.condition);
  } else if (options.gitdir !== undefined) {
    condition = `gitdir:${normalizeGitdirValue(options.gitdir)}`;
  } else if (options.gitdirI !== undefined) {
    condition = `gitdir/i:${normalizeGitdirValue(options.gitdirI)}`;
  } else {
    const pattern = trimValue(options.onbranch);
    if (isBlank(pattern)) {
      throw new Error("includeIf onbranch pattern cannot be empty.");
    }
    condition = `onbranch:${pattern}`;
  }

  validateIncludeIfCondition(condition);
  return condition;
};

module.exports = {
  isBlank,
  normalizeAccountInput,
  normalizeGitdirValue,
  normalizeIncludeIfOptions,
  trimValue,
  validateAccountField,
  validateEmail,
  validateFlag,
  validateIncludeIfCondition,
};
