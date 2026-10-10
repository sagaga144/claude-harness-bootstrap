#!/usr/bin/env node
// PreToolUse: Bash|PowerShell. On `git commit`, scans the staged diff's added lines for
// keys/tokens and blocks staged .env files. Override: start the session with
// ALLOW_SECRET_COMMIT=1. Exit 0 = allow, 2 = block. Fails open on its own errors.
"use strict";
const { execSync } = require("child_process");
const SECRETS = [
  [/\b(?:sk|rk)_live_[0-9a-zA-Z]{10,}/, "live payment-provider secret key"],
  [/\b(?:sk|rk)_test_[0-9a-zA-Z]{10,}/, "test payment-provider secret key"],
  [/\bwhsec_[0-9a-zA-Z]{10,}/, "webhook signing secret"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key"],
  [/-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/, "private key"],
  [/\beyJ[\w-]{10,}\.eyJ[\w-]{10,}\.[\w-]{10,}/, "JWT"],
  [/\bgh[pousr]_[0-9A-Za-z]{30,}/, "GitHub token"],
  [/\b(?:postgres(?:ql)?|mysql):\/\/[^:\s/]+:[^@\s]{3,}@/i, "database URL with a password"],
  [/\b(?:api[_-]?key|secret|password|passwd|token|jwt[_-]?secret)\b\s*[:=]\s*["'][^"'\s]{12,}["']/i, "hard-coded credential"],
];
function git(root, args) {
  return execSync(`git ${args}`, { cwd: root, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}
try {
  if (process.env.ALLOW_SECRET_COMMIT === "1") process.exit(0);
  const input = JSON.parse(require("fs").readFileSync(0, "utf8") || "{}");
  const cmd = String((input.tool_input && input.tool_input.command) || "");
  if (!/\bgit\b[^;&|]*\bcommit\b/i.test(cmd)) process.exit(0);
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

  const names = git(root, "diff --cached --name-only").split(/\r?\n/).filter(Boolean);
  const envFile = names.find((n) => /(?:^|\/)\.env(?:\.(?!example$)[\w.-]+)?$/i.test(n));
  if (envFile) {
    console.error(`Blocked: ${envFile} is staged. Secrets files never get committed; unstage it (git restore --staged ${envFile}) and keep only .env.example in git.`);
    process.exit(2);
  }

  const diff = git(root, "diff --cached -U0 --no-color");
  let file = "";
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("+++ ")) { file = line.slice(6); continue; }
    if (!line.startsWith("+") || /\.env\.example$/i.test(file)) continue;
    for (const [re, what] of SECRETS) {
      if (re.test(line)) {
        console.error(`Blocked: staged change in ${file} looks like a ${what}. Move it to .env (gitignored) and read it from the environment. If this is a deliberate fake fixture, restart the session with ALLOW_SECRET_COMMIT=1.`);
        process.exit(2);
      }
    }
  }
  process.exit(0);
} catch {
  process.exit(0);
}
