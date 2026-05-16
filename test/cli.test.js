const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const CLI = path.join(ROOT, "index.js");

const makeTempDir = async () => {
  return await fs.mkdtemp(path.join(os.tmpdir(), "gitam-test-"));
};

const makeMockGit = async (dir) => {
  const binDir = path.join(dir, "bin");
  const logPath = path.join(dir, "git.log");
  await fs.mkdir(binDir, { recursive: true });
  const gitPath = path.join(binDir, "git");
  await fs.writeFile(
    gitPath,
    `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
const logPath = process.env.GITAM_MOCK_GIT_LOG;
const failToken = process.env.GITAM_MOCK_GIT_FAIL;
const configs = {
  "user.name": process.env.GITAM_MOCK_LOCAL_NAME || "",
  "user.email": process.env.GITAM_MOCK_LOCAL_EMAIL || "",
  "global:user.name": process.env.GITAM_MOCK_GLOBAL_NAME || "",
  "global:user.email": process.env.GITAM_MOCK_GLOBAL_EMAIL || "",
};
if (logPath) {
  fs.appendFileSync(logPath, JSON.stringify(args) + "\\n");
}
if (failToken && args.join(" ").includes(failToken)) {
  console.error("mock failure");
  process.exit(2);
}
if (args[0] === "config" && (args.length === 2 || (args[1] === "--global" && args.length === 3))) {
  const key = args[1] === "--global" ? "global:" + args[2] : args[1];
  const value = configs[key];
  if (value) {
    console.log(value);
    process.exit(0);
  }
  process.exit(1);
}
process.exit(0);
`,
    "utf8"
  );
  await fs.chmod(gitPath, 0o755);
  return { binDir, logPath };
};

const runCli = async (args, options = {}) => {
  const env = {
    ...process.env,
    HOME: options.home,
    USERPROFILE: options.home,
    ...options.env,
  };

  if (options.pathPrefix) {
    env.PATH = `${options.pathPrefix}${path.delimiter}${process.env.PATH}`;
  }

  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      cwd: ROOT,
      env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
    if (Array.isArray(options.input)) {
      const inputDelayMs = options.inputDelayMs || 100;
      options.input.forEach((chunk, index) => {
        setTimeout(() => {
          child.stdin.write(chunk);
          if (index === options.input.length - 1) {
            child.stdin.end();
          }
        }, (index + 1) * inputDelayMs);
      });
    } else if (options.input) {
      child.stdin.end(options.input);
    } else {
      child.stdin.end();
    }
  });
};

const readDb = async (home) => {
  return JSON.parse(await fs.readFile(path.join(home, ".gam.json"), "utf8"));
};

const readGitLog = async (logPath) => {
  const content = await fs.readFile(logPath, "utf8");
  return content
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
};

const hasGitCall = (calls, expected) => {
  return calls.some((args) => JSON.stringify(args) === JSON.stringify(expected));
};

test("adds, lists, and removes accounts", async () => {
  const home = await makeTempDir();
  const mockGit = await makeMockGit(home);

  let result = await runCli(["add", "github", "bob", "bob@example.com"], {
    home,
  });
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Add success/);
  assert.deepEqual(await readDb(home), {
    accounts: {
      github: {
        username: "bob",
        email: "bob@example.com",
      },
    },
  });

  result = await runCli(["add", "github", "tom", "tom@example.com"], {
    home,
  });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /already exists/);
  assert.deepEqual(await readDb(home), {
    accounts: {
      github: {
        username: "bob",
        email: "bob@example.com",
      },
    },
  });

  result = await runCli(["list"], {
    home,
    pathPrefix: mockGit.binDir,
    env: {
      GITAM_MOCK_LOCAL_NAME: "bob",
      GITAM_MOCK_LOCAL_EMAIL: "bob@example.com",
    },
  });
  assert.equal(result.code, 0);
  assert.equal((result.stdout.match(/\bindex\b/g) || []).length, 1);
  assert.match(result.stdout, /status/);
  assert.match(result.stdout, /local/);
  assert.match(result.stdout, /github/);
  assert.match(result.stdout, /bob@example\.com/);

  result = await runCli(["remove", "github"], { home });
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Remove success/);
  assert.deepEqual(await readDb(home), { accounts: {} });
});

