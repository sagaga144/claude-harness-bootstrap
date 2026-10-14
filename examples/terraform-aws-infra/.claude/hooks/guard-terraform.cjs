#!/usr/bin/env node
// PreToolUse: Bash|PowerShell. Blocks raw state-changing Terraform/OpenTofu commands and
// -auto-approve: changes go through `infractl`, which carries the per-environment guardrails.
// Override: start the session with ALLOW_TERRAFORM=1. Exit 0 = allow, 2 = block.
// Fails open on its own errors.
"use strict";
const CMD_POS = String.raw`(?:^|[;&|(\n]\s*|\bsudo\s+|&\s*['"]?)`;
const TF = String.raw`(?:terraform|tofu)(?:\.exe)?['"]?`;
const MUTATING = new RegExp(
  CMD_POS + TF + String.raw`(?:\s+-\S+)*\s+(?:apply|destroy|import|force-unlock|state\s+(?:rm|mv|push|replace-provider)|taint|untaint|workspace\s+(?:delete))\b`,
  "i"
);
const AUTO_APPROVE = new RegExp(CMD_POS + TF + String.raw`\b[^;&|\n]*-auto-approve\b`, "i");
let record = () => {};
try { record = require("./lib/friction.cjs"); } catch {}
try {
  const input = JSON.parse(require("fs").readFileSync(0, "utf8") || "{}");
  const cmd = String((input.tool_input && input.tool_input.command) || "");
  if (MUTATING.test(cmd) || AUTO_APPROVE.test(cmd)) {
    if (process.env.ALLOW_TERRAFORM === "1") { record("guard-terraform", "PreToolUse", "override"); process.exit(0); }
    record("guard-terraform", "PreToolUse", "block");
    console.error("Blocked: this changes infrastructure or state directly. Use `infractl plan <env>` / `infractl apply <env>` (a human runs prod applies). To allow it on purpose, restart the session with ALLOW_TERRAFORM=1.");
    process.exit(2);
  }
  process.exit(0);
} catch {
  record("guard-terraform", "PreToolUse", "fail-open");
  process.exit(0);
}
