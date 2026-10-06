#!/usr/bin/env node
// PostToolUse:Edit|Write -- non-blocking. Flags stray debug prints
// (std::cout, printf, DBG()) left in shipped C++ source. Never blocks --
// always exits 0 -- this is a note surfaced to Claude, not a gate.

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input || '{}');
    const filePath = String(payload?.tool_input?.file_path ?? '');

    if (!/\.(cpp|h|hpp)$/i.test(filePath)) {
      process.exit(0);
      return;
    }

    const content = String(
      payload?.tool_input?.content ?? payload?.tool_input?.new_string ?? ''
    );

    const debugPatterns = [/\bstd::cout\b/, /\bprintf\s*\(/, /\bDBG\s*\(/];
    const hits = debugPatterns.filter((p) => p.test(content));

    if (hits.length > 0) {
      console.log(
        `Note: ${filePath} contains what looks like a debug print ` +
        `(std::cout/printf/DBG). Fine for local debugging, but these should ` +
        `not ship, and DBG()/std::cout are also real-time-unsafe if they ` +
        `reach processBlock() -- double check.`
      );
    }

    process.exit(0);
  } catch (err) {
    process.exit(0);
  }
});