test("removes accounts by list index", async () => {
  const home = await makeTempDir();
  await fs.writeFile(
    path.join(home, ".gam.json"),
    JSON.stringify({
      accounts: {
        github: {
          username: "bob",
          email: "bob@example.com",
        },
        gitlab: {
          username: "tom",
          email: "tom@example.com",
        },
      },
    }),
    "utf8"
  );

  let result = await runCli(["remove", "1"], { home });
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Remove success/);
  assert.deepEqual(await readDb(home), {
    accounts: {
      github: {
        username: "bob",
        email: "bob@example.com",
      },
    },
  });

  result = await runCli(["remove", "3"], { home });
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Not found the flag or index/);
  assert.deepEqual(await readDb(home), {
    accounts: {
      github: {
        username: "bob",
        email: "bob@example.com",
      },
    },
  });
});

test("interactive remove handles blank, invalid, and index input", async () => {
  const home = await makeTempDir();
  const mockGit = await makeMockGit(home);
  await fs.writeFile(
    path.join(home, ".gam.json"),
    JSON.stringify({
      accounts: {
        github: {
          username: "bob",
          email: "bob@example.com",
        },
        gitlab: {
          username: "tom",
          email: "tom@example.com",
        },
      },
    }),
    "utf8"
  );

  const result = await runCli(["remove"], {
    home,
    pathPrefix: mockGit.binDir,
    input: ["\n", "9\n", "1\n"],
    inputDelayMs: 400,
    env: {
      GITAM_FORCE_INTERACTIVE: "1",
    },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Please select an index or flag to remove/);
  assert.match(result.stdout, /Please enter an index or flag/);
  assert.match(result.stdout, /No this index or flag/);
  assert.match(result.stdout, /Remove success/);
  assert.deepEqual(await readDb(home), {
    accounts: {
      github: {
        username: "bob",
        email: "bob@example.com",
      },
    },
  });
});

test("interactive remove reports empty account list", async () => {
  const home = await makeTempDir();

  const result = await runCli(["remove"], {
    home,
    env: {
      GITAM_FORCE_INTERACTIVE: "1",
    },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /No account can be removed/);
});

test("rejects invalid account input", async () => {
  const home = await makeTempDir();

  let result = await runCli(["add", "bad flag", "bob", "bob@example.com"], {
    home,
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /letters, numbers, underscores, or hyphens/);

  result = await runCli(["add", "github", "  ", "bob@example.com"], {
    home,
  });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /username cannot be empty/);

  result = await runCli(["add", "github", "bob", "not-email"], {
    home,
  });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /valid email address/);
});

test("interactive add saves accounts and reprompts after duplicate refusal", async () => {
  const home = await makeTempDir();
  await fs.writeFile(
    path.join(home, ".gam.json"),
    JSON.stringify({
      accounts: {
        github: {
          username: "old",
          email: "old@example.com",
        },
      },
    }),
    "utf8"
  );

  const result = await runCli(["add"], {
    home,
    input: ["bob\n", "bob@example.com\n", "github\n", "n\n", "gitlab\n"],
    env: {
      GITAM_FORCE_INTERACTIVE: "1",
    },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Username:/);
  assert.match(result.stdout, /Email:/);
  assert.match(result.stdout, /Flag:/);
  assert.match(result.stdout, /Overwrite existing account/);
  assert.deepEqual(await readDb(home), {
    accounts: {
      github: {
        username: "old",
        email: "old@example.com",
      },
      gitlab: {
        username: "bob",
        email: "bob@example.com",
      },
    },
  });
});

test("preserves corrupt account database", async () => {
  const home = await makeTempDir();
  const dbPath = path.join(home, ".gam.json");
  await fs.writeFile(dbPath, "{", "utf8");

  const result = await runCli(["list"], { home });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /not valid JSON/);
  assert.equal(await fs.readFile(dbPath, "utf8"), "{");
});

test("uses git argument arrays and waits for success", async () => {
  const home = await makeTempDir();
  const mockGit = await makeMockGit(home);
  const username = 'bob"; touch /tmp/gitam-injected #';
  await fs.writeFile(
    path.join(home, ".gam.json"),
    JSON.stringify({
      accounts: {
        github: {
          username,
          email: "bob@example.com",
        },
      },
    }),
    "utf8"
  );

  const result = await runCli(["use", "github"], {
    home,
    pathPrefix: mockGit.binDir,
    env: {
      GITAM_MOCK_GIT_LOG: mockGit.logPath,
    },
  });
  const gitCalls = await readGitLog(mockGit.logPath);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Toggle success/);
  assert.ok(hasGitCall(gitCalls, ["config", "user.name", username]));
  assert.ok(hasGitCall(gitCalls, ["config", "user.email", "bob@example.com"]));
});

