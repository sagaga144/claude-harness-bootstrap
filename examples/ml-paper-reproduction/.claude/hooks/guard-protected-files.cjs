#!/usr/bin/env node
// PreToolUse:Edit|Write -- block edits to secrets and generated/binary
// artifacts that should never be hand-edited (.env, checkpoints, W&B run
// dirs, downloaded dataset). One override: ALLOW_PROTECTED_EDIT=1.
//
// Exit codes: 0 = allow, 2 = block (reason on stderr).

const fs = require("fs");
const path = require("path");

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

const PROTECTED_PATTERNS = [
  /(^|[\\/])\.env($|[\\/])/,
  /(^|[\\/])checkpoints[\\/]/,
  /(^|[\\/])wandb[\\/]/,
  /(^|[\\/])data[\\/].*cifar/i,
  /\.pt$|\.pth$|\.ckpt$/,
];

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

  if (process.env.ALLOW_PROTECTED_EDIT === "1") return 0;

  const normalized = filePath.replace(/\\/g, "/");
  for (const re of PROTECTED_PATTERNS) {
    if (re.test(normalized)) {
      process.stderr.write(
        `[guard-protected-files] Blocked: ${filePath} is a generated/secret artifact, not source. ` +
        "Set ALLOW_PROTECTED_EDIT=1 to override if this was genuinely intended.\n"
      );
      return 2;
    }
  }

  return 0;
}

try {
  process.exit(main());
} catch (err) {
  try { process.stderr.write(`[guard-protected-files] internal error, failing open: ${err.message}\n`); } catch {}
  process.exit(0);
}
