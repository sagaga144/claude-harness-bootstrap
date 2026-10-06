#!/usr/bin/env node
// PostToolUse: Edit|Write — advisory only, never blocks (always exits 0).
// Flags stray debug prints left in shipped source: console.log/debug/warn
// in TS/Svelte, and println!/dbg!/eprintln! in Rust. The reference
// inventory only names "console.log" (JS-specific) — generalized here to
// the Rust side too since this project has two primary languages.

const path = require("path");

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
    if (payload.tool_name !== "Edit" && payload.tool_name !== "Write") process.exit(0);
    const filePath = String(payload.tool_input && payload.tool_input.file_path || "");
    const content = String(
      (payload.tool_input && (payload.tool_input.content || payload.tool_input.new_string)) || ""
    );
    if (!filePath || !content) process.exit(0);

    const ext = path.extname(filePath);
    let hit = null;
    if ([".ts", ".svelte", ".js"].includes(ext)) {
      const m = content.match(/console\.(log|debug|warn)\(/);
      if (m) hit = m[0];
    } else if (ext === ".rs") {
      const m = content.match(/\b(dbg!|println!|eprintln!)\(/);
      if (m) hit = m[0];
    }

    if (hit) {
      process.stdout.write(
        `Note: ${filePath} still has a debug print (${hit}) — fine while iterating, ` +
        `worth removing before /verify.\n`
      );
    }
    process.exit(0);
  } catch (err) {
    // Advisory hook — never let an internal error look like a block.
    process.exit(0);
  }
}

main();
