#!/usr/bin/env node
// Stop — runs the type-check gate once per turn-completion, blocks with
// actionable errors on failure. Exit 2 = block (turn continues to fix),
// exit 0 = allow the stop.
//
// Two ecosystems in this project (TS/Svelte via npm, Rust via cargo).
// `npm run check` failing is always a real block. `cargo check` failing
// with a compiler error is also a real block — but cargo simply not
// being installed (ENOENT) is a missing-toolchain problem, not a code
// problem, so that case fails open with a warning instead of blocking
// every single turn on a machine that doesn't have Rust set up yet.

const { execSync } = require("child_process");

function runCheck(cmd) {
  try {
    execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
    return { ok: true };
  } catch (err) {
    return { ok: false, output: (err.stdout || "") + (err.stderr || err.message || "") };
  }
}

function isCommandMissing(cmd) {
  const probe = process.platform === "win32" ? "where" : "which";
  const bin = cmd.split(" ")[0];
  try {
    execSync(`${probe} ${bin}`, { stdio: ["ignore", "pipe", "pipe"] });
    return false;
  } catch {
    return true;
  }
}

function main() {
  let raw = "";
  try {
    raw = require("fs").readFileSync(0, "utf8");
  } catch {
    raw = "{}";
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = {};
  }

  try {
    if (payload.stop_hook_active) {
      // Already in a stop-hook continuation loop — don't re-block.
      process.exit(0);
    }

    const problems = [];

    if (require("fs").existsSync("node_modules") && require("fs").existsSync("package.json")) {
      const ts = runCheck("npm run check --silent");
      if (!ts.ok) {
        problems.push(`svelte-check failed:\n${ts.output.slice(0, 4000)}`);
      }
    } else {
      process.stdout.write("build-gate: node_modules not installed yet, skipping svelte-check.\n");
    }

    if (require("fs").existsSync("src-tauri/Cargo.toml")) {
      if (isCommandMissing("cargo")) {
        process.stdout.write(
          "build-gate: cargo not found on PATH, skipping cargo check " +
          "(missing toolchain, not a code problem — install Rust to enable this gate).\n"
        );
      } else {
        const rust = runCheck("cargo check --manifest-path src-tauri/Cargo.toml");
        if (!rust.ok) {
          problems.push(`cargo check failed:\n${rust.output.slice(0, 4000)}`);
        }
      }
    }

    if (problems.length > 0) {
      process.stderr.write(problems.join("\n\n") + "\n");
      process.exit(2);
    }
    process.exit(0);
  } catch (err) {
    // A bug in the gate itself must never wedge the session shut.
    process.stderr.write(`build-gate.cjs internal error (failing open): ${err}\n`);
    process.exit(0);
  }
}

main();
