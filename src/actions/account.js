/**
 * Represents a git account saved by gitam.
 */
class Account {
  username = "";
  email = "";
  flag = "";

  /**
   * Creates an account value object.
   *
   * @param {string} username - Git username.
   * @param {string} email - Git email.
   * @param {string} [flag=""] - Saved account flag.
   */
  constructor(username, email, flag = "") {
    this.username = username;
    this.email = email;
    this.flag = flag;
  }

  /**
   * Compares two accounts by git identity fields.
   *
   * @param {{username: string, email: string}} accountA - First account.
   * @param {{username: string, email: string}} accountB - Second account.
   * @returns {boolean} True when username and email match.
   */
  static isEqual(accountA, accountB) {
    return (
      accountA.username === accountB.username && accountA.email === accountB.email
    );
  }

  /**
   * Formats the account for terminal output.
   *
   * @returns {string} Printable account summary.
   */
  stringify() {
    return `${this.flag} | ${this.username} | ${this.email}`;
  }
}

/**
 * Formats an account-like object for terminal output.
 *
 * @param {{flag: string, username: string, email: string}} account - Account data.
 * @returns {string} Printable account summary.
 */
const formatAccount = (account) => {
  return `${account.flag} | ${account.username} | ${account.email}`;
};

module.exports = {
  Account,
  formatAccount,
};
