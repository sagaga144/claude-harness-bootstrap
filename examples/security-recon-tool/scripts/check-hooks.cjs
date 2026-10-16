// Pipes fixture payloads into each guard hook and checks the exit code.
// Fixtures live in .claude/session-data/fx (gitignored). Usage: node scripts/check-hooks.cjs
"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const cases = [
  ["guard-bash-push.cjs", "push.json", 2],
  ["guard-bash-push.cjs", "benign.json", 0],
  ["guard-harness.cjs", "harness.json", 2],
  ["guard-harness.cjs", "benign.json", 0],
  ["guard-remote-exec.cjs", "remote.json", 2],
  ["guard-remote-exec.cjs", "benign.json", 0],
  ["guard-scope.cjs", "scope-cmd.json", Number(process.env.WANT_SCOPE ?? 2)],
  ["guard-scope.cjs", "benign.json", 0],
  ["secret-scan.cjs", "benign.json", 0],
  ["build-gate.cjs", "benign.json", 0],
  ["critical-rules.cjs", "benign.json", 0],
];
let bad = 0;
for (const cwd of [root, path.join(root, ".claude")]) {
  for (const [hook, fx, want] of cases) {
    const r = spawnSync("node", [path.join(root, ".claude", "hooks", hook)], {
      input: fs.readFileSync(path.join(root, ".claude", "session-data", "fx", fx)),
      cwd, env: { ...process.env, CLAUDE_PROJECT_DIR: root }, encoding: "utf8",
    });
    const ok = r.status === want;
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "FAIL"} ${hook} ${fx} exit=${r.status} want=${want} cwd=${path.basename(cwd)}`);
  }
}
const log = path.join(root, ".claude", "session-data", "friction.jsonl");
if (fs.existsSync(log)) {
  const first = JSON.parse(fs.readFileSync(log, "utf8").trim().split("\n")[0]);
  const keys = Object.keys(first).join(",");
  const ok = keys === "ts,guard,event,outcome";
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} friction line fields: ${keys}`);
}
JSON.parse(fs.readFileSync(path.join(root, ".claude", "settings.json"), "utf8"));
console.log("ok   settings.json parses");
process.exit(bad ? 1 : 0);
