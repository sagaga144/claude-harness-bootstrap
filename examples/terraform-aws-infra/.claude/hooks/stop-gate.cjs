#!/usr/bin/env node
// Stop: when .tf or cli/*.py files have uncommitted changes, runs the fast checks
// (terraform fmt -check, ruff check, pytest) and blocks the turn with the errors on failure.
// A tool that isn't installed is skipped with a warning, never a block.
// Override: start the session with SKIP_STOP_GATE=1. Exit 0 = allow, 2 = block. Fails open.
"use strict";
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function which(cmd) {
  const exts = process.platform === "win32" ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";") : [""];
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    for (const ext of exts) {
      const p = path.join(dir, cmd + ext.toLowerCase());
      try { if (fs.statSync(p).isFile()) return p; } catch {}
    }
  }
  return null;
}
function firstExisting(root, rels) {
  for (const r of rels) { const p = path.join(root, r); if (fs.existsSync(p)) return p; }
  return null;
}

try {
  if (process.env.SKIP_STOP_GATE === "1") process.exit(0);
  const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const opts = { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 45000 };

  const git = which("git");
  if (!git) process.exit(0);
  const st = spawnSync(git, ["status", "--porcelain", "--untracked-files=all"], opts);
  if (st.status !== 0) process.exit(0);
  const changed = st.stdout.split(/\r?\n/).filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, ""));
  const tfChanged = changed.some((f) => /\.(?:tf|tfvars|tftest\.hcl)$/.test(f));
  const pyChanged = changed.some((f) => /^cli\/.*\.py$/.test(f));
  if (!tfChanged && !pyChanged) process.exit(0);

  const failures = [];
  const warnings = [];

  if (tfChanged) {
    const tf = which("terraform");
    if (!tf) warnings.push("terraform not installed: skipped `terraform fmt -check`");
    else {
      const r = spawnSync(tf, ["fmt", "-check", "-recursive"], opts);
      if (r.status !== 0) failures.push(`terraform fmt -check failed (run \`terraform fmt -recursive\`):\n${(r.stdout + r.stderr).trim().slice(0, 1500)}`);
    }
  }

  if (pyChanged && fs.existsSync(path.join(root, "cli", "pyproject.toml"))) {
    const cliDir = path.join(root, "cli");
    const ruff = firstExisting(root, ["cli/.venv/Scripts/ruff.exe", "cli/.venv/bin/ruff"]) || which("ruff");
    if (!ruff) warnings.push("ruff not installed (run `cd cli && uv sync`): skipped lint");
    else {
      const r = spawnSync(ruff, ["check", "."], { ...opts, cwd: cliDir });
      if (r.status !== 0) failures.push(`ruff check failed:\n${(r.stdout + r.stderr).trim().slice(0, 1500)}`);
    }
    const py = firstExisting(root, ["cli/.venv/Scripts/python.exe", "cli/.venv/bin/python"]);
    if (!py) warnings.push("cli/.venv missing (run `cd cli && uv sync`): skipped pytest");
    else if (fs.existsSync(path.join(cliDir, "tests"))) {
      const r = spawnSync(py, ["-m", "pytest", "-q", "-x", "--no-header"], { ...opts, cwd: cliDir });
      // exit 5 = no tests collected: not a failure
      if (r.status !== 0 && r.status !== 5 && r.status !== null) failures.push(`pytest failed:\n${(r.stdout + r.stderr).trim().slice(-1500)}`);
    }
  }

  if (failures.length) {
    console.error("Stop gate: fix these before finishing:\n\n" + failures.join("\n\n") + (warnings.length ? "\n\n(" + warnings.join("; ") + ")" : ""));
    process.exit(2);
  }
  if (warnings.length) console.log("Stop gate warnings: " + warnings.join("; "));
  process.exit(0);
} catch {
  process.exit(0);
}
