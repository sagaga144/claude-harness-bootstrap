#!/usr/bin/env node
// PreToolUse: Write — blocks stray FINDINGS.md / REPORT.md / NOTES.md at
// repo root. Durable write-ups belong in .claude/specs/<feature>/ or
// .claude/BUGS.md; ad-hoc root-level docs are almost always scratch that
// should have gone in .claude/session-data/ instead.

const path = require("path");

const BLOCKED_BASENAMES = /^(FINDINGS|REPORT|NOTES|SUMMARY|ANALYSIS)\.md$/i;

function main() {
  let raw = "";
  try {
    raw = require("fs").readFileSync(0, "utf8");
  } catch {
    process.exit(0);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  try {
    if (payload.tool_name !== "Write") process.exit(0);
    const filePath = String(payload.tool_input && payload.tool_input.file_path || "");
    if (!filePath) process.exit(0);

    const base = path.basename(filePath);
    const dir = path.dirname(filePath).replace(/\\/g, "/");
    const isRepoRoot = dir === "." || dir === "" || /\/round-01-desktop-notes$/.test(dir);

    if (process.env.ALLOW_ADHOC_DOC === "1") process.exit(0);

    if (isRepoRoot && BLOCKED_BASENAMES.test(base)) {
      process.stderr.write(
        `Blocked: "${filePath}" is an ad-hoc doc at repo root.\n` +
        `Use .claude/specs/<feature>/ for durable write-ups or ` +
        `.claude/session-data/ for scratch output. Set ALLOW_ADHOC_DOC=1 to override.\n`
      );
      process.exit(2);
    }
    process.exit(0);
  } catch (err) {
    process.stderr.write(`guard-adhoc-doc.cjs internal error (failing open): ${err}\n`);
    process.exit(0);
  }
}

main();
