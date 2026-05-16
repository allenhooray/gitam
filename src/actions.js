const readline = require("readline");
const child_process = require("child_process");
const { getObject, writeFile } = require("./db");

const FLAG_REGEXP = /^[A-Za-z0-9_-]+$/;
const EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const trimValue = (value) => String(value || "").trim();
const isBlank = (value) => !trimValue(value);
const isInteractive = () =>
  Boolean(process.stdin.isTTY || process.env.GITAM_FORCE_INTERACTIVE);

const validateFlag = (flag) => {
  if (isBlank(flag) || !FLAG_REGEXP.test(trimValue(flag))) {
    throw new Error(
      "Account flag must contain only letters, numbers, underscores, or hyphens."
    );
  }
};

const validateAccountField = (name, value) => {
  if (isBlank(value)) {
    throw new Error(`Account ${name} cannot be empty.`);
  }
};

const validateEmail = (email) => {
  validateAccountField("email", email);
  if (!EMAIL_REGEXP.test(trimValue(email))) {
    throw new Error("Account email must be a valid email address.");
  }
};

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

const askQuestion = (rl, question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

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
    return (
      accountA.username === accountB.username && accountA.email === accountB.email
    );
  }

  stringify() {
    return `${this.flag} | ${this.username} | ${this.email}`;
  }
}

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

/**
 * @description 执行 git 命令获取全局和当前存储库用户配置
 */
const logCurrentConfig = async () => {
  const { local: localAccount, global: globalAccount } =
    await getCurrentAccounts();

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
  const current = await getCurrentAccounts();
  const rows = {};
  Object.entries(accounts).forEach(([flag, account], index) => {
    const status = [];
    if (Account.isEqual(current.local, account)) {
      status.push("local");
    }
    if (Account.isEqual(current.global, account)) {
      status.push("global");
    }
    rows[index] = {
      flag,
      status: status.join(","),
      ...account,
    };
  });
  console.table(rows);
};

const resolveAccountFlag = (accounts, input) => {
  const value = trimValue(input);
  if (/^\d+$/.test(value)) {
    return Object.keys(accounts)[Number(value)];
  }
  return value;
};

const confirmOverwriteFlag = async (flag) => {
  if (!isInteractive()) {
    throw new Error(
      `Account flag "${flag}" already exists. Please choose another flag or use \`gam edit\`.`
    );
  }
  return await confirmQuestion("Overwrite existing account?");
};

const addAccount = async (flag, username, email) => {
  const accountInput = normalizeAccountInput(flag, username, email);
  const obj = await getObject();
  const exists = Boolean(obj.accounts[accountInput.flag]);

  if (exists) {
    const confirmed = await confirmOverwriteFlag(accountInput.flag);
    if (!confirmed) {
      console.log("👌 Add canceled.");
      return;
    }
  }

  obj.accounts[accountInput.flag] = {
    username: accountInput.username,
    email: accountInput.email,
  };
  await writeFile(obj);
  console.log(exists ? "♻️ Update success." : "👌 Add success.");
};

const addAccountInteractively = async () => {
  if (!isInteractive()) {
    throw new Error("Interactive add requires an interactive terminal.");
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const username = await promptValidated(rl, "Username: ", (value) =>
      validateAccountField("username", value)
    );
    const email = await promptValidated(rl, "Email: ", validateEmail);
    const obj = await getObject();

    while (true) {
      const flag = await promptValidated(rl, "Flag: ", validateFlag);
      if (!obj.accounts[flag]) {
        obj.accounts[flag] = { username, email };
        await writeFile(obj);
        console.log("👌 Add success.");
        return;
      }

      if (await confirmQuestion("Overwrite existing account?", rl)) {
        obj.accounts[flag] = { username, email };
        await writeFile(obj);
        console.log("♻️ Update success.");
        return;
      }
    }
  } finally {
    rl.close();
  }
};

const editAccount = async (flag, options) => {
  const currentFlag = trimValue(flag);
  validateFlag(currentFlag);

  const hasUsername = Object.prototype.hasOwnProperty.call(options, "username");
  const hasEmail = Object.prototype.hasOwnProperty.call(options, "email");
  const hasFlag = Object.prototype.hasOwnProperty.call(options, "flag");
  if (!hasUsername && !hasEmail && !hasFlag) {
    throw new Error("Please provide --username, --email, or --flag.");
  }

  const obj = await getObject();
  const currentAccount = obj.accounts[currentFlag];
  if (!currentAccount) {
    throw new Error(`Account flag "${currentFlag}" was not found.`);
  }

  const nextFlag = hasFlag ? trimValue(options.flag) : currentFlag;
  validateFlag(nextFlag);
  const nextAccount = {
    username: hasUsername ? trimValue(options.username) : currentAccount.username,
    email: hasEmail ? trimValue(options.email) : currentAccount.email,
  };
  validateAccountField("username", nextAccount.username);
  validateEmail(nextAccount.email);

  if (nextFlag !== currentFlag && obj.accounts[nextFlag]) {
    const confirmed = await confirmOverwriteFlag(nextFlag);
    if (!confirmed) {
      console.log("👌 Edit canceled.");
      return;
    }
  }

  delete obj.accounts[currentFlag];
  obj.accounts[nextFlag] = nextAccount;
  await writeFile(obj);
  console.log("👌 Edit success.");
};

