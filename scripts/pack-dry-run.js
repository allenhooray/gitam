#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const os = require("node:os");
const path = require("node:path");

const cacheDir = path.join(os.tmpdir(), "npm-cache-gitam");
const result = spawnSync("npm", ["pack", "--dry-run", "--cache", cacheDir], {
  cwd: path.resolve(__dirname, ".."),
  stdio: "inherit",
});

process.exit(result.status || 0);
