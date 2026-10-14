#!/usr/bin/env node
// PreToolUse: Bash|PowerShell. Stops shell commands from changing the harness's own
// files in ways the Edit/Write ask rules can't see. Override: start the session with
// ALLOW_HARNESS_EDIT=1 (read from this process's environment, never from the command).
// Exit 0 = allow, 2 = block. Fails open on its own errors.
"use strict";
const HARNESS = String.raw`\.claude[\\/](?:hooks\b|agents\b|settings(?:\.local)?\.json|harness\.json|session-data[\\/]friction\.jsonl)`;
const NAMED = new RegExp(HARNESS, "i");
const GIT_OPTS = String.raw`(?:\s+(?:-C|-c|--git-dir|--work-tree)\s+\S+|\s+-{1,2}[\w-]+(?:=\S+)?)*`;
const WRITERS = [
  /\b(?:node|deno|bun)(?:\.exe)?\s+(?:[^|;&]*\s)?(?:-e|--eval|-p|--print)\b/i,
  /\b(?:python3?|py)(?:\.exe)?\s+(?:[^|;&]*\s)?-c\b/i,
  /\b(?:perl|ruby)\s+(?:[^|;&]*\s)?-e\b/i,
  new RegExp(String.raw`\bgit${GIT_OPTS}\s+(?:checkout|restore|reset|stash|clean)\b`, "i"),
  /\b(?:Set-Content|Add-Content|Clear-Content|Out-File|Remove-Item|Copy-Item|Move-Item|New-Item|Rename-Item)\b/i,
  /\[(?:System\.)?IO\.File\]::/i,
  /\b(?:sed|perl)\s+(?:[^|;&]*\s)?-[a-zA-Z]*i/i,
  /\b(?:cp|mv|rm|rmdir|truncate|chmod|chown|ln|dd|install|unlink|shred)\b/i,
];
const REDIRECT = new RegExp(String.raw`(?:>>?|\|\s*tee(?:\s+-a)?)\s*['"]?[^\s'"|;&]*` + HARNESS, "i");
let record = () => {};
try { record = require("./lib/friction.cjs"); } catch {}
function block(what) {
  if (process.env.ALLOW_HARNESS_EDIT === "1") { record("guard-harness", "PreToolUse", "override"); process.exit(0); }
  record("guard-harness", "PreToolUse", "block");
  console.error(`Blocked: ${what}. Harness files change through Edit/Write, which asks the user each time. To do this from the shell on purpose, restart the session with ALLOW_HARNESS_EDIT=1.`);
  process.exit(2);
}
try {
  const input = JSON.parse(require("fs").readFileSync(0, "utf8") || "{}");
  const cmd = String((input.tool_input && input.tool_input.command) || "");
  if (/disableAllHooks/i.test(cmd)) block("this would switch hooks off");
  if (NAMED.test(cmd) && (WRITERS.some((re) => re.test(cmd)) || REDIRECT.test(cmd))) {
    block("this changes the harness's own files from the shell");
  }
  process.exit(0);
} catch {
  record("guard-harness", "PreToolUse", "fail-open");
  process.exit(0);
}
