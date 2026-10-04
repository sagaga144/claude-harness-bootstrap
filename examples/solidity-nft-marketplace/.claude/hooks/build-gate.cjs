#!/usr/bin/env node
// Stop hook — runs `hardhat compile` then `hardhat test` once per turn-completion,
// blocks with actionable errors on a real failure. Must tell "toolchain isn't
// installed" apart from "the check failed" — only the second one blocks.
//
// Probes for the toolchain FIRST via an explicit filesystem check
// (node_modules/.bin/hardhat[.cmd]), not by running the real command and
// inspecting err.code afterward. execSync always runs through a shell on
// Windows (cmd.exe); when the target binary is missing, cmd.exe itself starts
// fine and exits non-zero with "not recognized" text — Node never sees a
// spawn-level ENOENT, so err.code alone is indistinguishable from a genuine
// check failure there. Probing first avoids that trap entirely.
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function hardhatBinPath(projectRoot) {
  const bin = process.platform === "win32" ? "hardhat.cmd" : "hardhat";
  const p = path.join(projectRoot, "node_modules", ".bin", bin);
  return fs.existsSync(p) ? p : null;
}

function run(cmd, cwd) {
  // Explicit stdio control — never let a failing child's stderr print itself
  // straight through; capture it and decide/report in code instead.
  return execSync(cmd, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    timeout: 55000,
  });
}

function main() {
  readStdin(); // Stop payload isn't needed for the decision, just drain it.

  const projectRoot = process.cwd();
  const hasPackageJson = fs.existsSync(path.join(projectRoot, "package.json"));
  if (!hasPackageJson) {
    process.exit(0); // nothing to gate yet
    return;
  }

  const hardhatBin = hardhatBinPath(projectRoot);
  if (!hardhatBin) {
    process.stderr.write(
      "build-gate: Hardhat isn't installed yet (no node_modules/.bin/hardhat) — " +
        "skipping compile/test. Run `npm install` to enable this gate. This is a " +
        "missing toolchain, not a failing check, so it does not block.\n"
    );
    process.exit(0); // fail open — missing toolchain, not a failure
    return;
  }

  // Invoke the local binary directly, NOT via `npx hardhat ...`. npx does its
  // own package resolution independent of the probe above — in a partially-
  // installed node_modules (a stray .bin shim with no real hardhat package
  // behind it, or a corrupted install) npx silently falls back to fetching a
  // fresh `hardhat` from the npm registry and running THAT instead of what's
  // actually on disk, which both defeats the point of probing first and can
  // make the gate depend on network access it was never supposed to need.
  const quotedBin = `"${hardhatBin}"`;

  try {
    run(`${quotedBin} compile`, projectRoot);
  } catch (err) {
    process.stderr.write(
      "build-gate: `hardhat compile` failed:\n" +
        String(err.stdout || "") +
        String(err.stderr || err.message || "") +
        "\n"
    );
    process.exit(2);
    return;
  }

  try {
    run(`${quotedBin} test`, projectRoot);
  } catch (err) {
    process.stderr.write(
      "build-gate: `hardhat test` failed:\n" +
        String(err.stdout || "") +
        String(err.stderr || err.message || "") +
        "\n"
    );
    process.exit(2);
    return;
  }

  process.exit(0);
}

try {
  main();
} catch (err) {
  // A bug in the gate itself must never wedge the session shut.
  process.stderr.write(`build-gate: internal error, failing open: ${err?.message ?? err}\n`);
  process.exit(0);
}
