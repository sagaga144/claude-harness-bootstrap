#!/usr/bin/env node
// PreToolUse: Bash|PowerShell. Blocks `git commit` when the staged diff adds a key, token
// or private-key pattern. Override: start the session with ALLOW_SECRET_COMMIT=1.
// Exit 0 = allow, 2 = block. Fails open on its own errors.
"use strict";
const { execFileSync } = require("child_process");
const COMMIT = /\bgit(?:\s+(?:-C|-c)\s+\S+|\s+-{1,2}[\w-]+(?:=\S+)?)*\s+commit\b/i;
const SECRETS = [
  [/AKIA[0-9A-Z]{16}/, "an AWS access key"],
  [/-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, "a private key"],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/, "a GitHub token"],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, "a Slack token"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, "a JWT"],
  [/\b(?:api[_-]?key|secret|token|passw(?:or)?d|authorization|cookie)["']?\s*[:=]\s*["'][^"'\s]{16,}["']/i, "a credential assignment"],
];
let record = () => {};
try { record = require("./lib/friction.cjs"); } catch {}
try {
  const input = JSON.parse(require("fs").readFileSync(0, "utf8") || "{}");
  const cmd = String((input.tool_input && input.tool_input.command) || "");
  if (!COMMIT.test(cmd)) process.exit(0);
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  let diff = "";
  try {
    diff = execFileSync("git", ["-C", root, "diff", "--cached", "--no-color", "-U0"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 32 * 1024 * 1024 });
  } catch { process.exit(0); }
  const added = diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"));
  for (const line of added) {
    for (const [re, what] of SECRETS) {
      if (re.test(line)) {
        if (process.env.ALLOW_SECRET_COMMIT === "1") { record("secret-scan", "PreToolUse", "override"); process.exit(0); }
        record("secret-scan", "PreToolUse", "block");
        console.error(`Blocked: the staged diff adds ${what}. Findings can contain client credentials: remove it (keep it in findings/, which is gitignored), or restart the session with ALLOW_SECRET_COMMIT=1 if this is a false positive.`);
        process.exit(2);
      }
    }
  }
  process.exit(0);
} catch {
  record("secret-scan", "PreToolUse", "fail-open");
  process.exit(0);
}
