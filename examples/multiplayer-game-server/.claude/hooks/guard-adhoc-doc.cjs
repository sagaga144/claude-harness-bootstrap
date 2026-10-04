#!/usr/bin/env node
// PreToolUse: Write — blocks stray ad-hoc report files at repo root
// (FINDINGS.md, REPORT.md, NOTES.md, SUMMARY.md and similar). Exit 0 = allow, 2 = block.

const fs = require("fs");
const path = require("path");

const BLOCKED_ROOT_NAMES = /^(FINDINGS|REPORT|NOTES|SUMMARY|ANALYSIS)\.md$/i;

function main() {
  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, "utf-8"));
  } catch (err) {
    process.exit(0);
  }

  try {
    const filePath = (input && input.tool_input && input.tool_input.file_path) || "";
    if (!filePath) process.exit(0);

    const normalized = filePath.replace(/\\/g, "/");
    const isAtRoot = !normalized.includes("/") || /^\.\/[^/]+$/.test(normalized);
    const base = path.basename(normalized);

    if (isAtRoot && BLOCKED_ROOT_NAMES.test(base)) {
      process.stderr.write(
        `Blocked: "${base}" is a stray ad-hoc doc file at repo root. Put findings in ` +
          "the actual task output, .claude/BUGS.md, or specs/<feature>/ instead.\n"
      );
      process.exit(2);
    }

    process.exit(0);
  } catch (err) {
    process.exit(0);
  }
}

main();