const removeAccount = async (obj, input) => {
  const resolvedFlag = resolveAccountFlag(obj.accounts, input);
  if (resolvedFlag) {
    validateFlag(resolvedFlag);
  }

  if (resolvedFlag && obj.accounts[resolvedFlag]) {
    delete obj.accounts[resolvedFlag];
    await writeFile(obj);
    console.log("👋 Remove success.");
    return true;
  }

  return false;
};

const removeAccountInteractively = async (obj) => {
  if (!isInteractive()) {
    throw new Error("Interactive remove requires an interactive terminal.");
  }

  const _obj = obj || (await getObject());
  const { accounts } = _obj;

  if (!Object.keys(accounts).length) {
    console.log("🤚 No account can be removed, please add an account first.");
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    while (true) {
      const input = trimValue(
        await askQuestion(rl, "Please select an index or flag to remove: ")
      );
      if (!input) {
        console.log("❌ Please enter an index or flag.");
        continue;
      }

      if (await removeAccount(_obj, input)) {
        return;
      }

      console.log("❌ No this index or flag");
    }
  } finally {
    rl.close();
  }
};

const formatAccount = (account) => {
  return `${account.flag} | ${account.username} | ${account.email}`;
};

/**
 * @description 使用一个账号
 */
const useAnAccount = async (flag, account, isGlobal = false) => {
  const { username, email } = account;
  try {
    if (isGlobal) {
      const { global } = await getCurrentAccounts();
      console.log(`[Current Global]`, formatAccount(global));
      console.log(`[Target Global]`, formatAccount(new Account(username, email, flag)));
      const confirmed = await confirmQuestion("Change global git account?");
      if (!confirmed) {
        console.log("👌 Toggle canceled.");
        return;
      }
    }

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

  let selectedFlag;
  let selectedAccount;
  try {
    while (true) {
      const input = trimValue(
        await askQuestion(rl, `Please select an index or flag: `)
      );
      if (!input) {
        console.log("❌ Please enter an index or flag.");
        continue;
      }

      const resolvedFlag = resolveAccountFlag(accounts, input);
      const account = accounts[resolvedFlag];

      if (!account) {
        console.log("❌ No this index or flag");
        continue;
      }

      selectedFlag = resolvedFlag;
      selectedAccount = account;
      break;
    }
  } finally {
    rl.close();
  }

  await useAnAccount(selectedFlag, selectedAccount, isGlobal);
};

const listFlags = async () => {
  const { accounts } = await getObject();
  console.log(Object.keys(accounts).join("\n"));
};

const getCompletionScript = (shell) => {
  if (shell === "zsh") {
    return `#compdef gam gitam

_gitam() {
  local -a commands flags
  commands=(
    'list:List all accounts'
    'ls:List all accounts'
    'add:Add an account'
    'use:Use an account'
    'u:Use an account'
    'edit:Edit an account'
    'remove:Remove an account'
    'rm:Remove an account'
    'completion:Print shell completion script'
  )
  flags=($(\${words[1]} __flags 2>/dev/null))

  if (( CURRENT == 2 )); then
    _describe 'command' commands
    return
  fi

  case "$words[2]" in
    use|u|remove|rm|edit)
      _describe 'account flag' flags
      ;;
    completion)
      _values 'shell' zsh bash
      ;;
  esac
}

compdef _gitam gam gitam
`;
  }

  if (shell === "bash") {
    return `_gitam_completion() {
  local cur cmd flags commands
  cur="\${COMP_WORDS[COMP_CWORD]}"
  cmd="\${COMP_WORDS[1]}"
  commands="list ls add use u edit remove rm completion"
  flags="$("\${COMP_WORDS[0]}" __flags 2>/dev/null)"

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
    return 0
  fi

  case "\${cmd}" in
    use|u|remove|rm|edit)
      COMPREPLY=( $(compgen -W "\${flags}" -- "\${cur}") )
      ;;
    completion)
      COMPREPLY=( $(compgen -W "zsh bash" -- "\${cur}") )
      ;;
  esac
}

complete -F _gitam_completion gam
complete -F _gitam_completion gitam
`;
  }

  throw new Error("Unsupported shell. Please use `zsh` or `bash`.");
};

const printCompletionScript = (shell) => {
  console.log(getCompletionScript(shell));
};

module.exports = {
  addAccount,
  addAccountInteractively,
  editAccount,
  listFlags,
  logCurrentConfig,
  listAccounts,
  normalizeAccountInput,
  printCompletionScript,
  removeAccount,
  removeAccountInteractively,
  resolveAccountFlag,
  validateFlag,
  useAnAccount,
  selectAnAccount,
};
