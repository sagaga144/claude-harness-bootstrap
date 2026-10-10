#!/usr/bin/env node
// PreToolUse: Bash|PowerShell. On `git commit`, scans the staged diff for AWS keys,
// private keys, hardcoded passwords, and staged state/plan/.env files.
// Override: start the session with ALLOW_SECRET_COMMIT=1.
// Exit 0 = allow, 2 = block. Fails open on its own errors (e.g. no repo yet).
"use strict";
const { spawnSync } = require("child_process");
const GIT_OPTS = String.raw`(?:\s+(?:-C|-c|--git-dir|--work-tree)\s+\S+|\s+-{1,2}[\w-]+(?:=\S+)?)*`;
const COMMIT = new RegExp(String.raw`\bgit${GIT_OPTS}\s+commit\b`, "i");
const CONTENT = [
  [/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/, "AWS access key ID"],
  [/aws_secret_access_key\s*[=:]\s*\S{20,}/i, "AWS secret access key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
  [/\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/, "JWT"],
  [/\b(?:password|passwd|secret|token)\s*=\s*"(?!\$\{)[^"\s]{6,}"/i, "hardcoded password/secret literal"],
];
const FILES = [
  [/(?:^|\/)[^/]*\.tfstate(?:\.backup)?$/, "Terraform state"],
  [/(?:^|\/)[^/]*\.tfplan$|(?:^|\/)tfplan(?:\.bin)?$/, "saved Terraform plan"],
  [/(?:^|\/)\.terraform\//, ".terraform/ provider cache"],
  [/(?:^|\/)\.env(?:\.(?!example$)[\w.-]+)?$/, ".env file"],
];
function git(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 32 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : "";
}
try {
  if (process.env.ALLOW_SECRET_COMMIT === "1") process.exit(0);
  const input = JSON.parse(require("fs").readFileSync(0, "utf8") || "{}");
  const cmd = String((input.tool_input && input.tool_input.command) || "");
  if (!COMMIT.test(cmd)) process.exit(0);
  const cwd = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const all = /\s-[a-zA-Z]*a\b|--all\b/.test(cmd);
  const names = git(["diff", "--cached", "--name-only"], cwd) + (all ? git(["diff", "--name-only"], cwd) : "");
  const diff = git(["diff", "--cached", "-U0"], cwd) + (all ? git(["diff", "-U0"], cwd) : "");
  const problems = [];
  for (const f of names.split(/\r?\n/).filter(Boolean)) {
    for (const [re, what] of FILES) if (re.test(f)) problems.push(`${f}: ${what} must never be committed`);
  }
  const added = diff.split(/\r?\n/).filter((l) => l.startsWith("+") && !l.startsWith("+++"));
  for (const line of added) {
    for (const [re, what] of CONTENT) if (re.test(line)) problems.push(`${what}: ${line.slice(0, 120)}`);
  }
  if (problems.length) {
    console.error("Blocked commit, possible secrets:\n- " + problems.slice(0, 10).join("\n- ") +
      "\nUnstage/remove them (use Secrets Manager / manage_master_user_password). If it's a false positive, ask the user; override with ALLOW_SECRET_COMMIT=1.");
    process.exit(2);
  }
  process.exit(0);
} catch {
  process.exit(0);
}
