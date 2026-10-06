#!/usr/bin/env node
// PreToolUse:Edit|Write -- blocks edits to .env-style files and lockfiles.
// This project has no .env/lockfile today, but the guard is cheap, generic,
// and protects against the day a CI secrets file or a package-lock shows
// up. Fails open on any internal error.

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input || '{}');
    const filePath = String(payload?.tool_input?.file_path ?? '').replace(/\\/g, '/');

    if (process.env.ALLOW_PROTECTED_EDIT === '1') {
      process.exit(0);
      return;
    }

    const protectedPatterns = [
      /(^|\/)\.env(\..+)?$/i,
      /(^|\/)package-lock\.json$/i,
      /(^|\/)Cargo\.lock$/i,
      /(^|\/)\.ssh\//i,
    ];

    for (const pattern of protectedPatterns) {
      if (pattern.test(filePath)) {
        process.stderr.write(
          `Blocked: "${filePath}" is a protected file. Set ` +
          `ALLOW_PROTECTED_EDIT=1 to override if this is deliberate.\n`
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