test("reports git failures without printing success", async () => {
  const home = await makeTempDir();
  const mockGit = await makeMockGit(home);
  await fs.writeFile(
    path.join(home, ".gam.json"),
    JSON.stringify({
      accounts: {
        github: {
          username: "bob",
          email: "bob@example.com",
        },
      },
    }),
    "utf8"
  );

  const result = await runCli(["use", "github"], {
    home,
    pathPrefix: mockGit.binDir,
    env: {
      GITAM_MOCK_GIT_LOG: mockGit.logPath,
      GITAM_MOCK_GIT_FAIL: "user.email",
    },
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Toggle failed: mock failure/);
  assert.doesNotMatch(result.stdout, /Toggle success/);
});

test("global use requires confirmation before writing git config", async () => {
  const home = await makeTempDir();
  const mockGit = await makeMockGit(home);
  await fs.writeFile(
    path.join(home, ".gam.json"),
    JSON.stringify({
      accounts: {
        github: {
          username: "bob",
          email: "bob@example.com",
        },
      },
    }),
    "utf8"
  );

  let result = await runCli(["use", "-g", "github"], {
    home,
    pathPrefix: mockGit.binDir,
    input: "n\n",
    env: {
      GITAM_FORCE_INTERACTIVE: "1",
      GITAM_MOCK_GIT_LOG: mockGit.logPath,
      GITAM_MOCK_GLOBAL_NAME: "old",
      GITAM_MOCK_GLOBAL_EMAIL: "old@example.com",
    },
  });
  let gitCalls = await readGitLog(mockGit.logPath);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Change global git account/);
  assert.match(result.stdout, /Toggle canceled/);
  assert.ok(!hasGitCall(gitCalls, ["config", "--global", "user.name", "bob"]));

  await fs.writeFile(mockGit.logPath, "", "utf8");
  result = await runCli(["use", "-g", "github"], {
    home,
    pathPrefix: mockGit.binDir,
    input: "y\n",
    env: {
      GITAM_FORCE_INTERACTIVE: "1",
      GITAM_MOCK_GIT_LOG: mockGit.logPath,
      GITAM_MOCK_GLOBAL_NAME: "old",
      GITAM_MOCK_GLOBAL_EMAIL: "old@example.com",
    },
  });
  gitCalls = await readGitLog(mockGit.logPath);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Toggle success/);
  assert.ok(hasGitCall(gitCalls, ["config", "--global", "user.name", "bob"]));
  assert.ok(
    hasGitCall(gitCalls, ["config", "--global", "user.email", "bob@example.com"])
  );
});

