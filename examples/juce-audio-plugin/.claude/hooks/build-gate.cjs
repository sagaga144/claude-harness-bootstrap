#!/usr/bin/env node
// Stop hook -- build/type-check gate. For a CMake/C++ project the
// equivalent of "build passing" is a CMake configure (a full build is too
// slow to run on every turn-completion, so this runs configure only, which
// still catches missing-file/CMakeLists errors).
//
// CRITICAL: probe for the toolchain FIRST, before ever attempting the real
// command. Do NOT infer "toolchain missing" from the command's own failure
// (checking err.code === "ENOENT" is unreliable on Windows: execSync always
// runs through cmd.exe, so a missing binary just makes the *shell* exit
// non-zero with "not recognized" text -- Node never sees a spawn-level
// ENOENT, so that failure is indistinguishable from a real configure
// failure by err.code alone). Probe explicitly instead, and fail OPEN with
// a plain warning when the toolchain is simply absent -- only a real
// configure failure blocks.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function commandExists(cmd) {
  try {
    // Windows: `where`. POSIX: `command -v`. Explicit stdio so a "not
    // found" message never leaks into the transcript.
    const probe = process.platform === 'win32' ? `where ${cmd}` : `command -v ${cmd}`;
    execSync(probe, { stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const projectRoot = process.cwd();
  const cmakeListsPath = path.join(projectRoot, 'CMakeLists.txt');

  if (!fs.existsSync(cmakeListsPath)) {
    // Nothing to gate yet -- same fail-open behavior as "no tsconfig.json yet".
    process.exit(0);
    return;
  }

  if (!commandExists('cmake')) {
    console.log(
      'build-gate: no C++ toolchain found on this machine (cmake not on PATH). ' +
      'Skipping the build gate and failing open -- this is expected on a fresh ' +
      'machine that has not installed CMake/a compiler yet, not a real check failure.'
    );
    process.exit(0);
    return;
  }

  const buildDir = path.join(projectRoot, 'build');

  try {
    execSync(`cmake -S "${projectRoot}" -B "${buildDir}"`, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 55000,
    });
    process.exit(0);
  } catch (err) {
    const output = (err.stdout?.toString() ?? '') + (err.stderr?.toString() ?? '');
    process.stderr.write(
      `Blocked: cmake configure failed.\n${output.slice(-4000)}\n`
    );
    process.exit(2);
  }
}

try {
  main();
} catch (err) {
  // A bug in the gate itself must never wedge the session shut.
  process.exit(0);
}
