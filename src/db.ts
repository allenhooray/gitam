import { promises as fs } from 'fs';
import { Obj } from './types'

const FILE_NAME = ".gam.json";
const HOME_PATH = process.env.HOME || process.env.USERPROFILE;
const FILE_PATH = `${HOME_PATH}/${FILE_NAME}`;

const INIT_JSON_DATA: Obj = {
  accounts: {},
};

/**
 * @description 向 DB 文件中写入数据
 */
export const writeFile = async (data = INIT_JSON_DATA) => {
  await fs.writeFile(FILE_PATH, JSON.stringify(data));
};

/**
 * @description 检查是否存在 DB 文件，不存在则创建
 */
export const checkFile = async () => {
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
export const clearFile = async () => {
  try {
    await fs.unlink(FILE_PATH);
  } catch (e) { }
};

/**
 * @description 从 DB 文件中获取数据 object
 */
export const getObject = async (): Promise<Obj> => {
  await checkFile();
  const obj: Obj = JSON.parse(await fs.readFile(FILE_PATH, 'utf8'));
  if (!obj.accounts) {
    await writeFile();
    return await getObject();
  }
  return obj;
};
