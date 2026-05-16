const { getObject } = require("../db");

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
const getCompletionScript = (shell) => {
  if (shell === "zsh") {
    return `#compdef gam gitam

_gitam() {
  local -a commands flags
  commands=(
    'list:List all accounts'
    'ls:List all accounts'
    'add:Add an account'
    'use:Use an account'
    'u:Use an account'
    'include:Configure a global git includeIf rule'
    'edit:Edit an account'
    'remove:Remove an account'
    'rm:Remove an account'
    'completion:Print shell completion script'
  )
  flags=($(\${words[1]} __flags 2>/dev/null))

  if (( CURRENT == 2 )); then
    _describe 'command' commands
    return
  fi

  case "$words[2]" in
    use|u|include|remove|rm|edit)
      _describe 'account flag' flags
      ;;
    completion)
      _values 'shell' zsh bash
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
  commands="list ls add use u include edit remove rm completion"
  flags="$("\${COMP_WORDS[0]}" __flags 2>/dev/null)"

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
    return 0
  fi

  case "\${cmd}" in
    use|u|include|remove|rm|edit)
      COMPREPLY=( $(compgen -W "\${flags}" -- "\${cur}") )
      ;;
    completion)
      COMPREPLY=( $(compgen -W "zsh bash" -- "\${cur}") )
      ;;
  esac
}

complete -F _gitam_completion gam
complete -F _gitam_completion gitam
`;
  }

  throw new Error("Unsupported shell. Please use `zsh` or `bash`.");
};

/**
 * Prints a shell completion script.
 *
 * @param {string} shell - Shell name.
 */
const printCompletionScript = (shell) => {
  console.log(getCompletionScript(shell));
};

module.exports = {
  getCompletionScript,
  listFlags,
  printCompletionScript,
};
