#!/usr/bin/env node
// PreToolUse: Bash. Blocks `git commit` when the staged diff adds a key/token pattern.
// Exit 0 = allow, 2 = block. Fails open on its own errors.
"use strict";
const { execFileSync } = require("child_process");
const SECRETS = [
  [/-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, "a private key"],
  [/\bAKIA[0-9A-Z]{16}\b/, "an AWS access key id"],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}\b/, "a GitHub token"],
  [/\bsk-[A-Za-z0-9_-]{20,}\b/, "an API secret key"],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, "a Slack token"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/, "a JWT"],
  [/\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*['"][A-Za-z0-9\/+_-]{20,}['"]/i, "a hard-coded credential"],
];
let record = () => {};
try { record = require("./lib/friction.cjs"); } catch {}
try {
  const input = JSON.parse(require("fs").readFileSync(0, "utf8") || "{}");
  const cmd = String((input.tool_input && input.tool_input.command) || "");
  if (!/\bgit\b[^|;&]*\scommit\b/i.test(cmd)) process.exit(0);
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  let diff = "";
  try {
    diff = execFileSync("git", ["diff", "--cached", "--no-color", "-U0"], {
      cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 32 * 1024 * 1024,
    });
  } catch {
    process.exit(0); // no repo / no commits yet / git missing: nothing to scan
  }
  const added = diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"));
  for (const line of added) {
    for (const [re, what] of SECRETS) {
      if (re.test(line)) {
        record("secret-scan", "PreToolUse", "block");
        console.error(`Blocked: the staged diff appears to contain ${what}. Remove it from the commit (and rotate it if it was real).`);
        process.exit(2);
      }
    }
  }
  process.exit(0);
} catch {
  record("secret-scan", "PreToolUse", "fail-open");
  process.exit(0);
}
