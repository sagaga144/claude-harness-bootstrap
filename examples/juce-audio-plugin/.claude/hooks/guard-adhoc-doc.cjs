#!/usr/bin/env node
// PreToolUse:Write -- blocks stray FINDINGS.md/REPORT.md/NOTES.md-style
// files at the repo root. Durable write-ups belong in .claude/specs/<feature>/,
// scratch ones in .claude/session-data/. Fails open on any internal error.

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input || '{}');
    const filePath = String(payload?.tool_input?.file_path ?? '').replace(/\\/g, '/');

    if (process.env.ALLOW_ADHOC_DOC === '1') {
      process.exit(0);
      return;
    }

    // Root-level only (no "/" after stripping a leading "./"), matching a
    // handful of common ad-hoc report-doc names.
    const normalized = filePath.replace(/^\.\//, '');
    const isRootLevel = !normalized.includes('/');
    const looksLikeAdHocDoc = /^(FINDINGS|REPORT|NOTES|SUMMARY|ANALYSIS)\.md$/i.test(
      normalized.split('/').pop() || ''
    );

    if (isRootLevel && looksLikeAdHocDoc) {
      process.stderr.write(
        `Blocked: "${filePath}" looks like a stray ad-hoc doc at repo root. ` +
        `Durable write-ups go in .claude/specs/<feature>/, scratch notes in ` +
        `.claude/session-data/. Set ALLOW_ADHOC_DOC=1 to override.\n`
      );
      process.exit(2);
      return;
    }

    process.exit(0);
  } catch (err) {
    process.exit(0);
  }
});
