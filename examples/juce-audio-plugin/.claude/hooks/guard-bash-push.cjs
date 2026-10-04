#!/usr/bin/env node
// PreToolUse:Bash -- blocks git push / release-publish commands unless the
// user explicitly set ALLOW_PUSH=1 for this session. Fails open on any
// internal error (never wedge the session shut over a guard bug).

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input || '{}');
    const command = String(payload?.tool_input?.command ?? '');

    if (process.env.ALLOW_PUSH === '1') {
      process.exit(0);
    }

    // git push (any form), or a plugin/artifact "release" publish command.
    const blockedPatterns = [
      /\bgit\s+push\b/i,
      /\bnpm\s+publish\b/i,
      /\bcargo\s+publish\b/i,
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(command)) {
        process.stderr.write(
          `Blocked: "${command}" looks like a push/publish command. ` +
          `This harness never pushes without you asking explicitly. ` +
          `Set ALLOW_PUSH=1 to override.\n`
        );
        process.exit(2);
      }
    }

    process.exit(0);
  } catch (err) {
    // Fail open: a bug in this guard must never block ordinary Bash use.
    process.exit(0);
  }
});
