#!/usr/bin/env node
// PostToolUse: Edit|Write. Non-blocking notes after an edit: stray debug output, logging
// of sensitive fields, contract regeneration reminders, and which reviewer a
// security- or data-sensitive file needs. Always exits 0.
"use strict";
const fs = require("fs");
const path = require("path");
try {
  const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  const target = String((input.tool_input && input.tool_input.file_path) || "");
  if (!target) process.exit(0);
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const abs = path.resolve(root, target);
  const rel = path.relative(root, abs).split(path.sep).join("/");
  const isTest = /(?:^|\/)(?:tests?|__tests__)\/|\.(?:test|spec)\.[tj]sx?$/.test(rel);
  let text = "";
  try { text = fs.readFileSync(abs, "utf8"); } catch { process.exit(0); }
  const notes = [];

  if (/^packages\/web\/src\/.*\.[tj]sx?$/.test(rel) && !isTest && /\bconsole\.(?:log|debug)\(/.test(text)) {
    notes.push(`${rel} contains console.log/debug. Remove it before shipping.`);
  }
  if (/^crates\/[^/]+\/src\/.*\.rs$/.test(rel) && !isTest) {
    if (/\bdbg!\(|\bprintln!\(|\beprintln!\(/.test(text)) {
      notes.push(`${rel} uses dbg!/println!. The API logs through \`tracing\`; remove or convert it.`);
    }
    if (/\b(?:tracing::)?(?:trace|debug|info|warn|error)!\([^;]*\b(?:password|card_number|cvc|cvv|secret|token|api_key)\b/i.test(text)) {
      notes.push(`${rel} looks like it logs a sensitive field (password/card/token/secret). Never log these; log ids only.`);
    }
  }
  if (/^crates\/contracts\/src\//.test(rel)) {
    notes.push("A contract type changed. Run `npm run contracts:gen` and update every packages/web usage the TS compiler flags. A rename or type change here is an API change: check the backend handlers too.");
  }
  if (/\/(?:auth|session|login|password|billing|payment|subscription|invoice|webhook|stripe|token|crypto)[^/]*(?:\/|\.(?:rs|tsx?)$)/i.test("/" + rel)) {
    notes.push(`${rel} is auth/billing code. Run the security-reviewer agent on this change before calling it done.`);
  }
  if (/^crates\/api\/(?:migrations\/|src\/(?:db|repo|store)[^/]*)/.test(rel)) {
    notes.push(`${rel} is data-layer code. Run the db-guard agent on this change before calling it done.`);
  }
  if (notes.length) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: notes.join("\n") } }));
  }
} catch {}
process.exit(0);
