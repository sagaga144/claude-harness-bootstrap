#!/usr/bin/env node
// PreToolUse:Bash -- block `git push` (and other release-style publish
// commands, though this project has no release target) unless ALLOW_PUSH=1.
// Fails open on any internal error: a bug here must never wedge the session.
//
// Exit codes: 0 = allow, 2 = block (reason on stderr).

const fs = require("fs");

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function main() {
  const raw = readStdin();
  if (!raw.trim()) return 0; // no payload -- nothing to check, allow

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return 0; // malformed payload -- fail open, don't block on our own parse bug
  }

  const command = payload?.tool_input?.command;
  if (typeof command !== "string") return 0;

  if (process.env.ALLOW_PUSH === "1") return 0;

  // Match `git push` as a real subcommand, not just the substring anywhere
  // (avoids false-positives on e.g. a commit message that mentions "push").
  const pushPattern = /(^|[;&|]\s*)git\s+push(\s|$)/;
  if (pushPattern.test(command)) {
    process.stderr.write(
      "[guard-bash-push] Blocked: git push is disabled in this harness. " +
      "Set ALLOW_PUSH=1 to override if this was explicitly requested.\n"
    );
    return 2;
  }

  return 0;
}

try {
  process.exit(main());
} catch (err) {
  // Internal bug in the guard itself -- fail open.
  try { process.stderr.write(`[guard-bash-push] internal error, failing open: ${err.message}\n`); } catch {}
  process.exit(0);
}
