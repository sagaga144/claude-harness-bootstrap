#!/usr/bin/env node
// Stop: runs cheap local checks once per turn and blocks with actionable errors on failure.
// A missing tool is a warning, never a block (probed first, not inferred from failure).
// Checks: `terraform fmt -check -recursive` (if there are .tf files) and `ruff check` (if
// there is Python). Override: ALLOW_BUILD_GATE_SKIP=1. Exit 0 = allow, 2 = block.
// Fails open on its own errors.
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
let record = () => {};
try { record = require("./lib/friction.cjs"); } catch {}

function have(cmd) {
  try {
    if (process.platform === "win32") execFileSync("where", [cmd], { stdio: "ignore" });
    else execFileSync("sh", ["-c", 'command -v "$1"', "sh", cmd], { stdio: "ignore" });
    return true;
  } catch { return false; }
}
function anyFile(dir, ext, depth = 4) {
  if (depth < 0) return false;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return false; }
  for (const e of entries) {
    if (e.name === ".git" || e.name === ".terraform" || e.name === "node_modules" || e.name === ".venv") continue;
    const p = path.join(dir, e.name);
    if (e.isFile() && e.name.endsWith(ext)) return true;
    if (e.isDirectory() && anyFile(p, ext, depth - 1)) return true;
  }
  return false;
}
function run(cmd, args, cwd) {
  try {
    execFileSync(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"], timeout: 45000 });
    return null;
  } catch (err) {
    return String((err.stdout || "") + (err.stderr || "") || err.message).slice(0, 1500);
  }
}
try {
  if (process.env.ALLOW_BUILD_GATE_SKIP === "1") process.exit(0);
  const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  if (input.stop_hook_active) process.exit(0);
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const problems = [];
  if (anyFile(root, ".tf")) {
    if (have("terraform")) {
      const out = run("terraform", ["fmt", "-check", "-recursive", "-diff"], root);
      if (out) problems.push("terraform fmt -check failed (run `terraform fmt -recursive`):\n" + out);
    } else console.error("warning: terraform not installed; skipping fmt check.");
  }
  if (anyFile(root, ".py")) {
    if (have("ruff")) {
      const out = run("ruff", ["check", "."], root);
      if (out) problems.push("ruff check failed:\n" + out);
    } else console.error("warning: ruff not installed; skipping lint.");
  }
  if (problems.length) {
    record("build-gate", "Stop", "block");
    console.error(problems.join("\n\n"));
    process.exit(2);
  }
  process.exit(0);
} catch {
  record("build-gate", "Stop", "fail-open");
  process.exit(0);
}
