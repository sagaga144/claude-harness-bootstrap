#!/usr/bin/env node
// Stop: runs `cargo check` / `tsc --noEmit` for the packages with uncommitted changes and
// blocks (exit 2) with the compiler output if one fails. A missing toolchain, missing
// manifest, timeout or any internal error is NOT a failure: those fail open (exit 0).
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const IGNORE = { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", timeout: 50000, maxBuffer: 20 * 1024 * 1024 };

function hasTool(cmd) {
  try {
    if (process.platform === "win32") execFileSync("where", [cmd], IGNORE);
    else execFileSync("sh", ["-c", 'command -v "$1"', "sh", cmd], IGNORE);
    return true;
  } catch { return false; }
}

// Returns an error string if the check failed, null if it passed or could not run.
function run(cmd, args, cwd) {
  try {
    execFileSync(cmd, args, { ...IGNORE, cwd });
    return null;
  } catch (err) {
    if (typeof err.status === "number" && err.status !== 0) {
      return String(err.stdout || "") + String(err.stderr || "");
    }
    return null; // spawn error or timeout: fail open
  }
}

function findTsc(dir) {
  for (const base of [dir, root]) {
    const p = path.join(base, "node_modules", "typescript", "bin", "tsc");
    if (fs.existsSync(p)) return p;
  }
  return null;
}

try {
  if (!hasTool("git")) process.exit(0);
  const status = execFileSync("git", ["status", "--porcelain"], { ...IGNORE, cwd: root });
  const changed = status.split("\n").map((l) => l.slice(3).replace(/\\/g, "/"));
  const touched = (d) => changed.some((f) => f.startsWith(d + "/"));
  const contractsTouched = touched("contracts");
  const failures = [];
  const notes = [];

  const backend = path.join(root, "backend");
  if ((touched("backend") || contractsTouched) && fs.existsSync(path.join(backend, "Cargo.toml"))) {
    if (!hasTool("cargo")) notes.push("cargo not installed: skipped backend check");
    else {
      const out = run("cargo", ["check", "--quiet", "--message-format", "short"], backend);
      if (out) failures.push("cargo check failed in backend/:\n" + out.trim().split("\n").slice(-30).join("\n"));
    }
  }

  for (const pkg of ["contracts", "frontend"]) {
    const dir = path.join(root, pkg);
    if (!(touched(pkg) || (pkg === "frontend" && contractsTouched))) continue;
    if (!fs.existsSync(path.join(dir, "tsconfig.json"))) continue;
    const tsc = findTsc(dir);
    if (!tsc) { notes.push(`typescript not installed (npm install): skipped ${pkg}/ type-check`); continue; }
    const out = run(process.execPath, [tsc, "--noEmit", "-p", dir], root);
    if (out) failures.push(`tsc --noEmit failed in ${pkg}/:\n` + out.trim().split("\n").slice(-30).join("\n"));
  }

  for (const n of notes) console.error("build-gate: " + n);
  if (failures.length) {
    console.error("Build gate: fix these before finishing.\n\n" + failures.join("\n\n"));
    process.exit(2);
  }
  process.exit(0);
} catch {
  process.exit(0);
}
