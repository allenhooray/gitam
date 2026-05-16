const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { getObject } = require("../db");

const COMMANDS = [
  { name: "list", description: "List all accounts" },
  { name: "ls", description: "List all accounts" },
  { name: "add", description: "Add an account" },
  { name: "use", description: "Use an account" },
  { name: "u", description: "Use an account" },
  { name: "include", description: "Configure a global git includeIf rule" },
  { name: "edit", description: "Edit an account" },
  { name: "remove", description: "Remove an account" },
  { name: "rm", description: "Remove an account" },
  { name: "completion", description: "Generate shell completion script" },
];
const COMMAND_NAMES = COMMANDS.map(({ name }) => name).join(" ");
const ACCOUNT_COMMANDS = "use u include edit remove rm";
const COMMAND_OPTIONS = {
  edit: [
    { name: "--username", description: "New account username" },
    { name: "--email", description: "New account email" },
    { name: "--flag", description: "New account flag" },
  ],
  use: [
    { name: "-g", description: "Set global config" },
    { name: "--global", description: "Set global config" },
  ],
  u: [
    { name: "-g", description: "Set global config" },
    { name: "--global", description: "Set global config" },
  ],
  include: [
    { name: "--condition", description: "includeIf condition" },
    { name: "--gitdir", description: "Configure includeIf.gitdir" },
    { name: "--gitdir-i", description: "Configure includeIf.gitdir/i" },
    { name: "--onbranch", description: "Configure includeIf.onbranch" },
  ],
  remove: [
    { name: "-a", description: "Remove all accounts" },
    { name: "--all", description: "Remove all accounts" },
  ],
  rm: [
    { name: "-a", description: "Remove all accounts" },
    { name: "--all", description: "Remove all accounts" },
  ],
};
const SUPPORTED_SHELLS = ["zsh", "bash", "fish", "pwsh", "powershell"];
const COMPLETION_CONFIG = {
  zsh: {
    file: ".gam-completion.zsh",
    rc: "~/.zshrc",
    line: "source ~/.gam-completion.zsh",
  },
  bash: {
    file: ".gam-completion.bash",
    rc: "~/.bashrc",
    line: "source ~/.gam-completion.bash",
  },
  fish: {
    file: ".gam-completion.fish",
    rc: "~/.config/fish/config.fish",
    line: "source ~/.gam-completion.fish",
  },
  pwsh: {
    file: ".gam-completion.ps1",
    rc: "$PROFILE",
    line: '. "$HOME/.gam-completion.ps1"',
  },
  powershell: {
    file: ".gam-completion.ps1",
    rc: "$PROFILE",
    line: '. "$HOME/.gam-completion.ps1"',
  },
};

/**
 * Prints all saved account flags for shell completion helpers.
 *
 * @returns {Promise<void>}
 */
const listFlags = async () => {
  const { accounts } = await getObject();
  console.log(Object.keys(accounts).join("\n"));
};

/**
 * Builds a shell completion script.
 *
 * @param {string} shell - Shell name.
 * @returns {string} Completion script.
 * @throws {Error} When the shell is unsupported.
 */
const normalizeShell = (shell) => {
  if (!shell) {
    return null;
  }

  const name = path.basename(shell).toLowerCase();
  if (name === "powershell.exe" || name === "powershell") {
    return "powershell";
  }
  if (name === "pwsh.exe" || name === "pwsh") {
    return "pwsh";
  }
  return name.replace(/\.exe$/, "");
};

const detectShell = () => {
  const candidates = [
    process.env.GITAM_COMPLETION_SHELL,
    process.env.SHELL,
    process.env.ComSpec,
    process.env.COMSPEC,
  ];

  for (const candidate of candidates) {
    const shell = normalizeShell(candidate);
    if (SUPPORTED_SHELLS.includes(shell)) {
      return shell;
    }
  }

  if (process.env.PSModulePath) {
    return "powershell";
  }

  return null;
};

const getSupportedShellsText = () => SUPPORTED_SHELLS.join(", ");

const getOptionNames = (command) => (COMMAND_OPTIONS[command] || [])
  .map(({ name }) => name)
  .join(" ");

const getZshOptionArray = (command) => (COMMAND_OPTIONS[command] || [])
  .map(({ name, description }) => `        '${name}:${description}'`)
  .join("\n");

const getFishOptions = (binary) => {
  const lines = [];
  for (const [command, options] of Object.entries(COMMAND_OPTIONS)) {
    for (const { name, description } of options) {
      const option = name.startsWith("--")
        ? `-l ${name.slice(2)}`
        : `-s ${name.slice(1)}`;
      const requiresValue = ["--username", "--email", "--flag", "--condition", "--gitdir", "--gitdir-i", "--onbranch"].includes(name)
        ? " -r"
        : "";
      lines.push(`complete -c ${binary} -n "__fish_seen_subcommand_from ${command}" ${option}${requiresValue} -d "${description}"`);
    }
  }
  return lines.join("\n");
};

