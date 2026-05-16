const fs = require("fs").promises;

const FILE_NAME = ".gam.json";
const HOME_PATH = process.env.HOME || process.env.USERPROFILE;
const FILE_PATH = `${HOME_PATH}/${FILE_NAME}`;
const ENCODING = "utf8";

const INIT_JSON_DATA = {
  accounts: {},
};

/**
 * @description 向 DB 文件中写入数据
 */
const writeFile = async (data = INIT_JSON_DATA) => {
  const tempPath = `${FILE_PATH}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), ENCODING);
  await fs.rename(tempPath, FILE_PATH);
};

/**
 * @description 检查是否存在 DB 文件，不存在则创建
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
 * @description 删除 DB 文件
 */
const clearFile = async () => {
  try {
    await fs.unlink(FILE_PATH);
  } catch (e) {}
};

/**
 * @description 从 DB 文件中获取数据 object
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
