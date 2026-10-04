#!/usr/bin/env node
// PreToolUse:Write — blocks stray report/findings docs dropped at repo root
// instead of going into .claude/BUGS.md, .claude/specs/, or a real commit message.
// Override: ALLOW_AD_HOC_DOC=1.
"use strict";

const path = require("path");

function readStdin() {
  try {
    const fs = require("fs");
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

const BLOCKED_BASENAMES = /^(FINDINGS|REPORT|NOTES|SUMMARY|ANALYSIS|AUDIT)\.md$/i;

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin() || "{}");
  } catch {
    process.exit(0);
    return;
  }

  const filePath = String(payload?.tool_input?.file_path ?? "");
  if (!filePath || process.env.ALLOW_AD_HOC_DOC) {
    process.exit(0);
    return;
  }

  const normalized = filePath.replace(/\\/g, "/");
  const isAtRoot = !normalized.includes("/") || normalized.split("/").length === 1;
  const basename = path.basename(normalized);

  if (isAtRoot && BLOCKED_BASENAMES.test(basename)) {
    process.stderr.write(
      `Blocked: ad-hoc "${basename}" at repo root. Put findings in .claude/BUGS.md, ` +
        "a spec under .claude/specs/<feature>/, or just say it in chat — or set " +
        "ALLOW_AD_HOC_DOC=1 if this file is genuinely meant to live here.\n"
    );
    process.exit(2);
    return;
  }

  process.exit(0);
}

try {
  main();
} catch {
  process.exit(0);
}
