#!/usr/bin/env node
// PreToolUse:Bash -- block `git commit` if the staged diff contains a
// secret-shaped pattern (W&B API key, generic API key/token, AWS key, a
// private-key header). Fails open on internal error or missing git.
//
// Exit codes: 0 = allow, 2 = block (reason on stderr).

const fs = require("fs");
const { execSync } = require("child_process");

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

const SECRET_PATTERNS = [
  { name: "W&B API key (40-char hex)", re: /\bwandb[_-]?api[_-]?key\b\s*[:=]\s*['"]?[0-9a-f]{40}/i },
  { name: "generic 40-char hex secret", re: /\b[0-9a-f]{40}\b/ },
  { name: "AWS access key ID", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "generic API key/token assignment", re: /\b(api[_-]?key|secret|token)\b\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i },
  { name: "PEM private key header", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

function main() {
  const raw = readStdin();
  if (!raw.trim()) return 0;

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return 0;
  }

  const command = payload?.tool_input?.command;
  if (typeof command !== "string") return 0;
  if (!/\bgit\s+commit\b/.test(command)) return 0;

  let diff;
  try {
    // stdio explicitly controlled: don't let a failing/absent git print
    // raw stderr into the transcript, and don't let its output escape
    // our own fail-open handling.
    diff = execSync("git diff --cached", { stdio: ["ignore", "pipe", "pipe"] }).toString();
  } catch (err) {
    // No repo yet, no staged changes, git not on PATH, etc. -- fail open,
    // this guard only ever adds a check, it never blocks on its own
    // inability to run git.
    return 0;
  }

  for (const { name, re } of SECRET_PATTERNS) {
    if (re.test(diff)) {
      process.stderr.write(
        `[guard-bash-secrets] Blocked: staged diff looks like it contains a secret (${name}). ` +
        "Remove it and use .env (gitignored) instead. This also applies inside notebook " +
        "output cells -- a printed env var saved as cell output is committed just like source.\n"
      );
      return 2;
    }
  }

  return 0;
}

try {
  process.exit(main());
} catch (err) {
  try { process.stderr.write(`[guard-bash-secrets] internal error, failing open: ${err.message}\n`); } catch {}
  process.exit(0);
}
