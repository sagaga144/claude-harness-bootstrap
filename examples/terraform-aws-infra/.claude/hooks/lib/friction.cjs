// Appends one line per guard decision to .claude/session-data/friction.jsonl:
// when, which guard, which event, and the outcome. Nothing else, ever: no command
// text, no paths, no tool input, since those can hold secrets. Never throws.
"use strict";
const fs = require("fs");
const path = require("path");
const MAX_LINES = 5000;
module.exports = function record(guard, event, outcome) {
  try {
    const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const dir = path.join(root, ".claude", "session-data");
    const file = path.join(dir, "friction.jsonl");
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(file, JSON.stringify({ ts: new Date().toISOString(), guard, event, outcome }) + "\n");
    if (fs.statSync(file).size > MAX_LINES * 120) {
      const lines = fs.readFileSync(file, "utf8").trim().split("\n");
      fs.writeFileSync(file, lines.slice(-MAX_LINES).join("\n") + "\n");
    }
  } catch {
    // A log that can't be written never changes a guard's decision.
  }
};
