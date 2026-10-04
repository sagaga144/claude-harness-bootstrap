#!/usr/bin/env node
// PreToolUse: Bash — blocks `git push` (and tag pushes) unless ALLOW_PUSH=1 is set.
// Exit 0 = allow, Exit 2 = block. Fails open on its own internal error.

const fs = require("fs");

function main() {
  let input;
  try {
    const raw = fs.readFileSync(0, "utf-8");
    input = JSON.parse(raw);
  } catch (err) {
    // Can't parse our own input — fail open rather than wedge the session shut.
    process.exit(0);
  }

  try {
    const command = (input && input.tool_input && input.tool_input.command) || "";

    const isPush = /\bgit\s+push\b/.test(command);
    if (!isPush) {
      process.exit(0);
    }

    if (process.env.ALLOW_PUSH === "1") {
      process.exit(0);
    }

    process.stderr.write(
      "Blocked: `git push` is reserved for the human. Set ALLOW_PUSH=1 to override if this " +
        "was explicitly requested.\n"
    );
    process.exit(2);
  } catch (err) {
    // Any unexpected error in the guard itself must not wedge the session shut.
    process.exit(0);
  }
}

main();
