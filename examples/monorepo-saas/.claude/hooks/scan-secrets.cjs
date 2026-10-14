#!/usr/bin/env node
// PreToolUse: Bash. Blocks `git commit` when the staged diff adds a key/token pattern.
// Override: start the session with ALLOW_SECRET_COMMIT=1. Exit 0 = allow, 2 = block.
// Fails open on its own errors (no repo yet, git missing, timeout).
"use strict";
const { execFileSync } = require("child_process");
const PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, "AWS access key id"],
  [/\b(?:sk|rk)_live_[0-9A-Za-z]{10,}/, "live payment secret key"],
  [/\bwhsec_[0-9A-Za-z]{10,}/, "webhook signing secret"],
  [/\bgh[pousr]_[0-9A-Za-z]{30,}/, "GitHub token"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, "JWT"],
  [/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, "private key"],
  [/(?:secret|password|passwd|api[_-]?key|token)["']?\s*[:=]\s*["'][^"'\s]{16,}["']/i, "hard-coded credential"],
];
let record = () => {};
try { record = require("./lib/friction.cjs"); } catch {}
try {
  const input = JSON.parse(require("fs").readFileSync(0, "utf8") || "{}");
  const cmd = String((input.tool_input && input.tool_input.command) || "");
  if (!/\bgit\b[^;&|]*\bcommit\b/i.test(cmd)) process.exit(0);
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const diff = execFileSync("git", ["diff", "--cached", "--no-color", "-U0"], {
    cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 20000, maxBuffer: 20 * 1024 * 1024,
  });
  const hits = new Set();
  for (const line of diff.split("\n")) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    for (const [re, label] of PATTERNS) if (re.test(line)) hits.add(label);
  }
  if (hits.size) {
    if (process.env.ALLOW_SECRET_COMMIT === "1") { record("scan-secrets", "PreToolUse", "override"); process.exit(0); }
    record("scan-secrets", "PreToolUse", "block");
    console.error(`Blocked: the staged diff looks like it contains: ${[...hits].join(", ")}. Remove it (use .env, which is gitignored) and rotate it if it was ever real. To commit anyway, restart the session with ALLOW_SECRET_COMMIT=1.`);
    process.exit(2);
  }
  process.exit(0);
} catch {
  record("scan-secrets", "PreToolUse", "fail-open");
  process.exit(0);
}
