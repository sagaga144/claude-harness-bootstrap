#!/usr/bin/env node
// PreToolUse:Write -- block stray FINDINGS.md/REPORT.md/NOTES.md etc. at
// repo root. Durable write-ups belong in specs/<feature>/ or as a real
// commit message, not a one-off root-level markdown dump.
//
// Exit codes: 0 = allow, 2 = block (reason on stderr).

const fs = require("fs");

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

const ADHOC_NAME = /^(FINDINGS|REPORT|NOTES|SUMMARY|RESULTS|ANALYSIS)\.md$/i;

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
  if (typeof filePath !== "string") return 0;

  const normalized = filePath.replace(/\\/g, "/");
  const isRootLevel = !normalized.includes("/") || normalized.split("/").filter(Boolean).length === 1;
  const base = normalized.split("/").pop();

  if (isRootLevel && ADHOC_NAME.test(base)) {
    process.stderr.write(
      `[guard-adhoc-docs] Blocked: ${filePath} looks like a stray root-level write-up. ` +
      "Put durable findings in specs/<feature>/ or config.yaml's own comments; put a one-off " +
      "result in the training run's W&B notes, not a repo-root file.\n"
    );
    return 2;
  }

  return 0;
}

try {
  process.exit(main());
} catch (err) {
  try { process.stderr.write(`[guard-adhoc-docs] internal error, failing open: ${err.message}\n`); } catch {}
  process.exit(0);
}
