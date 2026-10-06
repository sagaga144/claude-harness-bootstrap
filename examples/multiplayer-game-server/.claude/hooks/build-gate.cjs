#!/usr/bin/env node
// Stop hook — runs `go build ./...` (+ `go vet ./...`) once per turn-completion and
// blocks with actionable errors on real failure. Exit 0 = allow, 2 = block.
// Must tell "toolchain not installed" apart from "the check failed" -- only the second
// one blocks; a missing `go` binary or no go.mod yet is a plain warning, not a block.

const { execSync } = require("child_process");
const fs = require("fs");

function toolchainAvailable() {
  try {
    execSync("go version", { stdio: ["ignore", "pipe", "pipe"] });
    return true;
  } catch (err) {
    return false;
  }
}

function hasGoModule() {
  return fs.existsSync("go.mod") || fs.existsSync("server/go.mod");
}

function main() {
  // Consume stdin even though this hook doesn't need its fields, so the harness always
  // gets a clean read.
  try {
    fs.readFileSync(0, "utf-8");
  } catch (err) {
    /* no stdin piped — fine for a manual test invocation */
  }

  if (!toolchainAvailable()) {
    process.stdout.write(
      "Warning: `go` isn't installed on this machine — skipping the build gate. This is " +
        "not a build failure, just an unchecked build.\n"
    );
    process.exit(0);
  }

  if (!hasGoModule()) {
    process.stdout.write(
      "Warning: no go.mod yet — nothing to build. Skipping the build gate until the " +
        "module exists.\n"
    );
    process.exit(0);
  }

  try {
    execSync("go build ./...", { stdio: ["ignore", "pipe", "pipe"] });
    execSync("go vet ./...", { stdio: ["ignore", "pipe", "pipe"] });
    process.exit(0);
  } catch (err) {
    const output = (err.stdout ? err.stdout.toString() : "") + (err.stderr ? err.stderr.toString() : "") || err.message;
    process.stderr.write("Blocked: `go build`/`go vet` failed:\n" + output + "\n");
    process.exit(2);
  }
}

main();
