# AI Agent Usage

gitam is designed to be easy for AI agents to discover and safe for them to call from shell-enabled coding environments.

## Discovery Files

- `AGENTS.md`: concise rules for coding agents.
- `llms.txt`: compact LLM-facing package summary.
- `.github/copilot-instructions.md`: GitHub Copilot project instructions.
- `.claude/skills/gitam/SKILL.md`: Claude Code project skill.
- `docs/gitam-skill/SKILL.md`: portable skill source for copying into other agents.

## Claude Code

Project skill, shared through this repository:

```shell
.claude/skills/gitam/SKILL.md
```

Install as a personal Claude Code skill:

```shell
mkdir -p ~/.claude/skills/gitam
cp docs/gitam-skill/SKILL.md ~/.claude/skills/gitam/SKILL.md
```

Invoke directly in Claude Code:

```text
/gitam
```

Or ask naturally:

```text
Inspect my current Git identity and switch only this repository to my github account.
```

## Recommended Agent Workflow

Inspect before mutating:

```shell
gam --json
gam list --json
gam __flags --json
```

Switch only the current repository by default:

```shell
gam use <flag>
```

Only change global Git config when the user explicitly approves a global change:

```shell
gam use -g <flag> --yes
```

Use `--no-interactive` in automation so prompts fail instead of blocking. Use `--force` only when overwriting an existing saved account flag is intentional.
