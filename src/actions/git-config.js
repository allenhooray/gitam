const child_process = require("child_process");
const { Account } = require("./account");

/**
 * Runs git with argument arrays so account values never pass through a shell.
 *
 * @param {string[]} args - Git command arguments.
 * @param {{allowUnset?: boolean}} [options] - Execution options.
 * @returns {Promise<{stdout: string, stderr: string}>} Sanitized git output.
 */
const execGit = (args, options = {}) => {
  return new Promise((resolve, reject) => {
    child_process.execFile("git", args, (error, stdout, stderr) => {
      const result = {
        stdout: stdout.replace(/[\r\n]/g, ""),
        stderr: stderr.replace(/[\r\n]/g, ""),
      };

      if (error) {
        if (options.allowUnset && error.code === 1) {
          resolve(result);
          return;
        }

        error.message = result.stderr || error.message;
        reject(error);
        return;
      }

      resolve(result);
    });
  });
};

/**
 * Reads a git config value.
 *
 * @param {string} key - Git config key.
 * @param {boolean} [isGlobal=false] - Whether to read global config.
 * @returns {Promise<string>} Config value or an empty string when unset.
 */
const getGitConfig = async (key, isGlobal = false) => {
  const args = ["config"];
  if (isGlobal) {
    args.push("--global");
  }
  args.push(key);
  const { stdout } = await execGit(args, { allowUnset: true });
  return stdout;
};

/**
 * Writes a git config value.
 *
 * @param {string} key - Git config key.
 * @param {string} value - Config value.
 * @param {boolean} [isGlobal=false] - Whether to write global config.
 * @returns {Promise<void>}
 */
const setGitConfig = async (key, value, isGlobal = false) => {
  const args = ["config"];
  if (isGlobal) {
    args.push("--global");
  }
  args.push(key, value);
  await execGit(args);
};

/**
 * Writes a git config value to a specific config file.
 *
 * @param {string} filePath - Git config file path.
 * @param {string} key - Git config key.
 * @param {string} value - Config value.
 * @returns {Promise<void>}
 */
const setGitConfigInFile = async (filePath, key, value) => {
  await execGit(["config", "--file", filePath, key, value]);
};

/**
 * Writes a global includeIf rule pointing to a config file.
 *
 * @param {string} condition - includeIf condition, such as gitdir:~/work/.
 * @param {string} includePath - Config file path to include.
 * @returns {Promise<void>}
 */
const setGlobalIncludeIf = async (condition, includePath) => {
  await setGitConfig(`includeIf.${condition}.path`, includePath, true);
};

/**
 * Reads the current local and global git account configuration.
 *
 * @returns {Promise<{local: Account, global: Account}>} Current git accounts.
 */
const getCurrentAccounts = async () => {
  const localUserName = await getGitConfig("user.name");
  const localEmail = await getGitConfig("user.email");
  const globalUserName = await getGitConfig("user.name", true);
  const globalEmail = await getGitConfig("user.email", true);

  return {
    local: new Account(localUserName, localEmail, "-"),
    global: new Account(globalUserName, globalEmail, "-"),
  };
};

module.exports = {
  execGit,
  getCurrentAccounts,
  getGitConfig,
  setGitConfigInFile,
  setGlobalIncludeIf,
  setGitConfig,
};
