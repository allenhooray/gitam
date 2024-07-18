import readline from 'readline';
import child_process, { ExecException } from 'child_process';
import { getObject } from "./db";
import { Account } from "./account";
import { AccountInfo, Obj } from './types'

/**
 * @description 封装 child_process.exec 为 promise
 */
const execAysnc = (cmd: string): Promise<{ error: ExecException | null, stdout: string, stderr: string }> => {
  return new Promise((resolve, reject) => {
    child_process.exec(cmd, (error, stdout, stderr) => {
      resolve({ error, stdout: stdout.replace(/[\r\n]/g, ""), stderr });
    });
  });
};

/**
 * @description 执行 git 命令获取全局和当前存储库用户配置
 */
export const logCurrentConfig = async () => {
  const { stdout: localUserName } = await execAysnc(`git config user.name`);
  const { stdout: localEmail } = await execAysnc(`git config user.email`);
  const { stdout: globalUserName } = await execAysnc(
    `git config --global user.name`
  );
  const { stdout: globalEmail } = await execAysnc(
    `git config --global user.email`
  );

  const localAccount = new Account(localUserName, localEmail, "-");
  const globalAccount = new Account(globalUserName, globalEmail, "-");

  const { accounts } = await getObject();
  for (const flag in accounts) {
    if (Account.isEqual(localAccount, accounts[flag])) {
      localAccount.flag = flag;
    }
    if (Account.isEqual(globalAccount, accounts[flag])) {
      globalAccount.flag = flag;
    }
  }

  console.log(`[Global]`, globalAccount.stringify());
  console.log(`[Local]`, localAccount.stringify());
};

/**
 * @description 以表格的形式打印出已保存的账号
 * @param {*} obj
 */
export const listAccounts = async (obj?: Obj) => {
  const { accounts } = obj || (await getObject());
  const arr: {
    flag: string;
    username: string;
    email: string;
  }[] = Object.entries(accounts).map(([flag, { username, email }]) => ({ flag, username, email }));

  console.table(arr);
};

/**
 * @description 使用一个账号
 */
export const useAnAccount = async (flag: string, account: AccountInfo, isGlobal = false) => {
  const { username, email } = account;
  child_process.exec(
    `git config ${isGlobal ? "--global" : ""}  user.name "${username}"`
  );
  child_process.exec(
    `git config ${isGlobal ? "--global" : ""} user.email "${email}"`
  );
  console.log(
    `🎉 Toggle success (scope: ${isGlobal ? "global" : "local repository"}).`
  );
  await logCurrentConfig();
};

/**
 * @description 通过命令行交互的方式，在已存储的列表中选择一个账号
 */
export const selectAnAccount = async (obj?: Obj, isGlobal = false) => {
  const _obj = obj || (await getObject());
  const { accounts } = _obj;

  if (!Object.keys(accounts).length) {
    console.log("🤚 No account can be selected, please add an account first.");
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(`Please select a index or flag: `, (input: string) => {
    rl.close();
    const isIndex = !isNaN(Number(input));
    const inputIndex = isIndex ? Number(input) : -1;
    const flag = isIndex ? Object.keys(accounts)[inputIndex] : input;
    const account = accounts[flag];

    if (!account) {
      console.log("❌ No this index or flag");
      return selectAnAccount(_obj, isGlobal);
    } else {
      return useAnAccount(flag, account, isGlobal);
    }
  });
};

