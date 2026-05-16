const readline = require("readline");
const { getObject, writeFile } = require("../db");
const { Account, formatAccount } = require("./account");
const { getCurrentAccounts, setGitConfig } = require("./git-config");
const {
  askQuestion,
  confirmQuestion,
  isInteractive,
  promptValidated,
} = require("./prompt");
const {
  normalizeAccountInput,
  trimValue,
  validateAccountField,
  validateEmail,
  validateFlag,
} = require("./validation");

/**
 * Prints the current global and repository git account configuration.
 *
 * @returns {Promise<void>}
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
 * Prints saved accounts as a table and marks active local/global matches.
 *
 * @param {{accounts: Record<string, {username: string, email: string}>}} [obj] - Optional loaded database object.
 * @returns {Promise<void>}
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

/**
 * Resolves account input as either a table index or a saved flag.
 *
 * @param {Record<string, {username: string, email: string}>} accounts - Saved accounts.
 * @param {*} input - User-provided index or flag.
 * @returns {string|undefined} Resolved flag.
 */
const resolveAccountFlag = (accounts, input) => {
  const value = trimValue(input);
  if (/^\d+$/.test(value)) {
    return Object.keys(accounts)[Number(value)];
  }
  return value;
};

/**
 * Confirms whether an existing account flag may be overwritten.
 *
 * @param {string} flag - Existing account flag.
 * @returns {Promise<boolean>} True when overwrite is confirmed.
 */
const confirmOverwriteFlag = async (flag) => {
  if (!isInteractive()) {
    throw new Error(
      `Account flag "${flag}" already exists. Please choose another flag or use \`gam edit\`.`
    );
  }
  return await confirmQuestion("Overwrite existing account?");
};

/**
 * Adds or updates an account from command arguments.
 *
 * @param {*} flag - Account flag.
 * @param {*} username - Account username.
 * @param {*} email - Account email.
 * @returns {Promise<void>}
 */
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

/**
 * Prompts for account fields and saves the account.
 *
 * @returns {Promise<void>}
 */
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

/**
 * Edits account fields or renames an account flag.
 *
 * @param {*} flag - Current account flag.
 * @param {{username?: string, email?: string, flag?: string}} options - New account values.
 * @returns {Promise<void>}
 */
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

/**
 * Removes an account by flag or table index.
 *
 * @param {{accounts: Record<string, {username: string, email: string}>}} obj - Loaded database object.
 * @param {*} input - Account flag or table index.
 * @returns {Promise<boolean>} True when an account was removed.
 */
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

/**
 * Prompts the user to remove an account by index or flag.
 *
 * @param {{accounts: Record<string, {username: string, email: string}>}} [obj] - Optional loaded database object.
 * @returns {Promise<void>}
 */
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

/**
 * Applies an account to the current repository or global git config.
 *
 * @param {string} flag - Selected account flag.
 * @param {{username: string, email: string}} account - Selected account data.
 * @param {boolean} [isGlobal=false] - Whether to update global git config.
 * @returns {Promise<void>}
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
 * Prompts the user to select a saved account and applies it.
 *
 * @param {{accounts: Record<string, {username: string, email: string}>}} [obj] - Optional loaded database object.
 * @param {boolean} [isGlobal=false] - Whether to update global git config.
 * @returns {Promise<void>}
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

module.exports = {
  addAccount,
  addAccountInteractively,
  editAccount,
  listAccounts,
  logCurrentConfig,
  removeAccount,
  removeAccountInteractively,
  resolveAccountFlag,
  selectAnAccount,
  useAnAccount,
};
