#!/usr/bin/env node
// PostToolUse: Edit|Write — on any server file that handles incoming client messages,
// reminds Claude the value came from an untrusted client. Never blocks — always exit 0.

const fs = require("fs");

// Matches the connection/hub/protocol-handling area of the server, where raw client
// messages get decoded and turned into game-state updates.
const TRUST_BOUNDARY_PATHS = /^server\/.*(hub|conn|protocol|handler)[^/]*\.go$/i;

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

    if (TRUST_BOUNDARY_PATHS.test(normalized)) {
      process.stdout.write(
        `Note: ${filePath} looks like it's on the client-input trust boundary — double ` +
          "check every field read off an incoming message is validated/clamped " +
          "server-side before it affects game state (never trust client-reported " +
          "position, velocity, or name as-is).\n"
      );
    }

    process.exit(0);
  } catch (err) {
    process.exit(0);
  }
}

main();
