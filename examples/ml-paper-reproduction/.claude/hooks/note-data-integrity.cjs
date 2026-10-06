#!/usr/bin/env node
// PostToolUse:Edit|Write -- domain-guard note. When src/data.py, src/model.py,
// or config.yaml's augmentation/seed fields change, remind about the two
// easiest ways to silently invalidate a "reproduced" number: computing
// normalization stats on anything but train, and touching the seed/schedule
// without re-running end to end. Advisory only, always exits 0.

const fs = require("fs");

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

const WATCHED = [/(^|[\\/])src[\\/]data\.py$/, /(^|[\\/])src[\\/]model\.py$/, /(^|[\\/])config\.yaml$/];

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

  if (WATCHED.some((re) => re.test(normalized))) {
    console.log(
      `[note-data-integrity] ${filePath} changed. Double-check: normalization stats still ` +
      "computed on train only (not test/val), and the seed/lr_schedule weren't touched without " +
      "planning to re-run the full training curve, not just spot-check one epoch."
    );
  }

  return 0;
}

try {
  process.exit(main());
} catch (err) {
  try { process.stderr.write(`[note-data-integrity] internal error, failing open: ${err.message}\n`); } catch {}
  process.exit(0);
}
