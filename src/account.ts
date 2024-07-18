import { AccountInfo } from "./types";

export class Account implements AccountInfo {
  username: string;
  email: string;
  flag: string;

  constructor(username: string, email: string, flag = "") {
    this.username = username;
    this.email = email;
    this.flag = flag;
  }

  static isEqual(accountA: AccountInfo, accountB: AccountInfo) {
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