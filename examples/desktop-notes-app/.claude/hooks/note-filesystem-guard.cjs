#!/usr/bin/env node
// PostToolUse: Edit|Write — domain-guard note, advisory only (always
// exits 0). Reminds to re-check the vault path-traversal guard whenever
// a src-tauri file that touches the filesystem gets edited, since that's
// this project's one real trust boundary (no auth, but real disk I/O
// driven by frontend input).

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
    const filePath = String(payload.tool_input && payload.tool_input.file_path || "").replace(/\\/g, "/");
    if (!filePath) process.exit(0);

    const touchesBackendIo =
      /src-tauri\/src\//.test(filePath) && filePath.endsWith(".rs");

    if (touchesBackendIo) {
      process.stdout.write(
        `Reminder: ${filePath} is in the Tauri backend. If this command touches the ` +
        `filesystem, confirm it resolves paths through vault::resolve_in_vault ` +
        `rather than calling std::fs on a raw path, and that ` +
        `src-tauri/capabilities/default.json isn't wider than it needs to be.\n`
      );
    }
    process.exit(0);
  } catch (err) {
    process.exit(0);
  }
}

main();