test("list marks local, global, and shared account status", async () => {
  const home = await makeTempDir();
  const mockGit = await makeMockGit(home);
  await fs.writeFile(
    path.join(home, ".gam.json"),
    JSON.stringify({
      accounts: {
        localOnly: {
          username: "local",
          email: "local@example.com",
        },
        globalOnly: {
          username: "global",
          email: "global@example.com",
        },
        shared: {
          username: "same",
          email: "same@example.com",
        },
      },
    }),
    "utf8"
  );

  let result = await runCli(["list"], {
    home,
    pathPrefix: mockGit.binDir,
    env: {
      GITAM_MOCK_GIT_LOG: mockGit.logPath,
      GITAM_MOCK_LOCAL_NAME: "local",
      GITAM_MOCK_LOCAL_EMAIL: "local@example.com",
      GITAM_MOCK_GLOBAL_NAME: "global",
      GITAM_MOCK_GLOBAL_EMAIL: "global@example.com",
    },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /localOnly/);
  assert.match(result.stdout, /globalOnly/);
  assert.match(result.stdout, /local/);
  assert.match(result.stdout, /global/);

  result = await runCli(["list"], {
    home,
    pathPrefix: mockGit.binDir,
    env: {
      GITAM_MOCK_LOCAL_NAME: "same",
      GITAM_MOCK_LOCAL_EMAIL: "same@example.com",
      GITAM_MOCK_GLOBAL_NAME: "same",
      GITAM_MOCK_GLOBAL_EMAIL: "same@example.com",
    },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /local,global/);
});

test("include configures git includeIf for an account", async () => {
  const home = await makeTempDir();
  const mockGit = await makeMockGit(home);
  await fs.writeFile(
    path.join(home, ".gam.json"),
    JSON.stringify({
      accounts: {
        github: {
          username: "bob",
          email: "bob@example.com",
        },
      },
    }),
    "utf8"
  );

  const includePath = path.join(home, ".gitam", "includes", "github.gitconfig");
  const result = await runCli(["include", "github", "--gitdir", "~/work"], {
    home,
    pathPrefix: mockGit.binDir,
    env: {
      GITAM_MOCK_GIT_LOG: mockGit.logPath,
    },
  });
  const gitCalls = await readGitLog(mockGit.logPath);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /includeIf success/);
  assert.match(result.stdout, /includeIf\.gitdir:~\/work\/\.path/);
  assert.ok(
    hasGitCall(gitCalls, [
      "config",
      "--file",
      includePath,
      "user.name",
      "bob",
    ])
  );
  assert.ok(
    hasGitCall(gitCalls, [
      "config",
      "--file",
      includePath,
      "user.email",
      "bob@example.com",
    ])
  );
  assert.ok(
    hasGitCall(gitCalls, [
      "config",
      "--global",
      "includeIf.gitdir:~/work/.path",
      includePath,
    ])
  );
});

test("include supports explicit condition and validates option count", async () => {
  const home = await makeTempDir();
  const mockGit = await makeMockGit(home);
  await fs.writeFile(
    path.join(home, ".gam.json"),
    JSON.stringify({
      accounts: {
        github: {
          username: "bob",
          email: "bob@example.com",
        },
      },
    }),
    "utf8"
  );

  const includePath = path.join(home, ".gitam", "includes", "github.gitconfig");
  let result = await runCli(
    ["include", "github", "--condition", "onbranch:release/*"],
    {
      home,
      pathPrefix: mockGit.binDir,
      env: {
        GITAM_MOCK_GIT_LOG: mockGit.logPath,
      },
    }
  );
  let gitCalls = await readGitLog(mockGit.logPath);

  assert.equal(result.code, 0);
  assert.ok(
    hasGitCall(gitCalls, [
      "config",
      "--global",
      "includeIf.onbranch:release/*.path",
      includePath,
    ])
  );

  result = await runCli(
    ["include", "github", "--gitdir", "~/work", "--onbranch", "main"],
    {
      home,
      pathPrefix: mockGit.binDir,
    }
  );

  assert.equal(result.code, 1);
  assert.match(result.stderr, /exactly one/);
});

test("interactive include handles invalid input and confirmation", async () => {
  const home = await makeTempDir();
  const mockGit = await makeMockGit(home);
  await fs.writeFile(
    path.join(home, ".gam.json"),
    JSON.stringify({
      accounts: {
        github: {
          username: "bob",
          email: "bob@example.com",
        },
        gitlab: {
          username: "tom",
          email: "tom@example.com",
        },
      },
    }),
    "utf8"
  );

  const includePath = path.join(home, ".gitam", "includes", "gitlab.gitconfig");
  const result = await runCli(["include"], {
    home,
    pathPrefix: mockGit.binDir,
    input: ["\n", "9\n", "1\n", "bad\n", "2\n", "main\n", "y\n"],
    inputDelayMs: 400,
    env: {
      GITAM_FORCE_INTERACTIVE: "1",
      GITAM_MOCK_GIT_LOG: mockGit.logPath,
    },
  });
  const gitCalls = await readGitLog(mockGit.logPath);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Please enter an index or flag/);
  assert.match(result.stdout, /No this index or flag/);
  assert.match(result.stdout, /No this condition type/);
  assert.match(result.stdout, /includeIf success/);
  assert.ok(
    hasGitCall(gitCalls, [
      "config",
      "--global",
      "includeIf.onbranch:main.path",
      includePath,
    ])
  );
});

