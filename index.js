#!/usr/bin/env node
const commander = require("commander");
const package = require("./package.json");
const { clearFile, getObject } = require("./src/db");
const {
  addAccount,
  addAccountInteractively,
  editAccount,
  listFlags,
  logCurrentConfig,
  listAccounts,
  printCompletionScript,
  removeAccount,
  removeAccountInteractively,
  validateFlag,
  useAnAccount,
  selectAnAccount,
} = require("./src/actions");

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
  .argument("[flag]", "Account Flag")
  .argument("[username]", "Account Username")
  .argument("[email]", "Account Email")
  .action(runAction(async (flag, username, email) => {
    const args = [flag, username, email].filter((value) => value !== undefined);
    if (!args.length) {
      await addAccountInteractively();
      return;
    }
    if (args.length !== 3) {
      throw new Error("Please provide flag, username, and email, or run `gam add` interactively.");
    }
    await addAccount(flag, username, email);
  }));

commander
  .command("edit")
  .description("Edit an account.")
  .argument("<flag>", "Account Flag")
  .option("--username <username>", "New account username.")
  .option("--email <email>", "New account email.")
  .option("--flag <flag>", "New account flag.")
  .action(runAction(async (flag, options) => {
    await editAccount(flag, options);
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
  .argument("[flag]", "Account Flag or list index")
  .option("-a, --all", "Remove all accounts (clear the db file).")
  .description("Remove an account.")
  .action(runAction(async (flag, { all }) => {
    if (all) {
      await clearFile();
      console.log("🧹 Clear done.");
      return;
    }

    const obj = await getObject();
    if (!flag) {
      if (!Object.keys(obj.accounts).length) {
        return removeAccountInteractively(obj);
      }
      await listAccounts(obj);
      return removeAccountInteractively(obj);
    }

    if (!(await removeAccount(obj, flag))) {
      console.log("🤔 Not found the flag or index.");
    }
  }));

commander
  .command("completion")
  .description("Print shell completion script.")
  .argument("<shell>", "Shell name: zsh or bash")
  .action(runAction(async (shell) => {
    printCompletionScript(shell);
  }));

commander
  .command("__flags", { hidden: true })
  .action(runAction(async () => {
    await listFlags();
  }));

commander.parse(process.argv);
