#!/usr/bin/env node
// PreToolUse: Bash|PowerShell. Claude never mutates real infrastructure: blocks raw
// terraform apply/destroy/state surgery, `infra apply|destroy`, and destructive AWS CLI
// calls. Override (non-prod only): start the session with ALLOW_INFRA_APPLY=1.
// Anything naming prod stays blocked even with the override.
// Exit 0 = allow, 2 = block. Fails open on its own errors.
"use strict";
const TF = String.raw`\bterraform(?:\.exe)?(?:\s+-chdir[=\s]\S+)?`;
const RULES = [
  [new RegExp(String.raw`${TF}\s+(?:apply|destroy|import|taint|untaint|force-unlock|refresh)\b`, "i"), "raw terraform mutates real infrastructure"],
  [new RegExp(String.raw`${TF}\s+state\s+(?:rm|mv|push|replace-provider)\b`, "i"), "terraform state surgery"],
  [new RegExp(String.raw`${TF}\s+workspace\s+delete\b`, "i"), "deleting a terraform workspace"],
  [/\b(?:terraform|infra)\b[^;&|\n]*\s--?auto-approve\b/i, "auto-approve skips the human gate"],
  // `infra` in command position: start of line, after a separator, after `uv run ...`, or `python -m`.
  [/(?:^|[;&|(]\s*|\buv\s+run\b[^;&|\n]*?\s|\bpy(?:thon3?)?\s+-m\s+)infra(?:_cli)?(?:\.exe)?(?:\s+--?[\w-]+)*\s+(?:apply|destroy)\b/im, "`infra apply|destroy` is run by a human, not Claude"],
  [/\baws\s+\S+\s+(?:delete-\S+|terminate-\S+|rb|rm|put-bucket-policy|put-bucket-acl|modify-db-instance|deregister-\S+)\b/i, "a mutating AWS CLI call"],
];
try {
  const input = JSON.parse(require("fs").readFileSync(0, "utf8") || "{}");
  const cmd = String((input.tool_input && input.tool_input.command) || "");
  const hit = RULES.find(([re]) => re.test(cmd));
  if (!hit) process.exit(0);
  const mentionsProd = /\bprod(?:uction)?\b/i.test(cmd);
  if (process.env.ALLOW_INFRA_APPLY === "1" && !mentionsProd) process.exit(0);
  console.error(
    `Blocked: ${hit[1]}. Claude writes code and reads plans; a human applies. ` +
      `Run \`infra plan --env <env>\` for a read-only preview and hand the apply command to the user` +
      (mentionsProd ? " (prod is never overridable from a Claude session)." : ", or restart the session with ALLOW_INFRA_APPLY=1 for dev/staging.")
  );
  process.exit(2);
} catch {
  process.exit(0);
}