const getCompletionScript = (shell) => {
  shell = normalizeShell(shell);
  if (shell === "zsh") {
    return `#compdef gam gitam

_gitam() {
  local -a commands flags options
  commands=(
${COMMANDS.map(({ name, description }) => `    '${name}:${description}'`).join("\n")}
  )
  flags=($(\${words[1]} __flags 2>/dev/null))

  if (( CURRENT == 2 )); then
    _describe 'command' commands
    return
  fi

  case "$words[2]" in
    edit)
      options=(
${getZshOptionArray("edit")}
      )
      ;;
    use|u)
      options=(
${getZshOptionArray("use")}
      )
      ;;
    include)
      options=(
${getZshOptionArray("include")}
      )
      ;;
    remove|rm)
      options=(
${getZshOptionArray("remove")}
      )
      ;;
  esac

  if [[ "$words[CURRENT]" == -* && $#options -gt 0 ]]; then
    _describe 'option' options
    return
  fi

  case "$words[2]" in
    use|u|include|remove|rm|edit)
      _describe 'account flag' flags
      ;;
  esac
}

compdef _gitam gam gitam
`;
  }

  if (shell === "bash") {
    return `_gitam_completion() {
  local cur cmd flags commands
  cur="\${COMP_WORDS[COMP_CWORD]}"
  cmd="\${COMP_WORDS[1]}"
  commands="${COMMAND_NAMES}"
  flags="$("\${COMP_WORDS[0]}" __flags 2>/dev/null)"

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
    return 0
  fi

  if [[ "\${cur}" == -* ]]; then
    case "\${cmd}" in
      edit)
        COMPREPLY=( $(compgen -W "${getOptionNames("edit")}" -- "\${cur}") )
        return 0
        ;;
      use|u)
        COMPREPLY=( $(compgen -W "${getOptionNames("use")}" -- "\${cur}") )
        return 0
        ;;
      include)
        COMPREPLY=( $(compgen -W "${getOptionNames("include")}" -- "\${cur}") )
        return 0
        ;;
      remove|rm)
        COMPREPLY=( $(compgen -W "${getOptionNames("remove")}" -- "\${cur}") )
        return 0
        ;;
    esac
  fi

  case "\${cmd}" in
    use|u|include|remove|rm|edit)
      COMPREPLY=( $(compgen -W "\${flags}" -- "\${cur}") )
      ;;
  esac
}

complete -F _gitam_completion gam
complete -F _gitam_completion gitam
`;
  }

  if (shell === "fish") {
    return `function __gitam_accounts
  commandline -opc | read -l tokens
  if contains -- $tokens[2] ${ACCOUNT_COMMANDS}
    command $tokens[1] __flags 2>/dev/null
  end
end

complete -c gam -f
complete -c gitam -f
${COMMANDS.map(({ name, description }) => `complete -c gam -n "__fish_use_subcommand" -a "${name}" -d "${description}"
complete -c gitam -n "__fish_use_subcommand" -a "${name}" -d "${description}"`).join("\n")}
complete -c gam -n "__fish_seen_subcommand_from ${ACCOUNT_COMMANDS}" -a "(__gitam_accounts)"
complete -c gitam -n "__fish_seen_subcommand_from ${ACCOUNT_COMMANDS}" -a "(__gitam_accounts)"
${getFishOptions("gam")}
${getFishOptions("gitam")}
`;
  }

  if (shell === "pwsh" || shell === "powershell") {
    return `$script:GitamCommands = '${COMMAND_NAMES}'.Split(' ')
$script:GitamAccountCommands = '${ACCOUNT_COMMANDS}'.Split(' ')
$script:GitamCommandOptions = @{
  edit = '${getOptionNames("edit")}'
  use = '${getOptionNames("use")}'
  u = '${getOptionNames("u")}'
  include = '${getOptionNames("include")}'
  remove = '${getOptionNames("remove")}'
  rm = '${getOptionNames("rm")}'
}

Register-ArgumentCompleter -Native -CommandName gam,gitam -ScriptBlock {
  param($wordToComplete, $commandAst, $cursorPosition)

  $words = $commandAst.CommandElements | ForEach-Object { $_.ToString() }
  if ($words.Count -le 1) {
    $script:GitamCommands |
      Where-Object { $_ -like "$wordToComplete*" } |
      ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_) }
    return
  }

  if ($wordToComplete -like '-*' -and $script:GitamCommandOptions.ContainsKey($words[1])) {
    $script:GitamCommandOptions[$words[1]].Split(' ') |
      Where-Object { $_ -like "$wordToComplete*" } |
      ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterName', $_) }
    return
  }

  if ($script:GitamAccountCommands -contains $words[1]) {
    & $words[0] __flags 2>$null |
      Where-Object { $_ -like "$wordToComplete*" } |
      ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_) }
  }
}
`;
  }

  throw new Error(`Unsupported shell. Supported shells: ${getSupportedShellsText()}.`);
};

/**
 * Generates a shell completion script and prints setup instructions.
 *
 * @param {string} shell - Optional shell name.
 * @returns {Promise<void>}
 */
const generateCompletionScript = async (shell = detectShell()) => {
  shell = normalizeShell(shell);
  if (!shell) {
    throw new Error(
      `Unable to detect your shell. Set SHELL or GITAM_COMPLETION_SHELL to one of: ${getSupportedShellsText()}.`
    );
  }

  const config = COMPLETION_CONFIG[shell];
  if (!config) {
    throw new Error(`Unsupported shell. Supported shells: ${getSupportedShellsText()}.`);
  }

  const completionPath = path.join(os.homedir(), config.file);
  await fs.writeFile(completionPath, getCompletionScript(shell), "utf8");

  console.log(`Generated ${shell} completion file: ${completionPath}`);
  console.log("");
  console.log(`Add this line to ${config.rc}:`);
  console.log(`  ${config.line}`);
  console.log("");
  console.log("Then restart your shell, or source the rc file in your current session.");
};

module.exports = {
  detectShell,
  generateCompletionScript,
  getCompletionScript,
  listFlags,
  normalizeShell,
};
