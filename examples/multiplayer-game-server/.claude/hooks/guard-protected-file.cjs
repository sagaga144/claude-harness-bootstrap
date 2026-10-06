#!/usr/bin/env node
// PreToolUse: Edit|Write — blocks edits to .env files, go.sum, and other lockfiles that
// should only change via the real toolchain (`go mod tidy`, etc.), not a direct edit.
// Exit 0 = allow, 2 = block.

const fs = require("fs");

const PROTECTED = [
  /(^|\/)\.env(\..+)?$/,
  /(^|\/)go\.sum$/,
  /(^|\/)package-lock\.json$/,
  /(^|\/)yarn\.lock$/,
];

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
    const hit = PROTECTED.some((re) => re.test(normalized));

    if (hit) {
      process.stderr.write(
        `Blocked: "${filePath}" is a protected/generated file. Use the real tool ` +
          "(go mod tidy, npm install, etc.) instead of editing it directly.\n"
      );
      process.exit(2);
    }

    process.exit(0);
  } catch (err) {
    process.exit(0);
  }
}

main();
