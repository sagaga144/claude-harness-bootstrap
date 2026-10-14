# Harness lifecycle: version stamp and friction log

> Companion to `HARNESS_REFERENCE.md`, numbered after its Part 1. Read §1.11 while
> building the guard hooks (each one records through its helper) and §1.10 last, after
> verification, to write the stamp. `/harness-bootstrap:check` reads both later.

### 1.10 Version stamp — what built this harness

Every harness gets `.claude/harness.json`, written last, after verification
(`HARNESS_REFERENCE.md` §1.8). It is how `/harness-bootstrap:check` later tells what
changed since setup: in the plugin, in the code, and in the harness itself.

<!-- reference: .claude/harness.json -->
```json
{
  "generator": "harness-bootstrap",
  "version": "0.8.0",
  "generatedAt": "2026-10-20",
  "claudeCodeVersion": "2.1.299",
  "mode": "fresh",
  "profile": {
    "language": "TypeScript",
    "projectType": "full-stack web app",
    "ui": true,
    "persistence": true,
    "trustBoundary": "auth + user data",
    "published": false,
    "deployTarget": "Fly.io",
    "costAnswer": "keep cost low",
    "scopeAnswer": "essentials"
  },
  "files": [
    "CLAUDE.md",
    ".claude/settings.json",
    ".claude/hooks/guard-harness.cjs"
  ]
}
```

- `version` is this plugin's version (from its `plugin.json`); `claudeCodeVersion` from
  `claude --version` if it can be read, otherwise leave it out rather than guess.
- `profile` holds the traits Step 1 found, in a few words each. **Never the user's
  description itself**, never a secret, never a path outside the project.
- `files` lists every file this run wrote. In a retrofit (`"mode": "gap-fill"`), list only
  what this run wrote; files that were already there are not the plugin's.
- The stamp is a protected file (`HARNESS_REFERENCE.md` §1.2.1, §1.7): it changes only
  through Edit/Write with the user's approval. An agent that could rewrite it freely could make a missing reviewer
  look intentional.

### 1.11 Friction log — which guards help and which get in the way

Every blocking guard records one line per decision it makes to
`.claude/session-data/friction.jsonl` (gitignored with the rest of `session-data/`),
through one shared helper:

<!-- reference: .claude/hooks/lib/friction.cjs -->
```js
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
```

- `outcome` is one of `block` (the guard stopped the call), `override` (it would have, but
  the session was started with the override set) and `fail-open` (the guard hit its own
  error and let the call through). Allowed calls aren't logged.
- A guard loads the helper inside its own `try`, so a missing or broken helper fails open
  like everything else: `try { record = require("./lib/friction.cjs") } catch {}`.
- The log is a protected file (`HARNESS_REFERENCE.md` §1.2.1, §1.7). Forged `override`
  lines could make a guard look noisy and talk a later tuning step into loosening it.
- `HARNESS_REFERENCE.md` §1.8 verification runs one guard on a sample payload and checks
  the line it wrote has exactly those four fields.
