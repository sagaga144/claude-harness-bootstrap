#!/usr/bin/env node
// PostToolUse:Edit|Write, scoped to contracts/**/*.sol — this project's version of
// the "domain-guard note" row: a reminder, not a hard block (a regex can't actually
// verify checks-effects-interactions or reentrancy-safety, only a human/reviewer
// reading the function can) that fires whenever a contract edit touches something
// that moves value or calls out to another contract. Always exits 0 (advisory
// only) but still writes to stderr so the note reaches the transcript.
"use strict";

function readStdin() {
  try {
    const fs = require("fs");
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin() || "{}");
  } catch {
    process.exit(0);
    return;
  }

  const filePath = String(payload?.tool_input?.file_path ?? "");
  if (!/contracts\/.*\.sol$/i.test(filePath.replace(/\\/g, "/"))) {
    process.exit(0);
    return;
  }

  const content = String(payload?.tool_input?.content ?? payload?.tool_input?.new_string ?? "");
  const touchesValueOrExternalCall =
    /\bpayable\b/.test(content) ||
    /\.call\{/.test(content) ||
    /\.call\(/.test(content) ||
    /\btransferFrom\s*\(/.test(content) ||
    /\bsafeTransferFrom\s*\(/.test(content);

  if (touchesValueOrExternalCall) {
    process.stderr.write(
      `Note: ${filePath} was edited and touches a payable path or an external call. ` +
        "Before this ships: confirm checks-effects-interactions (state changes before " +
        "the external call), that nonReentrant is present on anything payable, and " +
        "that proceeds are pulled rather than pushed. The contract-auditor agent " +
        "checks this too, but don't wait for it to catch something this cheap to " +
        "self-check now.\n"
    );
  }

  process.exit(0); // advisory only — never blocks
}

try {
  main();
} catch {
  process.exit(0);
}
