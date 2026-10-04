#!/usr/bin/env node
// PreToolUse: Edit|Write — blocks direct edits to secrets/lockfiles.
// Exit 0 = allow, exit 2 = block. Fails open on internal error.
"use strict";

function readStdin() {
  try {
    const data = require("fs").readFileSync(0, "utf8");
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

const PROTECTED_PATTERNS = [
  /(^|\/)\.env(\..*)?$/i,
  /(^|\/)Cargo\.lock$/,
  /(^|\/)package-lock\.json$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)yarn\.lock$/,
];

try {
  if (process.env.ALLOW_PROTECTED_EDIT === "1") process.exit(0);

  const input = readStdin();
  const filePath = ((input && input.tool_input && input.tool_input.file_path) || "").replace(
    /\\/g,
    "/"
  );

  const hit = PROTECTED_PATTERNS.some((re) => re.test(filePath));
  if (hit) {
    console.error(
      `Blocked: "${filePath}" is a protected file (secrets or a lockfile). ` +
        "Set ALLOW_PROTECTED_EDIT=1 to override if this edit is genuinely intended."
    );
    process.exit(2);
  }
  process.exit(0);
} catch {
  process.exit(0);
}
