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
if (logPath) {
  fs.appendFileSync(logPath, JSON.stringify(args) + "\\n");
}
if (failToken && args.join(" ").includes(failToken)) {
  console.error("mock failure");
  process.exit(2);
}
if (args[0] === "config" && (args.length === 2 || (args[1] === "--global" && args.length === 3))) {
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
      options.input.forEach((chunk, index) => {
        setTimeout(() => {
          child.stdin.write(chunk);
          if (index === options.input.length - 1) {
            child.stdin.end();
          }
        }, index * 50);
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

test("adds, updates, lists, and removes accounts", async () => {
  const home = await makeTempDir();

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
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Update success/);

  result = await runCli(["list"], { home });
  assert.equal(result.code, 0);
  assert.match(result.stdout, /index/);
  assert.match(result.stdout, /github/);
  assert.match(result.stdout, /tom@example\.com/);

  result = await runCli(["remove"], { home });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /provide an account flag/);

  result = await runCli(["remove", "github"], { home });
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Remove success/);
  assert.deepEqual(await readDb(home), { accounts: {} });
});

test("rejects invalid account input", async () => {
  const home = await makeTempDir();

  const result = await runCli(["add", "bad flag", "bob", "bob@example.com"], {
    home,
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /letters, numbers, underscores, or hyphens/);
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
