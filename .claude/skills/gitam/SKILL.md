---
name: gitam
description: Manage and switch Git user.name/user.email identities with the gitam CLI. Use when the user wants to inspect, add, edit, remove, or switch Git identities, manage multiple Git accounts, or configure Git includeIf identity rules.
when_to_use: Use for requests about switching Git users, Git accounts, Git author identity, user.name, user.email, repository-local Git identity, global Git identity, or Git includeIf rules.
---

# gitam

Use this skill when a user wants to inspect, add, edit, remove, or switch Git identities with the `gitam` CLI (`gam` command), or when they want Git `includeIf` identity rules.

## When To Use

- The user asks to switch Git users, Git accounts, Git author identity, `user.name`, or `user.email`.
- The user has separate work, personal, client, or open-source Git identities.
- The user wants a repository-specific Git identity.
- The user wants a global Git identity change.
- The user wants Git `includeIf` rules for a directory or branch.

## Safety Rules

- Inspect first with `gam --json` and `gam list --json`.
- Prefer repository-local switching with `gam use <flag>`.
- Only change global Git config with `gam use -g <flag> --yes` if the user explicitly asked for a global change.
- Use `--no-interactive` in non-interactive agent runs so prompts fail instead of blocking.
- Use `--force` only when overwriting an existing saved flag is intended.

## Recipes

Inspect current local and global identity:

```shell
gam --json
```

List saved identities:

```shell
gam list --json
```

List saved flags:

```shell
gam __flags --json
```

Add an identity:

```shell
gam add <flag> <username> <email>
```

Overwrite an existing saved flag:

```shell
gam add <flag> <username> <email> --force
```

Switch the current repository:

```shell
gam use <flag>
```

Switch the global Git identity:

```shell
gam use -g <flag> --yes
```

Configure a directory-based identity:

```shell
gam include <flag> --gitdir <path>
```

Configure a case-insensitive directory identity:

```shell
gam include <flag> --gitdir-i <path>
```

Configure a branch-based identity:

```shell
gam include <flag> --onbranch <pattern>
```

## Failure Handling

- If a flag does not exist, run `gam list --json` and ask the user which identity to use.
- If a command says confirmation is required, use an explicit flag such as `--yes` only when the user already approved the action.
- If an account flag already exists, do not add `--force` unless overwriting that saved account is part of the user request.
- If Git config writes fail, report the stderr message and avoid retrying with broader scope.
