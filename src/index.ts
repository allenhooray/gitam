#!/usr/bin/env node
import { program } from "commander";
import packageJson from '../package.json';
import { writeFile, clearFile, getObject } from "./db";
import {
  logCurrentConfig,
  listAccounts,
  useAnAccount,
  selectAnAccount,
} from "./actions";

program
  .version(packageJson.version)
  .description(packageJson.description)
  .action(async () => {
    await logCurrentConfig();
  });

program
  .command("list")
  .alias("ls")
  .description("List all accounts.")
  .action(async () => {
    await listAccounts();
  });

program
  .command("add")
  .description("Add an account.")
  .argument("<flag>", "Account Flag")
  .argument("<username>", "Account Username")
  .argument("<email>", "Account Email")
  .action(async (flag, username, email) => {
    const obj = await getObject();
    obj.accounts[flag] = {
      username,
      email,
    };
    await writeFile(obj);
    console.log("👌 Add success.");
  });

program
  .command("use")
  .alias("u")
  .description("Use an account.")
  .argument("[flag]", "Account Flag")
  .option("-g, --global", "Set global config.")
  .action(async (flag, { global }) => {
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

    const account = obj.accounts[flag];
    if (account) {
      useAnAccount(flag, account, global);
    } else {
      console.log(
        "🤔 Not found the flag. You Can run `list` to show the list of accounts."
      );
    }
  });

program
  .command("remove")
  .alias("rm")
  .argument("[flag]", "Account Flag")
  .option("-a, --all", "Remove all accounts (clear the db file).")
  .description("Remove an account.")
  .action(async (flag, { all }) => {
    if (all) {
      await clearFile();
      console.log("🧹 Clear done.");
      return;
    }
    const obj = await getObject();
    if (obj.accounts[flag]) {
      delete obj.accounts[flag];
      await writeFile(obj);
      console.log("👋 Remove success.");
    } else {
      console.log("🤔 Not found the flag.");
    }
  });

program.parse(process.argv);
