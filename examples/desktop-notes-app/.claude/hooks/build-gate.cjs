#!/usr/bin/env node
// Stop: runs the type/compile checks once per turn. Blocks (exit 2) only when a check
// actually fails; a missing project or missing toolchain warns and lets the turn end.
// Fails open on its own errors.
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
let record = () => {};
try { record = require("./lib/friction.cjs"); } catch {}

function onPath(cmd) {
  try {
    if (process.platform === "win32") execFileSync("where", [cmd], { stdio: "ignore" });
    else execFileSync("sh", ["-c", 'command -v "$1"', "sh", cmd], { stdio: "ignore" });
    return true;
  } catch { return false; }
}

try {
  const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  if (input.stop_hook_active) process.exit(0); // already continued once this turn
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const failures = [];
  const notes = [];

  // Frontend half: svelte-check, only if the project defines a `check` script.
  const pkgPath = path.join(root, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (pkg.scripts && pkg.scripts.check && fs.existsSync(path.join(root, "node_modules"))) {
      if (onPath("npm")) {
        // npm is a .cmd shim on Windows: shell is required there, arguments are fixed.
        const r = spawnSync("npm", ["run", "check", "--silent"], {
          cwd: root, encoding: "utf8", shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"],
        });
        if (r.status !== 0) failures.push("npm run check failed:\n" + String(r.stdout || "").concat(String(r.stderr || "")).slice(-3000));
      } else notes.push("npm not found; skipped npm run check");
    }
  }

  // Rust half: cargo check, only if src-tauri exists and cargo is installed.
  const manifest = path.join(root, "src-tauri", "Cargo.toml");
  if (fs.existsSync(manifest)) {
    if (onPath("cargo")) {
      const r = spawnSync("cargo", ["check", "--manifest-path", manifest, "--message-format", "short", "--quiet"], {
        cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      });
      if (r.status !== 0) failures.push("cargo check failed:\n" + String(r.stderr || "").slice(-3000));
    } else notes.push("cargo not found (install the Rust toolchain); Rust half of the gate skipped");
  }

  if (failures.length) {
    record("build-gate", "Stop", "block");
    console.error("Build gate: fix these before finishing.\n\n" + failures.join("\n\n"));
    process.exit(2);
  }
  if (notes.length) console.log("Build gate: " + notes.join("; "));
  process.exit(0);
} catch {
  record("build-gate", "Stop", "fail-open");
  process.exit(0);
}
