#!/usr/bin/env node
// PostToolUse:Edit|Write -- warn (never block) when a .py file was just
// written with a leftover debugger breakpoint or an interactive-only stray
// print. Scoped to .py only -- deliberately does NOT fire on .ipynb: print()
// output and mid-notebook prints are normal there, not a leftover-debug smell,
// and this hook has no way to reason about *which* cell / whether it's the
// point of the notebook. Always exits 0; this is advisory only.

const fs = require("fs");

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

const DEBUG_PATTERNS = [/\bpdb\.set_trace\(\)/, /\bbreakpoint\(\)/, /\bipdb\.set_trace\(\)/];

function main() {
  const raw = readStdin();
  if (!raw.trim()) return 0;

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return 0;
  }

  const filePath = payload?.tool_input?.file_path;
  if (typeof filePath !== "string" || !filePath.endsWith(".py")) return 0;

  // content may arrive as tool_input.content (Write) -- Edit's new text
  // isn't always in the payload, so this only reliably catches Write.
  const content = payload?.tool_input?.content;
  if (typeof content !== "string") return 0;

  for (const re of DEBUG_PATTERNS) {
    if (re.test(content)) {
      console.log(`[warn-debug-statements] ${filePath} still contains a debugger breakpoint. Remove before committing.`);
      break;
    }
  }

  return 0;
}

try {
  process.exit(main());
} catch (err) {
  try { process.stderr.write(`[warn-debug-statements] internal error, failing open: ${err.message}\n`); } catch {}
  process.exit(0);
}
