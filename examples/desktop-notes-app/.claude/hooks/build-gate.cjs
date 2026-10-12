#!/usr/bin/env node
// Stop. Type-checks what changed before Claude ends a turn: `npm run check` (svelte-check,
// because Vite never type-checks) when frontend files changed, `cargo check` when Rust
// files changed. Probes each toolchain first; a missing toolchain or unscaffolded project
// is a warning, never a block. Skips if nothing changed since the last passing run.
// Gives up after 3 consecutive blocks so a broken build can't loop the session.
// Override: ALLOW_BUILD_FAIL=1. Exit 0 = allow, 2 = block. Fails open on its own errors.
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const WIN = process.platform === "win32";
// Windows can start npm-style tools (.cmd shims) only through a shell; they're only ever
// given fixed arguments. Everything else runs without a shell, arguments as a list.
const SHIMS = new Set(["npm", "npx", "pnpm", "yarn"]);
const run = (cmd, args, cwd, timeout) =>
  spawnSync(cmd, args, { cwd, encoding: "utf8", shell: WIN && SHIMS.has(cmd), timeout, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 32 * 1024 * 1024 });
const has = (bin) =>
  (WIN ? spawnSync("where", [bin], { stdio: ["ignore", "pipe", "pipe"] }) : spawnSync("sh", ["-c", 'command -v "$1"', "sh", bin], { stdio: ["ignore", "pipe", "pipe"] })).status === 0;
const tail = (s, n = 40) => String(s || "").trim().split(/\r?\n/).slice(-n).join("\n");

try {
  if (process.env.ALLOW_BUILD_FAIL === "1") process.exit(0);
  const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const stateDir = path.join(root, ".claude", "session-data");
  const stateFile = path.join(stateDir, "build-gate.json");
  let state = {};
  try { state = JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch {}
  const save = () => { try { fs.mkdirSync(stateDir, { recursive: true }); fs.writeFileSync(stateFile, JSON.stringify(state)); } catch {} };

  const st = run("git", ["status", "--porcelain", "-uall"], root, 15000);
  if (st.status !== 0) process.exit(0);
  const changed = st.stdout.split(/\r?\n/).filter(Boolean).map((l) => l.slice(3).replace(/^.* -> /, "").replace(/"/g, ""));
  const front = changed.filter((f) => /^(?:src\/|svelte\.config|vite\.config|tsconfig|package\.json)/.test(f));
  const rust = changed.filter((f) => /^src-tauri\/(?:src\/|Cargo\.toml|build\.rs)/.test(f));
  if (!front.length && !rust.length) process.exit(0);

  const hash = crypto.createHash("sha1");
  for (const f of [...front, ...rust]) {
    hash.update(f);
    try { hash.update(String(fs.statSync(path.join(root, f)).mtimeMs)); } catch { hash.update("gone"); }
  }
  const fingerprint = hash.digest("hex");
  if (state.lastPass === fingerprint) process.exit(0);

  const failures = [];
  const warnings = [];

  if (front.length) {
    let pkg = null;
    try { pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")); } catch {}
    if (!pkg || !pkg.scripts || !pkg.scripts.check) warnings.push("frontend: no package.json `check` script yet, skipped svelte-check");
    else if (!fs.existsSync(path.join(root, "node_modules"))) warnings.push("frontend: node_modules missing (run `npm install`), skipped svelte-check");
    else if (!has("npm")) warnings.push("frontend: npm not on PATH, skipped svelte-check");
    else {
      const r = run("npm", ["run", "check"], root, 90000);
      if (r.error && r.error.code === "ETIMEDOUT") warnings.push("frontend: svelte-check timed out, not verified");
      else if (r.status !== 0) failures.push(`npm run check (svelte-check) failed:\n${tail(r.stdout + "\n" + r.stderr)}`);
    }
  }

  if (rust.length) {
    const manifest = path.join(root, "src-tauri", "Cargo.toml");
    if (!fs.existsSync(manifest)) warnings.push("rust: no src-tauri/Cargo.toml yet, skipped cargo check");
    else if (!has("cargo")) warnings.push("rust: cargo is not installed (https://rustup.rs), skipped cargo check");
    else {
      const r = run("cargo", ["check", "--manifest-path", manifest, "--message-format", "short", "--quiet"], root, 150000);
      if (r.error && r.error.code === "ETIMEDOUT") warnings.push("rust: cargo check timed out (first build is slow), not verified");
      else if (r.status !== 0) failures.push(`cargo check failed:\n${tail(r.stderr || r.stdout)}`);
    }
  }

  if (failures.length) {
    state.blocks = (state.blocks || 0) + 1;
    save();
    if (state.blocks > 3) {
      console.error(`Build gate: still failing after 3 attempts, letting the turn end. Tell the user the build is broken:\n${failures.join("\n\n")}`);
      process.exit(0);
    }
    console.error(`Build gate blocked the turn. Fix these before finishing:\n\n${failures.join("\n\n")}`);
    process.exit(2);
  }

  state.blocks = 0;
  if (!warnings.length) state.lastPass = fingerprint;
  save();
  if (warnings.length) console.error(`Build gate (not blocking): ${warnings.join("; ")}`);
  process.exit(0);
} catch {
  process.exit(0);
}
