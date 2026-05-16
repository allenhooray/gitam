<h1 align="center">
  One command to <span style="color: #f97316;">switch Git users</span>
</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/gitam"><img alt="version" src="https://img.shields.io/badge/version-v1.2.1--beta.0-orange"></a>
  <a href="./docs/zh.md">中文</a>
</p>

# GAM - Git Account Manager

GAM keeps your Git identities close at hand. Save the accounts you use often, see which one is active, and switch the current repository or global Git user from one short command.

## Why GAM

- Switch Git users without retyping `git config user.name` and `git config user.email`.
- Store work, personal, client, or open-source identities behind memorable flags.
- See whether an account is currently used by the local repository, global Git config, or both.
- Confirm before changing the global Git user, so a local switch does not accidentally become a machine-wide change.
- Add, edit, remove, and use accounts from either direct commands or interactive prompts.
- Generate zsh or bash completion for faster account switching.

## Installation

```shell
npm i -g gitam
```

## Quick Start

Add an account:

```shell
gam add github bob bob@email.com
```

Switch the current repository to that account:

```shell
gam use github
```

Switch the global Git user after confirmation:

```shell
gam use -g github
```

Check all commands:

```shell
gam -h
```

You can also use `gitam` anywhere `gam` is shown. `gam` is shorter and recommended, while `gitam` is useful if another program already owns the `gam` command on your machine.

## Commands

### Add an Account

Pass all account fields at once:

```shell
gam add github bob bob@email.com
```

Or run `gam add` and follow the prompts for username, email, and flag:

```shell
gam add
```

When the flag already exists, GAM asks whether to overwrite it. In non-interactive environments, GAM will not overwrite automatically; choose a new flag or use `gam edit`.

### Edit an Account

```shell
gam edit github --username bob
gam edit github --email bob@new-email.com
gam edit github --flag github-work
```

At least one option is required. Input is trimmed and validated for flag, username, and email.

### Use an Account

Change the current repository config:

```shell
gam use github
```

Change the global config:

```shell
gam use -g github
```

`gam use <flag>` writes to the current repository. `gam use -g <flag>` writes to the global Git config, shows the current and target global account, and asks for confirmation before writing.

Run `gam use` without a flag to pick from saved accounts interactively.

### List Accounts

```shell
gam list
```

The table includes a `status` column with `local`, `global`, or `local,global` for accounts currently in use.

### Remove an Account

Remove by flag:

```shell
gam remove github
```

Remove by list index:

```shell
gam remove 1
```

Run without arguments to show the account list and choose an index or flag interactively:

```shell
gam remove
```

### Shell Completion

Generate zsh completion:

```shell
gam completion zsh > ~/.gam-completion.zsh
echo 'source ~/.gam-completion.zsh' >> ~/.zshrc
```

Generate bash completion:

```shell
gam completion bash > ~/.gam-completion.bash
echo 'source ~/.gam-completion.bash' >> ~/.bashrc
```

Completion scripts complete command names and saved account flags for `use`, `edit`, and `remove`.

## Examples

```shell
gam add github bob bob@email.com
gam add
gam edit github --email bob@new-email.com
gam add gitlab tom tom@email.com
gam use
gam use -g
gam completion zsh > ~/.gam-completion.zsh
echo 'source ~/.gam-completion.zsh' >> ~/.zshrc
```
