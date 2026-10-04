#!/usr/bin/env node
// PreToolUse: Write — blocks stray FINDINGS.md/REPORT.md/SUMMARY.md-style
// files at the repo root. Exit 0 = allow, exit 2 = block. Fails open.
"use strict";

function readStdin() {
  try {
    const data = require("fs").readFileSync(0, "utf8");
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

const BLOCKED_ROOT_NAMES = /^(FINDINGS|REPORT|SUMMARY|NOTES|ANALYSIS)\.md$/i;

try {
  const input = readStdin();
  const filePath = (input && input.tool_input && input.tool_input.file_path) || "";
  const normalized = filePath.replace(/\\/g, "/");
  const isRootLevel = normalized.split("/").filter(Boolean).length <= 1 ||
    (!normalized.includes("/") );
  const base = normalized.split("/").pop() || "";

  if (isRootLevel && BLOCKED_ROOT_NAMES.test(base)) {
    console.error(
      `Blocked: "${base}" looks like an ad-hoc report file at the repo root. ` +
        "Put durable write-ups in .claude/specs/<feature>/ or answer inline instead."
    );
    process.exit(2);
  }
  process.exit(0);
} catch {
  process.exit(0);
}
