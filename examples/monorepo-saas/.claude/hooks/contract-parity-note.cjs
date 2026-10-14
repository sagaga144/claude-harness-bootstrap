#!/usr/bin/env node
// PostToolUse: Edit|Write. When an API-shaped file changes, reminds Claude to check that
// the other side of the contract still agrees. Advisory only: always exits 0.
"use strict";
try {
  const input = JSON.parse(require("fs").readFileSync(0, "utf8") || "{}");
  const file = String((input.tool_input && input.tool_input.file_path) || "").replace(/\\/g, "/");
  let note = null;
  if (/(^|\/)contracts\//.test(file)) {
    note = "a contracts/ file changed. Check that the Rust handlers/serde types and the frontend callers still use exactly these field names and types, and that any generated output is regenerated.";
  } else if (/(^|\/)backend\/.*\.rs$/.test(file) && /(handlers?|routes?|api|dto|models?|schemas?|requests?|responses?)/.test(file)) {
    note = "a backend API file changed. If a request/response shape changed, update contracts/ first, then the frontend; check field names (snake_case vs camelCase), optionality and types.";
  } else if (/(^|\/)frontend\/.*\.tsx?$/.test(file) && /(\/api\/|\/services?\/|\/client|\/hooks\/)/.test(file)) {
    note = "a frontend API-calling file changed. Make sure it uses the types from contracts/ rather than a local copy, and that it still matches what the backend returns.";
  }
  if (note) {
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `Contract check: ${file} — ${note}` } }));
  }
  process.exit(0);
} catch {
  process.exit(0);
}
