#!/usr/bin/env node
// PreToolUse: Bash — blocks `git commit` if the staged diff contains an
// obvious secret pattern. Extra weight here because this project handles
// real payment data (Stripe-style secret keys included in the pattern set).
// Exit 0 = allow, exit 2 = block. Fails open on internal error.
"use strict";

const { execSync } = require("child_process");

function readStdin() {
  try {
    const data = require("fs").readFileSync(0, "utf8");
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /sk_live_[A-Za-z0-9]{10,}/, // Stripe live secret key
  /sk_test_[A-Za-z0-9]{10,}/, // Stripe test secret key (still shouldn't be committed)
  /AKIA[0-9A-Z]{16}/, // AWS access key id
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, // JWT-shaped
  /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"'\s]{8,}["']/i,
];

try {
  if (process.env.ALLOW_SECRET_COMMIT === "1") process.exit(0);

  const input = readStdin();
  const command = (input && input.tool_input && input.tool_input.command) || "";
  if (!/\bgit\s+commit\b/i.test(command)) process.exit(0);

  let diff = "";
  try {
    diff = execSync("git diff --cached", {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
  } catch (err) {
    // Distinguish "not a git repo yet / no staged changes" from a real
    // scan failure: either way, don't let raw child stderr leak into the
    // transcript, and fail open rather than block on a scan we couldn't run.
    process.exit(0);
  }

  for (const re of SECRET_PATTERNS) {
    if (re.test(diff)) {
      console.error(
        "Blocked: staged diff looks like it contains a secret/key (pattern: " +
          re.toString() +
          "). Set ALLOW_SECRET_COMMIT=1 to override if this is a false positive."
      );
      process.exit(2);
    }
  }
  process.exit(0);
} catch {
  process.exit(0);
}
