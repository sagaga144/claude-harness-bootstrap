#!/usr/bin/env node
// PreToolUse: Edit|Write. Blocks edits to secrets, Terraform state and the provider lock
// file (regenerate that with `terraform init -upgrade`, never by hand).
// Override: start the session with ALLOW_PROTECTED_EDIT=1. Exit 0 = allow, 2 = block.
// Fails open on its own errors.
"use strict";
const PROTECTED = [
  [/(?:^|[\\/])\.env(?:\.(?!example$|sample$|template$)[\w.-]+)?$/i, "a secrets file"],
  [/\.tfstate(?:\.backup)?$/i, "Terraform state"],
  [/(?:^|[\\/])\.terraform[\\/]/i, "the .terraform working directory"],
  [/(?:^|[\\/])\.terraform\.lock\.hcl$/i, "the provider lock file (use `terraform init -upgrade`)"],
];
let record = () => {};
try { record = require("./lib/friction.cjs"); } catch {}
try {
  const input = JSON.parse(require("fs").readFileSync(0, "utf8") || "{}");
  const file = String((input.tool_input && (input.tool_input.file_path || input.tool_input.path)) || "");
  const hit = PROTECTED.find(([re]) => re.test(file));
  if (hit) {
    if (process.env.ALLOW_PROTECTED_EDIT === "1") { record("guard-protected-files", "PreToolUse", "override"); process.exit(0); }
    record("guard-protected-files", "PreToolUse", "block");
    console.error(`Blocked: this edits ${hit[1]}. Ask the user to change it, or restart the session with ALLOW_PROTECTED_EDIT=1.`);
    process.exit(2);
  }
  process.exit(0);
} catch {
  record("guard-protected-files", "PreToolUse", "fail-open");
  process.exit(0);
}
