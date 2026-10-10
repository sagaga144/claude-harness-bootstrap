#!/usr/bin/env node
// PreToolUse: Bash|PowerShell. Blocks pushes and publishes unless the session was
// started with ALLOW_PUSH=1. Exit 0 = allow, 2 = block. Fails open on its own errors.
"use strict";
const GIT_OPTS = String.raw`(?:\s+(?:-C|-c|--git-dir|--work-tree|--namespace)\s+\S+|\s+-{1,2}[\w-]+(?:=\S+)?)*`;
const PATTERNS = [
  new RegExp(String.raw`\bgit${GIT_OPTS}\s+push\b`, "i"),
  /\b(?:npm|pnpm|yarn)\s+publish\b/i,
  /\bcargo\s+publish\b/i,
  /\bgh\s+release\s+create\b/i,
  /\bgh\s+pr\s+merge\b/i,
];
try {
  if (process.env.ALLOW_PUSH === "1") process.exit(0);
  const input = JSON.parse(require("fs").readFileSync(0, "utf8") || "{}");
  const cmd = String((input.tool_input && input.tool_input.command) || "");
  if (PATTERNS.some((re) => re.test(cmd))) {
    console.error("Blocked: this pushes, merges or publishes. Ask the user to run it, or restart the session with ALLOW_PUSH=1.");
    process.exit(2);
  }
  process.exit(0);
} catch {
  process.exit(0);
}
