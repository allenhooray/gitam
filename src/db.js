const fs = require("fs").promises;

const FILE_NAME = ".gam.json";
const HOME_PATH = process.env.HOME || process.env.USERPROFILE;
const FILE_PATH = `${HOME_PATH}/${FILE_NAME}`;
const ENCODING = "utf8";

const INIT_JSON_DATA = {
  accounts: {},
};

/**
 * Writes data to the account database file atomically.
 *
 * @param {{accounts: Record<string, {username: string, email: string}>}} [data] - Database payload.
 * @returns {Promise<void>}
 */
const writeFile = async (data = INIT_JSON_DATA) => {
  const tempPath = `${FILE_PATH}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), ENCODING);
  await fs.rename(tempPath, FILE_PATH);
};

/**
 * Ensures the account database file exists.
 *
 * @returns {Promise<void>}
 */
const checkFile = async () => {
  try {
    const stat = await fs.stat(FILE_PATH);
    if (!stat) {
      await writeFile();
    }
  } catch (e) {
    await writeFile();
  }
};

/**
 * Deletes the account database file when it exists.
 *
 * @returns {Promise<void>}
 */
const clearFile = async () => {
  try {
    await fs.unlink(FILE_PATH);
  } catch (e) {}
};

/**
 * Reads and parses the account database object.
 *
 * @returns {Promise<{accounts: Record<string, {username: string, email: string}>}>} Parsed database object.
 */
const getObject = async () => {
  await checkFile();
  let obj;
  try {
    obj = JSON.parse(await fs.readFile(FILE_PATH, ENCODING));
  } catch (error) {
    const message = `The account database at ${FILE_PATH} is not valid JSON. Please fix or remove the file.`;
    const parseError = new Error(message);
    parseError.code = "INVALID_ACCOUNT_DB";
    throw parseError;
  }
  if (!obj.accounts) {
    await writeFile();
    return await getObject();
  }
  return obj;
};

module.exports = {
  writeFile,
  checkFile,
  clearFile,
  getObject,
};
