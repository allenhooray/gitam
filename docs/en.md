# GAM - Git Account Manager

English | [中文](../README.md)

## Install

```shell
npm i -g gitam
```

## Use

Type `gam -h` or `gitam -h` in the terminal to see all the commands.

It is recommended to use the `gam` command in preference. But maybe on your device, the `gam` command is already occupied, in which case you can use the `gitam` command instead.

## Feature

- ✅ View global/local repository git user
- ✅ Set global/local repository git user
- ✅ Manage frequently used git users
- ✅ Quickly switch stored git users
- ✅ Add and edit accounts interactively
- ✅ Mark current global/local accounts in the list
- ✅ Confirm before changing the global git account
- ✅ zsh/bash shell completion

## Example

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

## Commands

### Add an account

Pass all account fields at once:

```shell
gam add github bob bob@email.com
```

Or run `gam add` and follow the prompts for username, email, and flag.

When the flag already exists, GitAM asks whether to overwrite it. In non-interactive environments, GitAM will not overwrite automatically; choose a new flag or use `gam edit`.

### Edit an account

```shell
gam edit github --username bob
gam edit github --email bob@new-email.com
gam edit github --flag github-work
```

At least one option is required. Input is trimmed and validated for flag, username, and email.

### Use an account

```shell
gam use github
gam use -g github
```

`gam use <flag>` changes the current repository config. `gam use -g <flag>` changes the global config, shows the current and target global account, and asks for confirmation before writing.

### List accounts

```shell
gam list
```

The table includes a `status` column with `local`, `global`, or `local,global` for accounts currently in use.

### Remove an account

```shell
gam remove github
gam remove 1
gam remove
```

Remove an account by flag or list index. Run `gam remove` without arguments to show the account list and choose an index or flag interactively.

### Shell completion

```shell
gam completion zsh > ~/.gam-completion.zsh
echo 'source ~/.gam-completion.zsh' >> ~/.zshrc
```

Or:

```shell
gam completion bash > ~/.gam-completion.bash
echo 'source ~/.gam-completion.bash' >> ~/.bashrc
```

Completion scripts complete command names and saved account flags for `use`, `edit`, and `remove`.