test("non-interactive include requires options", async () => {
  const home = await makeTempDir();
  const result = await runCli(["include"], { home });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Interactive include requires an interactive terminal/);
});

test("non-interactive global use fails before writing git config", async () => {
  const home = await makeTempDir();
  const mockGit = await makeMockGit(home);
  await fs.writeFile(
    path.join(home, ".gam.json"),
    JSON.stringify({
      accounts: {
        github: {
          username: "bob",
          email: "bob@example.com",
        },
      },
    }),
    "utf8"
  );

  const result = await runCli(["use", "-g", "github"], {
    home,
    pathPrefix: mockGit.binDir,
    env: {
      GITAM_MOCK_GIT_LOG: mockGit.logPath,
    },
  });
  const gitCalls = await readGitLog(mockGit.logPath);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /requires confirmation/);
  assert.ok(!hasGitCall(gitCalls, ["config", "--global", "user.name", "bob"]));
});

test("edits account fields and flags with validation", async () => {
  const home = await makeTempDir();
  await fs.writeFile(
    path.join(home, ".gam.json"),
    JSON.stringify({
      accounts: {
        github: {
          username: "bob",
          email: "bob@example.com",
        },
      },
    }),
    "utf8"
  );

  let result = await runCli(
    ["edit", "github", "--username", "tom", "--email", "tom@example.com"],
    { home }
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Edit success/);
  assert.deepEqual(await readDb(home), {
    accounts: {
      github: {
        username: "tom",
        email: "tom@example.com",
      },
    },
  });

  result = await runCli(["edit", "github", "--flag", "gitlab"], { home });
  assert.equal(result.code, 0);
  assert.deepEqual(await readDb(home), {
    accounts: {
      gitlab: {
        username: "tom",
        email: "tom@example.com",
      },
    },
  });

  result = await runCli(["edit", "gitlab"], { home });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /provide --username, --email, or --flag/);

  result = await runCli(["edit", "gitlab", "--email", "nope"], { home });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /valid email address/);
});

test("edit flag collision asks before overwriting", async () => {
  const home = await makeTempDir();
  await fs.writeFile(
    path.join(home, ".gam.json"),
    JSON.stringify({
      accounts: {
        github: {
          username: "bob",
          email: "bob@example.com",
        },
        gitlab: {
          username: "tom",
          email: "tom@example.com",
        },
      },
    }),
    "utf8"
  );

  let result = await runCli(["edit", "github", "--flag", "gitlab"], {
    home,
  });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /already exists/);

  result = await runCli(["edit", "github", "--flag", "gitlab"], {
    home,
    input: "n\n",
    env: {
      GITAM_FORCE_INTERACTIVE: "1",
    },
  });
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Edit canceled/);
  assert.deepEqual(Object.keys((await readDb(home)).accounts).sort(), [
    "github",
    "gitlab",
  ]);

  result = await runCli(["edit", "github", "--flag", "gitlab"], {
    home,
    input: "y\n",
    env: {
      GITAM_FORCE_INTERACTIVE: "1",
    },
  });
  assert.equal(result.code, 0);
  assert.deepEqual(await readDb(home), {
    accounts: {
      gitlab: {
        username: "bob",
        email: "bob@example.com",
      },
    },
  });
});

