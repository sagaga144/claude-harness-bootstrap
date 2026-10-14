#!/usr/bin/env node
// PostToolUse: Edit|Write. Flags stray debug output in shipped source (dbg!/println! in
// Rust, console.log in TS). Advisory only: always exits 0.
"use strict";
try {
  const input = JSON.parse(require("fs").readFileSync(0, "utf8") || "{}");
  const ti = input.tool_input || {};
  const file = String(ti.file_path || "").replace(/\\/g, "/");
  const text = String(ti.new_string || ti.content || "");
  if (!file || /(^|\/)(tests?|__tests__|benches|examples)\//.test(file) || /\.(test|spec)\.[jt]sx?$/.test(file)) process.exit(0);
  let found = null;
  if (/\.rs$/.test(file) && /\b(?:dbg|println|eprintln)!\s*\(/.test(text)) found = "dbg!/println! in Rust (use `tracing`, and never log secrets or payment data)";
  if (/\.[jt]sx?$/.test(file) && /\bconsole\.(?:log|debug)\s*\(/.test(text)) found = "console.log in TS (remove it; never log tokens or payment data)";
  if (found) {
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `Heads-up: ${file} now contains ${found}. Remove it unless it is intentional.` } }));
  }
  process.exit(0);
} catch {
  process.exit(0);
}
