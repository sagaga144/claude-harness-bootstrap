#!/usr/bin/env node
// Stop: runs `go vet ./...` once per turn and blocks with the errors if it fails.
// Fails open when there is no go.mod yet, when Go isn't installed, or on its own errors.
// Exit 0 = allow, 2 = block.
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
let record = () => {};
try { record = require("./lib/friction.cjs"); } catch {}
try {
  let input = {};
  try { input = JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch {}
  if (input.stop_hook_active) process.exit(0);
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  if (!fs.existsSync(path.join(root, "go.mod"))) process.exit(0);
  try {
    if (process.platform === "win32") execFileSync("where", ["go"], { stdio: "ignore" });
    else execFileSync("sh", ["-c", 'command -v "$1"', "sh", "go"], { stdio: "ignore" });
  } catch {
    console.error("build-gate: Go is not installed, skipping the vet check.");
    process.exit(0);
  }
  try {
    execFileSync("go", ["vet", "./..."], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 100000 });
  } catch (err) {
    if (err && err.killed) process.exit(0);
    record("build-gate", "Stop", "block");
    const out = String((err && (err.stderr || err.stdout)) || (err && err.message) || "").trim().slice(0, 3000);
    console.error(`go vet failed. Fix these before finishing:\n${out}`);
    process.exit(2);
  }
  process.exit(0);
} catch {
  record("build-gate", "Stop", "fail-open");
  process.exit(0);
}