test("completion command detects shell, writes script, and prints rc instructions", async () => {
  const home = await makeTempDir();
  await fs.writeFile(
    path.join(home, ".gam.json"),
    JSON.stringify({
      accounts: {
        github: {
          username: "bob",
          email: "bob@example.com",
        },
      },
    }),
    "utf8"
  );

  let result = await runCli(["completion"], {
    home,
    env: { GITAM_COMPLETION_SHELL: "zsh" },
  });
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Generated zsh completion file:/);
  assert.match(result.stdout, /source ~\/\.gam-completion\.zsh/);
  let script = await fs.readFile(path.join(home, ".gam-completion.zsh"), "utf8");
  assert.match(script, /compdef _gitam gam gitam/);
  assert.match(script, /include:Configure a global git includeIf rule/);
  assert.match(script, /edit:Edit an account/);
  assert.match(script, /--condition:includeIf condition/);
  assert.match(script, /--gitdir-i:Configure includeIf\.gitdir\/i/);
  assert.match(script, /--username:New account username/);
  assert.match(script, /--global:Set global config/);
  assert.match(script, /--all:Remove all accounts/);
  assert.match(script, /__flags/);

  result = await runCli(["completion"], {
    home,
    env: { GITAM_COMPLETION_SHELL: "/bin/bash" },
  });
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Generated bash completion file:/);
  assert.match(result.stdout, /source ~\/\.gam-completion\.bash/);
  script = await fs.readFile(path.join(home, ".gam-completion.bash"), "utf8");
  assert.match(script, /complete -F _gitam_completion gam/);
  assert.match(script, /commands="list ls add use u include edit remove rm completion"/);
  assert.match(script, /--condition --gitdir --gitdir-i --onbranch/);
  assert.match(script, /--username --email --flag/);
  assert.match(script, /-g --global/);
  assert.match(script, /-a --all/);
  assert.match(script, /__flags/);

  result = await runCli(["completion"], {
    home,
    env: { GITAM_COMPLETION_SHELL: "fish" },
  });
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Generated fish completion file:/);
  assert.match(result.stdout, /source ~\/\.gam-completion\.fish/);
  script = await fs.readFile(path.join(home, ".gam-completion.fish"), "utf8");
  assert.match(script, /complete -c gam/);
  assert.match(script, /__fish_seen_subcommand_from include" -l gitdir-i -r/);
  assert.match(script, /__fish_seen_subcommand_from edit" -l username -r/);
  assert.match(script, /__fish_seen_subcommand_from use" -l global/);
  assert.match(script, /__fish_seen_subcommand_from remove" -l all/);
  assert.match(script, /__gitam_accounts/);

  result = await runCli(["completion"], {
    home,
    env: { GITAM_COMPLETION_SHELL: "pwsh" },
  });
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Generated pwsh completion file:/);
  assert.match(result.stdout, /\. "\$HOME\/\.gam-completion\.ps1"/);
  script = await fs.readFile(path.join(home, ".gam-completion.ps1"), "utf8");
  assert.match(script, /Register-ArgumentCompleter/);
  assert.match(script, /include = '--condition --gitdir --gitdir-i --onbranch'/);
  assert.match(script, /edit = '--username --email --flag'/);
  assert.match(script, /use = '-g --global'/);
  assert.match(script, /remove = '-a --all'/);
  assert.match(script, /gitam/);

  result = await runCli(["__flags"], { home });
  assert.equal(result.code, 0);
  assert.match(result.stdout, /github/);
});

test("interactive selection handles blank, invalid, and index input", async () => {
  const home = await makeTempDir();
  const mockGit = await makeMockGit(home);
  await fs.writeFile(
    path.join(home, ".gam.json"),
    JSON.stringify({
      accounts: {
        github: {
          username: "bob",
          email: "bob@example.com",
        },
        gitlab: {
          username: "tom",
          email: "tom@example.com",
        },
      },
    }),
    "utf8"
  );

  const result = await runCli(["use"], {
    home,
    pathPrefix: mockGit.binDir,
    input: ["\n", "9\n", "1\n"],
    inputDelayMs: 400,
    env: {
      GITAM_MOCK_GIT_LOG: mockGit.logPath,
    },
  });
  const gitCalls = await readGitLog(mockGit.logPath);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Please enter an index or flag/);
  assert.match(result.stdout, /No this index or flag/);
  assert.match(result.stdout, /Toggle success/);
  assert.ok(hasGitCall(gitCalls, ["config", "user.name", "tom"]));
});
