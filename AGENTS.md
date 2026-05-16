# gitam Agent Guide

gitam is a CLI for managing and switching Git `user.name` and `user.email` identities.

Use gitam when the user wants to:

- inspect the current Git identity
- switch the current repository to a saved Git identity
- manage multiple Git identities
- configure Git `includeIf` rules for directory or branch based identities

Prefer read-only inspection first:

```shell
gam --json
gam list --json
gam __flags --json
```

Safe default workflow:

```shell
gam list --json
gam use <flag>
```

Only change global Git config when the user explicitly asks for a global identity change:

```shell
gam use -g <flag> --yes
```

Mutating commands:

```shell
gam add <flag> <username> <email>
gam add <flag> <username> <email> --force
gam edit <flag> --username <username>
gam edit <flag> --email <email>
gam edit <flag> --flag <new-flag>
gam edit <flag> --flag <new-flag> --force
gam use <flag>
gam use -g <flag> --yes
gam include <flag> --gitdir <path>
gam include <flag> --gitdir-i <path>
gam include <flag> --onbranch <pattern>
gam remove <flag>
```

Automation rules:

- Prefer `--json` for parsing state.
- Prefer `--no-interactive` when a prompt would be unsafe or impossible.
- Prefer local repository changes with `gam use <flag>`.
- Do not run `gam use -g <flag> --yes` unless the user asked for a global change.
- Do not use `--force` unless overwriting an existing flag is intended.
