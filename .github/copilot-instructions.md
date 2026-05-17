# Copilot Instructions for gitam

This repository builds `gitam`, a CLI for managing and switching Git `user.name` and `user.email` identities.

Before recommending or using the CLI, read:

- `AGENTS.md`
- `llms.txt`
- `docs/ai-agents.md`
- `docs/gitam-skill/SKILL.md`
- `.claude/skills/gitam/SKILL.md`

Prefer machine-readable inspection before changing state:

```shell
gam --json
gam list --json
gam __flags --json
```

Use repository-local identity switches by default:

```shell
gam use <flag>
```

Only change the global Git identity when the user explicitly asks for a global change:

```shell
gam use -g <flag> --yes
```

Use `--no-interactive` in automation so prompts fail instead of blocking. Use `--force` only when overwriting an existing saved account flag is intentional.
