#!/usr/bin/env node
const commander = require("commander");
const package = require("./package.json");
const { writeFile, clearFile, getObject } = require("./src/db");
const {
  logCurrentConfig,
  listAccounts,
  useAnAccount,
  selectAnAccount,
} = require("./src/actions");

const FLAG_REGEXP = /^[A-Za-z0-9_-]+$/;

const handleError = (error) => {
  process.exitCode = 1;
  console.error(`❌ ${error.message}`);
};

const runAction = (action) => async (...args) => {
  try {
    await action(...args);
  } catch (error) {
    handleError(error);
  }
};

const isBlank = (value) => !String(value || "").trim();

const validateFlag = (flag) => {
  if (isBlank(flag) || !FLAG_REGEXP.test(flag)) {
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

commander
  .version(package.version)
  .description(package.description)
  .action(runAction(async () => {
    await logCurrentConfig();
  }));

commander
  .command("list")
  .alias("ls")
  .description("List all accounts.")
  .action(runAction(async () => {
    await listAccounts();
  }));

commander
  .command("add")
  .description("Add an account.")
  .argument("<flag>", "Account Flag")
  .argument("<username>", "Account Username")
  .argument("<email>", "Account Email")
  .action(runAction(async (flag, username, email) => {
    validateFlag(flag);
    validateAccountField("username", username);
    validateAccountField("email", email);

    const obj = await getObject();
    const exists = Boolean(obj.accounts[flag]);
    obj.accounts[flag] = {
      username,
      email,
    };
    await writeFile(obj);
    console.log(exists ? "♻️ Update success." : "👌 Add success.");
  }));

commander
  .command("use")
  .alias("u")
  .description("Use an account.")
  .argument("[flag]", "Account Flag")
  .option("-g, --global", "Set global config.")
  .action(runAction(async (flag, { global }) => {
    const obj = await getObject();

    if (!Object.keys(obj.accounts).length) {
      console.log(
        "🤚 No account can be selected, please add an account first."
      );
      return;
    }

    if (!flag) {
      await listAccounts(obj);
      return selectAnAccount(obj, global);
    }

    validateFlag(flag);
    const account = obj.accounts[flag];
    if (account) {
      await useAnAccount(flag, account, global);
    } else {
      console.log(
        "🤔 Not found the flag. You Can run `list` to show the list of accounts."
      );
    }
  }));

commander
  .command("remove")
  .alias("rm")
  .argument("[flag]", "Account Flag")
  .option("-a, --all", "Remove all accounts (clear the db file).")
  .description("Remove an account.")
  .action(runAction(async (flag, { all }) => {
    if (all) {
      await clearFile();
      console.log("🧹 Clear done.");
      return;
    }
    if (!flag) {
      throw new Error("Please provide an account flag or use --all.");
    }
    validateFlag(flag);

    const obj = await getObject();
    if (obj.accounts[flag]) {
      delete obj.accounts[flag];
      await writeFile(obj);
      console.log("👋 Remove success.");
    } else {
      console.log("🤔 Not found the flag.");
    }
  }));

commander.parse(process.argv);
