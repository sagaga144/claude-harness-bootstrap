#!/usr/bin/env node
// PostToolUse: Edit|Write — flags stray console.log left in client/** source.
// Never blocks — always exits 0; stdout is a warning note only.

const fs = require("fs");

function main() {
  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, "utf-8"));
  } catch (err) {
    process.exit(0);
  }

  try {
    const filePath = (input && input.tool_input && input.tool_input.file_path) || "";
    const normalized = filePath.replace(/\\/g, "/");

    if (!/^client\/.*\.js$/.test(normalized)) {
      process.exit(0);
    }

    let content = "";
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch (err) {
      process.exit(0);
    }

    if (/console\.log\(/.test(content)) {
      process.stdout.write(
        `Note: ${filePath} still has a console.log — fine while iterating, worth ` +
          "sweeping out before this is considered done.\n"
      );
    }

    process.exit(0);
  } catch (err) {
    process.exit(0);
  }
}

main();
