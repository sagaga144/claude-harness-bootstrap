#!/usr/bin/env node
// PreToolUse:Bash hook. Blocks `git commit` if the staged diff contains an
// AWS-key-shaped or generic-secret-shaped pattern. Command-type, deterministic.
//
// Note: this hook shells out (`git diff --cached`), so per HARNESS_REFERENCE.md
// §1.8 it must explicitly control the child's stdio and not let a failing
// subprocess (e.g. no commits yet, so `git diff --cached` has nothing to
// compare and some git versions print usage text to stderr) leak into the
// transcript or trip the fail-open path incorrectly.

const { execSync } = require('child_process');

const OVERRIDE = 'ALLOW_COMMIT';

const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/, // AWS access key id
  /aws_secret_access_key\s*=\s*['"][A-Za-z0-9/+=]{20,}['"]/i,
  /-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----/,
  /ghp_[A-Za-z0-9]{36}/, // GitHub PAT, just in case
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, // JWT-shaped
];

function readStdin() {
  try {
    const fs = require('fs');
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function block(reason) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(2);
}

function allow() {
  process.exit(0);
}

function main() {
  let raw;
  try {
    raw = readStdin();
    if (!raw.trim()) return allow();
    const payload = JSON.parse(raw);
    const command = (payload && payload.tool_input && payload.tool_input.command) || '';

    if (!/\bgit\s+commit\b/.test(command)) return allow();
    if (process.env[OVERRIDE] === '1') return allow();

    let diff = '';
    try {
      diff = execSync('git diff --cached', {
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8',
      });
    } catch (err) {
      // A failing `git diff` (no commits yet, not a repo, etc.) is not a
      // secret finding — don't let its stderr leak, don't block on it.
      diff = (err && err.stdout) || '';
    }

    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(diff)) {
        return block(
          `Blocked: the staged diff matches a secret-shaped pattern (${pattern}). ` +
            `Remove it from the diff, or set ${OVERRIDE}=1 if this is a deliberate, ` +
            `reviewed exception (e.g. a fixture value).`
        );
      }
    }

    return allow();
  } catch (err) {
    return allow();
  }
}

main();
