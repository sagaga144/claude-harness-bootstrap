#!/usr/bin/env node
// PostToolUse: Edit|Write. Warns (never blocks) about stray debug prints in shipped source.
"use strict";
try {
  const input = JSON.parse(require("fs").readFileSync(0, "utf8") || "{}");
  const ti = input.tool_input || {};
  const file = String(ti.file_path || "").replace(/\\/g, "/");
  const text = String(ti.content || ti.new_string || "");
  const isTs = /\/src\/.*\.(?:ts|js|svelte)$/.test(file) && !/\.(?:test|spec)\./.test(file);
  const isRs = /\/src-tauri\/src\/.*\.rs$/.test(file);
  const hit = (isTs && /\bconsole\.(?:log|debug)\(/.test(text)) || (isRs && /\b(?:dbg!|println!)\(/.test(text));
  if (hit) console.log("Note: debug print (console.log / dbg! / println!) in shipped source. Remove it before committing, or use a real logger.");
} catch {}
process.exit(0);
