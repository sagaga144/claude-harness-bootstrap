#!/usr/bin/env node
// PostToolUse: Edit|Write — non-blocking warning for stray debug prints left
// in source (console.log in TS/TSX, dbg!/println! in Rust outside main.rs's
// own tracing setup). Always exits 0 — informational only.
"use strict";

function readStdin() {
  try {
    const data = require("fs").readFileSync(0, "utf8");
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

try {
  const input = readStdin();
  const filePath = (input && input.tool_input && input.tool_input.file_path) || "";
  const content =
    (input && input.tool_input && (input.tool_input.content || input.tool_input.new_string)) ||
    "";

  if (!content) process.exit(0);

  if (/\.(ts|tsx|js|jsx)$/.test(filePath) && /console\.log\(/.test(content)) {
    console.log(`Note: console.log left in ${filePath} — remove before shipping, or use the project logger.`);
  } else if (/\.rs$/.test(filePath) && /\bdbg!\(/.test(content)) {
    console.log(`Note: dbg!() left in ${filePath} — remove before shipping.`);
  }
  process.exit(0);
} catch {
  process.exit(0);
}
