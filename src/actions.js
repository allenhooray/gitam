const accountActions = require("./actions/accounts");
const completionActions = require("./actions/completion");
const validation = require("./actions/validation");

/**
 * Public action API used by the CLI.
 */
module.exports = {
  ...accountActions,
  ...completionActions,
  normalizeAccountInput: validation.normalizeAccountInput,
  validateFlag: validation.validateFlag,
};
