#!/usr/bin/env node
// PreToolUse:Edit|Write — blocks edits to .env, lockfiles, and this project's own
// deploy-secrets. Override: ALLOW_PROTECTED_EDIT=1.
"use strict";

function readStdin() {
  try {
    const fs = require("fs");
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

const PROTECTED_PATTERNS = [
  /(^|\/)\.env(\.[a-z]+)?$/i, // .env, .env.local, .env.production — but not .env.example
  /(^|\/)package-lock\.json$/,
  /(^|\/)yarn\.lock$/,
  /(^|\/)pnpm-lock\.yaml$/,
];

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin() || "{}");
  } catch {
    process.exit(0);
    return;
  }

  const filePath = String(payload?.tool_input?.file_path ?? "").replace(/\\/g, "/");
  if (!filePath || process.env.ALLOW_PROTECTED_EDIT) {
    process.exit(0);
    return;
  }

  if (/\.env\.example$/i.test(filePath)) {
    process.exit(0); // explicitly not protected — it's the template, safe to edit
    return;
  }

  for (const pattern of PROTECTED_PATTERNS) {
    if (pattern.test(filePath)) {
      process.stderr.write(
        `Blocked: edit to protected file "${filePath}". This holds secrets or is a ` +
          "generated lockfile that should come from the package manager, not a hand " +
          "edit. Set ALLOW_PROTECTED_EDIT=1 if this is deliberate.\n"
      );
      process.exit(2);
      return;
    }
  }

  process.exit(0);
}

try {
  main();
} catch {
  process.exit(0);
}
