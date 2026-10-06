#!/usr/bin/env node
// PreToolUse: Bash — blocks git push and any release/publish command
// unless ALLOW_PUSH=1 is set. Fails open on its own internal errors: a
// bug here must never wedge the session shut.
//
// Verify with a *file* fixture, not an inline echo — the trigger phrase
// in a raw `echo '{"command":"git push"}' | node ...` Bash invocation
// would itself be caught by this same hook once it's wired into
// settings.json. See HARNESS_REFERENCE.md §1.8.

const RELEASE_PATTERNS = [
  /\bgit\s+push\b/,
  /\bgit\s+push\s+--tags\b/,
  /\bnpm\s+publish\b/,
  /\bcargo\s+publish\b/,
  /\bgh\s+release\s+create\b/,
  /\btauri\s+action\b/, // the common Tauri release-automation invocation
];

function main() {
  let raw = "";
  try {
    raw = require("fs").readFileSync(0, "utf8");
  } catch {
    process.exit(0); // no stdin readable — fail open
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0); // malformed input — fail open, don't block on our own bug
  }

  try {
    if (payload.tool_name !== "Bash") {
      process.exit(0);
    }
    const command = String(payload.tool_input && payload.tool_input.command || "");

    if (process.env.ALLOW_PUSH === "1") {
      process.exit(0);
    }

    for (const pattern of RELEASE_PATTERNS) {
      if (pattern.test(command)) {
        process.stderr.write(
          `Blocked: "${command}" looks like a push/release command.\n` +
          `This project has no confirmed deploy target yet, so this is a ` +
          `blanket guard. Set ALLOW_PUSH=1 to override if you meant it.\n`
        );
        process.exit(2);
      }
    }
    process.exit(0);
  } catch (err) {
    // Any unexpected failure fails open rather than wedging the session.
    process.stderr.write(`guard-bash-push.cjs internal error (failing open): ${err}\n`);
    process.exit(0);
  }
}

main();
