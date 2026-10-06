#!/usr/bin/env node
// Stop hook — runs this monorepo's real checks (cargo check for the Rust
// backend, tsc --noEmit for the TS packages) and blocks with actionable
// errors on a genuine failure.
//
// Critical distinction (see HARNESS_REFERENCE.md §1.8): "the toolchain isn't
// installed" and "the check failed" are NOT the same outcome. Only the
// second one blocks. A missing toolchain fails OPEN with a plain warning —
// this is the normal state of a fresh machine (e.g. Node present, Rust not
// installed yet), not an error condition.
//
// How "not installed" is actually detected here, and why it's NOT just
// `err.code === "ENOENT"`: `execSync` always runs the command through a
// shell (`cmd.exe` on Windows, `/bin/sh` on POSIX). When the target
// executable is missing, the *shell* still starts fine and exits non-zero
// with its own "not recognized" / "command not found" text — Node never
// sees a spawn-level ENOENT for the missing binary, it sees an ordinary
// non-zero exit indistinguishable by `err.code` alone from a real check
// failure. (This bit this exact hook during verification: `err.code`
// checking alone silently reclassified "cargo isn't installed" as a real
// `cargo check` failure and blocked the gate.) So existence is checked
// explicitly and separately, before ever attempting the real command:
// `where <cmd>` on Windows, `command -v <cmd>` on POSIX, output discarded.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();

function commandExists(cmd) {
  try {
    const probe = process.platform === "win32" ? `where ${cmd}` : `command -v ${cmd}`;
    execSync(probe, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function run(cmd, cwd) {
  try {
    const output = execSync(cmd, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    return { ok: true, output };
  } catch (err) {
    const output = (err.stdout || "") + (err.stderr || "") + (err.message || "");
    return { ok: false, output };
  }
}

const warnings = [];
const failures = [];

// --- Rust backend: cargo check ---
const cargoTomlExists = fs.existsSync(path.join(repoRoot, "Cargo.toml"));
if (cargoTomlExists) {
  if (!commandExists("cargo")) {
    warnings.push(
      "cargo/rustc not found on this machine — skipping the Rust check gate. " +
        "Install the Rust toolchain to have this enforced (rustup.rs)."
    );
  } else {
    const result = run("cargo check --workspace --message-format short", repoRoot);
    if (result.ok === false) {
      failures.push("cargo check failed:\n" + result.output.trim());
    }
  }
} // else: no Cargo.toml yet, nothing to check — not a failure.

// --- TS packages: tsc --noEmit, per package that declares a typecheck script ---
const tsPackages = ["packages/contracts", "packages/frontend"];
const nodeOk = commandExists("node");

for (const pkgDir of tsPackages) {
  const abs = path.join(repoRoot, pkgDir);
  const pkgJsonPath = path.join(abs, "package.json");
  if (!fs.existsSync(pkgJsonPath)) continue;

  const nodeModulesRoot = path.join(repoRoot, "node_modules");
  const tscLocal = path.join(nodeModulesRoot, ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc");

  if (!nodeOk) {
    warnings.push(`node not found on this machine — skipping type-check for ${pkgDir}.`);
    continue;
  }
  if (!fs.existsSync(tscLocal)) {
    warnings.push(
      `TypeScript not installed (no node_modules/.bin/tsc) — skipping type-check for ${pkgDir}. ` +
        "Run `npm install` at the repo root first."
    );
    continue;
  }

  const result = run(`"${tscLocal}" --noEmit -p ${pkgDir}`, repoRoot);
  if (result.ok === false) {
    failures.push(`tsc --noEmit failed in ${pkgDir}:\n` + result.output.trim());
  }
}

if (warnings.length) {
  for (const w of warnings) console.warn("[build-gate] warning: " + w);
}

if (failures.length) {
  console.error("[build-gate] BLOCKED — real check failures, not missing tools:\n");
  console.error(failures.join("\n\n"));
  process.exit(2);
}

console.log("[build-gate] OK" + (warnings.length ? " (with warnings above — toolchain gaps, not failures)" : ""));
process.exit(0);
