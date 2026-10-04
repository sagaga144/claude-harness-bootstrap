#!/usr/bin/env node
// PreToolUse: Bash — blocks git push and publish commands unless explicitly
// overridden. Exit 0 = allow, exit 2 = block. Fails open on internal error
// (an allow, not a block) so a bug here never wedges the session.
"use strict";

function readStdin() {
  try {
    const data = require("fs").readFileSync(0, "utf8");
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

const BLOCK_PATTERNS = [
  /\bgit\s+push\b/i,
  /\bcargo\s+publish\b/i,
  /\bnpm\s+publish\b/i,
  /\byarn\s+publish\b/i,
  /\bpnpm\s+publish\b/i,
];

try {
  if (process.env.ALLOW_PUSH === "1") process.exit(0);

  const input = readStdin();
  const command = (input && input.tool_input && input.tool_input.command) || "";

  const hit = BLOCK_PATTERNS.some((re) => re.test(command));
  if (hit) {
    console.error(
      "Blocked: this looks like a push/publish command. Set ALLOW_PUSH=1 to override, " +
        "or ask the user to run it themselves. (matched in: " + JSON.stringify(command) + ")"
    );
    process.exit(2);
  }
  process.exit(0);
} catch (err) {
  // fail open
  process.exit(0);
}
