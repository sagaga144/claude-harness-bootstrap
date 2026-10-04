#!/usr/bin/env node
// Stop hook: this project's ecosystem (Python research code, no compiled
// build step, no static typing pass) has no "build" in the web/Go/Rust
// sense. The closest real analog: a syntax gate over .py files (py_compile)
// plus a structural-validity check over .ipynb files (they're JSON; a bad
// edit/merge can corrupt them silently, and no other hook in this harness
// would ever notice since nothing else here parses notebook JSON).
//
// Toolchain probe BEFORE the real command, never inferred from the real
// command's failure (execSync always runs through cmd.exe on Windows, so a
// missing binary there is an ordinary non-zero exit, not a spawn-level
// ENOENT -- inferring from that is unreliable and would silently fail
// *closed* on a machine that simply doesn't have python on PATH yet).
//
// Exit codes: 0 = allow (clean, or toolchain missing -> warn and allow),
// 2 = block (a real syntax error or a corrupted notebook; reason on stderr).

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const EXCLUDE_DIRS = new Set([".git", "data", "checkpoints", "wandb", "runs", "venv", ".venv", "__pycache__", "node_modules", ".ipynb_checkpoints"]);

function hasCommand(cmd) {
  try {
    const probe = process.platform === "win32" ? `where ${cmd}` : `command -v ${cmd}`;
    execSync(probe, { stdio: ["ignore", "pipe", "pipe"] });
    return true;
  } catch {
    return false; // probe itself says "not found" -- not an inference from a later failure
  }
}

function walk(dir, exts, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith(".") && e.name !== ".") {
      if (e.isDirectory() && !EXCLUDE_DIRS.has(e.name)) {
        // allow dotdirs other than the excluded/hidden ones through only if needed;
        // this project has none, so skip all dot-dirs to be safe.
      }
      continue;
    }
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!EXCLUDE_DIRS.has(e.name)) walk(full, exts, out);
    } else if (exts.some((ext) => e.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

function checkNotebooks(files) {
  const errors = [];
  for (const f of files) {
    try {
      const parsed = JSON.parse(fs.readFileSync(f, "utf8"));
      if (!Array.isArray(parsed.cells)) {
        errors.push(`${f}: valid JSON but missing a "cells" array -- not a well-formed notebook`);
      }
    } catch (err) {
      errors.push(`${f}: invalid JSON (${err.message}) -- notebook file is corrupted`);
    }
  }
  return errors;
}

function checkPythonSyntax(files) {
  if (files.length === 0) return [];
  if (!hasCommand("python")) {
    console.log("[stop-syntax-gate] python not found on PATH -- skipping .py syntax check (toolchain absent, not a failure).");
    return [];
  }
  try {
    execSync(`python -m py_compile ${files.map((f) => JSON.stringify(f)).join(" ")}`, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    return [];
  } catch (err) {
    const out = (err.stdout ? err.stdout.toString() : "") + (err.stderr ? err.stderr.toString() : "");
    return [`python syntax check failed:\n${out.trim() || err.message}`];
  }
}

function main() {
  // Stop hooks don't carry a single tool_input to inspect -- scan the repo.
  const pyFiles = walk(REPO_ROOT, [".py"], []);
  const nbFiles = walk(REPO_ROOT, [".ipynb"], []);

  const errors = [...checkPythonSyntax(pyFiles), ...checkNotebooks(nbFiles)];

  if (errors.length > 0) {
    process.stderr.write("[stop-syntax-gate] BLOCKED:\n" + errors.map((e) => `- ${e}`).join("\n") + "\n");
    return 2;
  }

  console.log(`[stop-syntax-gate] clean: ${pyFiles.length} .py file(s), ${nbFiles.length} notebook(s) checked.`);
  return 0;
}

try {
  process.exit(main());
} catch (err) {
  try { process.stderr.write(`[stop-syntax-gate] internal error, failing open: ${err.message}\n`); } catch {}
  process.exit(0);
}
