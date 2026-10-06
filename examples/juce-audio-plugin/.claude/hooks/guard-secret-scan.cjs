#!/usr/bin/env node
// PreToolUse:Bash -- blocks "git commit" if the staged diff contains an
// obvious secret pattern (API key, private key block, JWT-looking token).
// Fails open on any internal error, including "not a git repo yet" and
// "git isn't on PATH" -- a broken guard must never wedge a session shut.

const { execSync } = require('child_process');

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input || '{}');
    const command = String(payload?.tool_input?.command ?? '');

    if (!/\bgit\s+commit\b/i.test(command)) {
      process.exit(0);
      return;
    }

    if (process.env.ALLOW_COMMIT_SECRETS === '1') {
      process.exit(0);
      return;
    }

    let diff = '';
    try {
      // Explicitly control stdio: don't let a failing/absent git dump raw
      // stderr (e.g. "not a git repository" or --no-index usage text)
      // straight into the transcript -- read it off the error instead.
      diff = execSync('git diff --cached', { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    } catch (err) {
      // No repo yet, git not on PATH, or nothing staged -- nothing to scan.
      process.exit(0);
      return;
    }

    const secretPatterns = [
      /-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----/,
      /\bAKIA[0-9A-Z]{16}\b/,                       // AWS access key id
      /\bsk-[A-Za-z0-9]{20,}\b/,                     // generic secret-key-shaped token
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/, // JWT
    ];

    for (const pattern of secretPatterns) {
      if (pattern.test(diff)) {
        process.stderr.write(
          `Blocked: staged diff looks like it contains a secret (matched ${pattern}). ` +
          `Unstage it or set ALLOW_COMMIT_SECRETS=1 to override.\n`
        );
        process.exit(2);
        return;
      }
    }

    process.exit(0);
  } catch (err) {
    process.exit(0);
  }
});
