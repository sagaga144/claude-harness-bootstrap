#!/usr/bin/env node
// PostToolUse: Edit|Write. Non-blocking notes fed back to Claude as additionalContext:
// stray debug prints, anything that breaks the offline promise, filesystem calls outside
// the vault module, and edits to the IPC/CSP security surface. Always exits 0.
"use strict";
const fs = require("fs");
const path = require("path");
try {
  const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  const fp = String((input.tool_input && input.tool_input.file_path) || "");
  if (!fp) process.exit(0);
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const abs = path.resolve(root, fp);
  const rel = path.relative(root, abs).split(path.sep).join("/");
  const notes = [];

  if (/^src-tauri\/capabilities\//.test(rel) || /^src-tauri\/tauri(?:\.[\w-]+)?\.conf\.json$/.test(rel)) {
    notes.push(`${rel} is the webview-to-native security surface (capabilities/CSP). Keep permissions least-privilege and CSP default-src 'self'; run the security-reviewer agent on this change before calling it done.`);
  }

  let text = "";
  if (/\.(?:ts|js|svelte|rs|toml|html|css)$/.test(rel) && fs.existsSync(abs)) text = fs.readFileSync(abs, "utf8");
  const lines = text.split(/\r?\n/);
  const hits = (re) => lines.map((l, i) => (re.test(l) ? i + 1 : 0)).filter(Boolean).slice(0, 5);

  if (/^src\/.*\.(?:ts|js|svelte)$/.test(rel) && !/\.(?:test|spec)\.[jt]s$/.test(rel)) {
    const logs = hits(/\bconsole\.(?:log|debug)\(/);
    if (logs.length) notes.push(`${rel}: console.log/debug at line(s) ${logs.join(", ")}. Remove before shipping.`);
    const net = hits(/\bfetch\(\s*['"`]https?:|new\s+WebSocket\(|https?:\/\/(?!localhost|127\.0\.0\.1|tauri\.localhost|www\.w3\.org)[\w.-]+\.[a-z]{2,}/i);
    if (net.length) notes.push(`${rel}: remote URL or network call at line(s) ${net.join(", ")}. The app is fully offline: no CDNs, remote fonts, telemetry or fetches.`);
    const html = hits(/\{@html\b/);
    if (html.length) notes.push(`${rel}: {@html} at line(s) ${html.join(", ")}. Rendered note markdown must go through the sanitizer first. Notes are untrusted input.`);
  }

  if (/^src-tauri\/src\/.*\.rs$/.test(rel)) {
    const dbg = hits(/\b(?:println!|eprintln!|dbg!)\(/);
    if (dbg.length) notes.push(`${rel}: println!/dbg! at line(s) ${dbg.join(", ")}. Use the log crate or remove.`);
    if (!/^src-tauri\/src\/vault\//.test(rel)) {
      const fsCalls = hits(/\b(?:std::)?fs::(?:write|remove_file|remove_dir(?:_all)?|rename|create_dir(?:_all)?|copy|File::create|OpenOptions)\b/);
      if (fsCalls.length) notes.push(`${rel}: direct filesystem mutation at line(s) ${fsCalls.join(", ")} outside src-tauri/src/vault/. Route it through the vault module (path check, atomic write, trash on delete).`);
    }
  }

  if (/^src-tauri\/Cargo\.toml$/.test(rel) && /^\s*(?:reqwest|hyper|ureq|isahc|surf|tauri-plugin-(?:http|updater|shell))\s*=/m.test(text)) {
    notes.push(`src-tauri/Cargo.toml adds a network-capable or shell crate/plugin. That breaks the offline/least-privilege promise. Confirm with the user it's intended.`);
  }
  if (/^package\.json$/.test(rel) && /"@tauri-apps\/plugin-(?:http|shell|updater)"/.test(text)) {
    notes.push(`package.json adds a Tauri http/shell/updater plugin. That breaks the offline/least-privilege promise. Confirm with the user it's intended.`);
  }

  if (notes.length) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: notes.join("\n") } }));
  }
  process.exit(0);
} catch {
  process.exit(0);
}
