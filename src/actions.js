const readline = require("readline");
const child_process = require("child_process");
const { getObject } = require("./db");

/**
 * @description Run git with argument arrays so account values never pass through a shell.
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

const getGitConfig = async (key, isGlobal = false) => {
  const args = ["config"];
  if (isGlobal) {
    args.push("--global");
  }
  args.push(key);
  const { stdout } = await execGit(args, { allowUnset: true });
  return stdout;
};

const setGitConfig = async (key, value, isGlobal = false) => {
  const args = ["config"];
  if (isGlobal) {
    args.push("--global");
  }
  args.push(key, value);
  await execGit(args);
};

class Account {
  username = "";
  email = "";
  flag = "";

  constructor(username, email, flag = "") {
    this.username = username;
    this.email = email;
    this.flag = flag;
  }

  static isEqual(accountA, accountB) {
    if (
      accountA.username === accountB.username &&
      accountA.email === accountB.email
    ) {
      return true;
    }
    return false;
  }

  stringify() {
    return `${this.flag} | ${this.username} | ${this.email}`;
  }
}

/**
 * @description 执行 git 命令获取全局和当前存储库用户配置
 */
const logCurrentConfig = async () => {
  const localUserName = await getGitConfig("user.name");
  const localEmail = await getGitConfig("user.email");
  const globalUserName = await getGitConfig("user.name", true);
  const globalEmail = await getGitConfig("user.email", true);

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
const listAccounts = async (obj) => {
  const { accounts } = obj || (await getObject());
  const arr = [];
  for (const flag in accounts) {
    arr.push({
      flag,
      ...accounts[flag],
    });
  }
  console.table(arr);
};

/**
 * @description 使用一个账号
 */
const useAnAccount = async (flag, account, isGlobal = false) => {
  const { username, email } = account;
  try {
    await setGitConfig("user.name", username, isGlobal);
    await setGitConfig("user.email", email, isGlobal);
    console.log(
      `🎉 Toggle success (scope: ${isGlobal ? "global" : "local repository"}).`
    );
    await logCurrentConfig();
  } catch (error) {
    process.exitCode = 1;
    console.error(`❌ Toggle failed: ${error.message}`);
  }
};

/**
 * @description 通过命令行交互的方式，在已存储的列表中选择一个账号
 */
const selectAnAccount = async (obj, isGlobal = false) => {
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

  rl.question(`Please select a index or flag: `, (input) => {
    rl.close();
    const isIndex = !isNaN(Number(input));

    const flag = isIndex ? Object.keys(accounts)[input] : input;
    const account = accounts[flag];

    if (!account) {
      console.log("❌ No this index or flag");
      return selectAnAccount(_obj, isGlobal);
    } else {
      return useAnAccount(flag, account, isGlobal);
    }
  });
};

module.exports = {
  logCurrentConfig,
  listAccounts,
  useAnAccount,
  selectAnAccount,
};
