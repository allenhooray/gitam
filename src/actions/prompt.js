const readline = require("readline");
const { trimValue } = require("./validation");

/**
 * Checks whether the current process can prompt the user.
 *
 * @returns {boolean} True when stdin is interactive or forced by tests.
 */
const isInteractive = () =>
  Boolean(process.stdin.isTTY || process.env.GITAM_FORCE_INTERACTIVE);

/**
 * Prompts for a single answer using an existing readline interface.
 *
 * @param {readline.Interface} rl - Readline interface.
 * @param {string} question - Prompt text.
 * @returns {Promise<string>} User input.
 */
const askQuestion = (rl, question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

/**
 * Asks the user to confirm an action.
 *
 * @param {string} message - Confirmation message.
 * @param {readline.Interface} [existingRl] - Optional existing readline interface.
 * @returns {Promise<boolean>} True when the user answers yes.
 */
const confirmQuestion = async (message, existingRl) => {
  if (!isInteractive()) {
    throw new Error("This action requires confirmation in an interactive terminal.");
  }

  if (existingRl) {
    const input = trimValue(await askQuestion(existingRl, `${message} (y/N) `));
    return input === "y" || input === "Y";
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const input = trimValue(await askQuestion(rl, `${message} (y/N) `));
    return input === "y" || input === "Y";
  } finally {
    rl.close();
  }
};

/**
 * Re-prompts until the provided validator accepts the input.
 *
 * @param {readline.Interface} rl - Readline interface.
 * @param {string} question - Prompt text.
 * @param {(value: string) => void} validate - Validation function.
 * @returns {Promise<string>} Validated, trimmed input.
 */
const promptValidated = async (rl, question, validate) => {
  while (true) {
    const value = trimValue(await askQuestion(rl, question));
    try {
      validate(value);
      return value;
    } catch (error) {
      console.log(`❌ ${error.message}`);
    }
  }
};

module.exports = {
  askQuestion,
  confirmQuestion,
  isInteractive,
  promptValidated,
};
