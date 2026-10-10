#!/usr/bin/env node
// PreToolUse: Bash|PowerShell. On `git commit`, scans the staged diff's added lines for
// keys/tokens (Tauri updater signing keys included). Override: ALLOW_SECRET_COMMIT=1.
// Exit 0 = allow, 2 = block. Fails open on its own errors.
"use strict";
const { spawnSync } = require("child_process");
const GIT_OPTS = String.raw`(?:\s+(?:-C|-c|--git-dir|--work-tree)\s+\S+|\s+-{1,2}[\w-]+(?:=\S+)?)*`;
const COMMIT = new RegExp(String.raw`\bgit${GIT_OPTS}\s+commit\b`, "i");
const SECRETS = [
  [/-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/, "a private key block"],
  [/\bTAURI_(?:SIGNING_)?PRIVATE_KEY(?:_PASSWORD)?\s*[=:]\s*\S{8,}/, "a Tauri updater signing key"],
  [/\bAKIA[0-9A-Z]{16}\b/, "an AWS access key"],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/, "a GitHub token"],
  [/\bsk-[A-Za-z0-9_-]{20,}\b/, "an API secret key"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, "a JWT"],
];
try {
  if (process.env.ALLOW_SECRET_COMMIT === "1") process.exit(0);
  const input = JSON.parse(require("fs").readFileSync(0, "utf8") || "{}");
  const cmd = String((input.tool_input && input.tool_input.command) || "");
  if (!COMMIT.test(cmd)) process.exit(0);
  const cwd = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const res = spawnSync("git", ["diff", "--cached", "--no-color", "-U0"], {
    cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 32 * 1024 * 1024,
  });
  if (res.status !== 0 || !res.stdout) process.exit(0);
  let file = "";
  for (const line of res.stdout.split("\n")) {
    if (line.startsWith("+++ ")) { file = line.slice(6); continue; }
    if (!line.startsWith("+")) continue;
    for (const [re, what] of SECRETS) {
      if (re.test(line)) {
        console.error(`Blocked: the staged diff adds what looks like ${what} in ${file}. Unstage it and move the value to an untracked .env or the OS keychain. If it's a false positive, the user can restart with ALLOW_SECRET_COMMIT=1.`);
        process.exit(2);
      }
    }
  }
  process.exit(0);
} catch {
  process.exit(0);
}
