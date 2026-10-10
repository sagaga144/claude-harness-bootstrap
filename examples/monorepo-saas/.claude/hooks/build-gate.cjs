#!/usr/bin/env node
// Stop. Once per finished turn, checks only what this working tree changed:
//   1. contracts drift: crates/contracts newer than packages/contracts/src/generated
//   2. Rust: cargo check --workspace (if crates/ or Cargo files changed)
//   3. TypeScript: tsc -b packages/web (if packages/ changed). Vite never type-checks.
// Exit 2 with the errors = block (Claude keeps working). A missing toolchain or missing
// project scaffolding fails open with a note. Override: ALLOW_STOP=1.
"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function run(cmd, cwd, timeout) {
  return execSync(cmd, { cwd, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", timeout, maxBuffer: 32 * 1024 * 1024 });
}
function has(bin) {
  try {
    run(process.platform === "win32" ? `where ${bin}` : `command -v ${bin}`, undefined, 5000);
    return true;
  } catch { return false; }
}
function newest(dir) {
  let max = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    max = Math.max(max, e.isDirectory() ? newest(p) : fs.statSync(p).mtimeMs);
  }
  return max;
}
function tail(err) {
  const out = `${(err && err.stdout) || ""}\n${(err && err.stderr) || ""}`.trim() || String(err && err.message);
  return out.split(/\r?\n/).slice(-40).join("\n");
}
function block(msg) {
  console.error(msg);
  process.exit(2);
}

try {
  if (process.env.ALLOW_STOP === "1") process.exit(0);
  const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

  let status = "";
  try { status = run("git status --porcelain -uall", root, 10000); } catch { process.exit(0); }
  const changed = status.split(/\r?\n/).filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, "").split(" -> ").pop());
  if (!changed.length) process.exit(0);
  const notes = [];

  // 1. Contracts drift
  const contractsSrc = path.join(root, "crates", "contracts", "src");
  const generated = path.join(root, "packages", "contracts", "src", "generated");
  if (changed.some((f) => f.startsWith("crates/contracts/")) && fs.existsSync(contractsSrc)) {
    if (newest(contractsSrc) > newest(generated)) {
      block("Contracts drift: crates/contracts changed after packages/contracts/src/generated was last generated. Run `npm run contracts:gen`, then fix whatever the frontend type-check flags.");
    }
  }

  // 2. Rust
  if (changed.some((f) => f.startsWith("crates/") || /^Cargo\.(?:toml|lock)$/.test(f)) && fs.existsSync(path.join(root, "Cargo.toml"))) {
    if (!has("cargo")) {
      notes.push("build-gate: cargo is not installed, so the Rust check was skipped (install via rustup).");
    } else {
      try { run("cargo check --workspace --all-targets --message-format short", root, 45000); }
      catch (err) { block(`cargo check failed:\n${tail(err)}`); }
    }
  }

  // 3. TypeScript
  if (changed.some((f) => f.startsWith("packages/")) && fs.existsSync(path.join(root, "packages", "web", "tsconfig.json"))) {
    const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");
    if (!fs.existsSync(tsc)) {
      notes.push("build-gate: node_modules/typescript is missing, so the TS type-check was skipped (run npm install).");
    } else {
      try { run(`node "${tsc}" -b packages/web`, root, 45000); }
      catch (err) { block(`TypeScript type-check failed (tsc -b packages/web):\n${tail(err)}`); }
    }
  }

  if (notes.length) console.error(notes.join("\n"));
  process.exit(0);
} catch {
  process.exit(0);
}
