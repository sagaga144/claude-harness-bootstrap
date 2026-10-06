#!/usr/bin/env node
// PreToolUse: Bash — blocks `git commit` if the staged diff contains a
// key/token/JWT-shaped pattern. ALLOW_COMMIT_SECRET=1 overrides.
//
// This app has no auth/API keys of its own (offline, no accounts), but a
// secret scan is still worth having: a stray .env, a test fixture with a
// real-looking token, or a future integration (e.g. a sync plugin) could
// still leak something. Kept as a generic, low-cost guard.
//
// IMPORTANT: any hook that shells out must control the child's stdio
// explicitly (HARNESS_REFERENCE.md §1.8) — a repo with no commits yet
// makes `git diff --cached` fall back to --no-index and dump ~130 lines
// of usage text to stderr, which looks like a crash if inherited.

const { execSync } = require("child_process");

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/, // AWS access key id shape
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/, // JWT shape
  /\bsk-[A-Za-z0-9]{20,}\b/, // generic "sk-" style API key
  /\bghp_[A-Za-z0-9]{30,}\b/, // GitHub PAT
];

function main() {
  let raw = "";
  try {
    raw = require("fs").readFileSync(0, "utf8");
  } catch {
    process.exit(0);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  try {
    if (payload.tool_name !== "Bash") process.exit(0);
    const command = String(payload.tool_input && payload.tool_input.command || "");
    if (!/\bgit\s+commit\b/.test(command)) process.exit(0);
    if (process.env.ALLOW_COMMIT_SECRET === "1") process.exit(0);

    let diff;
    try {
      diff = execSync("git diff --cached", {
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
      });
    } catch (err) {
      // git itself failing (no repo, no staged changes, --no-index dump,
      // etc.) is not a secret finding — fail open, don't let a git-level
      // error masquerade as a block, and don't let stderr leak into the
      // transcript.
      process.exit(0);
    }

    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(diff)) {
        process.stderr.write(
          `Blocked: staged diff matches a secret-shaped pattern (${pattern}).\n` +
          `Set ALLOW_COMMIT_SECRET=1 to override if this is a false positive.\n`
        );
        process.exit(2);
      }
    }
    process.exit(0);
  } catch (err) {
    process.stderr.write(`guard-secret-scan.cjs internal error (failing open): ${err}\n`);
    process.exit(0);
  }
}

main();
