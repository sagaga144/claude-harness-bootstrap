#!/usr/bin/env node
// PreToolUse: Edit|Write. Blocks hand edits to secrets files, lockfiles, the generated
// TS contracts, and already-written SQL migrations. Override: start the session with
// ALLOW_PROTECTED_EDIT=1. Exit 0 = allow, 2 = block. Fails open on its own errors.
"use strict";
const fs = require("fs");
const path = require("path");
try {
  if (process.env.ALLOW_PROTECTED_EDIT === "1") process.exit(0);
  const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  const target = String((input.tool_input && (input.tool_input.file_path || input.tool_input.notebook_path)) || "");
  if (!target) process.exit(0);
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const abs = path.resolve(root, target);
  const rel = path.relative(root, abs).split(path.sep).join("/");
  const base = path.basename(rel);

  let why = "";
  if (/^\.env(?:\.(?!example$)[\w.-]+)?$/i.test(base)) {
    why = `${rel} holds real secrets. Document new variables in .env.example and tell the user what to set`;
  } else if (base === "Cargo.lock" || base === "package-lock.json") {
    why = `${rel} is a lockfile. Change dependencies with cargo add/remove or npm install, which rewrite it`;
  } else if (/^packages\/contracts\/src\/generated\//.test(rel)) {
    why = `${rel} is generated from crates/contracts. Edit the Rust type there, then run \`npm run contracts:gen\``;
  } else if (/^crates\/api\/migrations\//.test(rel) && fs.existsSync(abs)) {
    why = `${rel} is an existing migration and may already be applied somewhere. Add a new migration instead (sqlx migrate add <name>)`;
  }
  if (why) {
    console.error(`Blocked: ${why}. To edit it on purpose, restart the session with ALLOW_PROTECTED_EDIT=1.`);
    process.exit(2);
  }
  process.exit(0);
} catch {
  process.exit(0);
}
