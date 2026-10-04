#!/usr/bin/env node
// PreToolUse:Bash — blocks `git push` and any command that deploys the contracts
// to a live network. Override: ALLOW_PUSH=1 for push, ALLOW_DEPLOY=1 for deploy.
// Fails open on its own internal error (never let a guard bug wedge the session).
"use strict";

function readStdin() {
  try {
    const fs = require("fs");
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin() || "{}");
  } catch {
    process.exit(0); // can't parse -> fail open
  }

  const command = String(payload?.tool_input?.command ?? "");

  const isPush = /\bgit\s+push\b/.test(command) && !process.env.ALLOW_PUSH;

  // Anything that runs a Hardhat script/task against a non-local, non-hardhat
  // network is a deploy. `--network localhost` and `--network hardhat` (or no
  // --network at all, which defaults to the ephemeral in-memory network) are
  // fine; any other --network value is a live deploy.
  const networkMatch = command.match(/--network[= ]([A-Za-z0-9_-]+)/);
  const targetsLiveNetwork =
    /\bhardhat\s+run\b/.test(command) &&
    networkMatch &&
    !["localhost", "hardhat"].includes(networkMatch[1]);
  const isDeploy = targetsLiveNetwork && !process.env.ALLOW_DEPLOY;

  if (isPush) {
    process.stderr.write(
      "Blocked: `git push`. This session never pushes on its own — ask the user, or set ALLOW_PUSH=1.\n"
    );
    process.exit(2);
  }

  if (isDeploy) {
    process.stderr.write(
      `Blocked: this command deploys to a live network (${networkMatch[1]}). ` +
        "A deploy is irreversible — it needs an explicit human go-ahead first. " +
        "Set ALLOW_DEPLOY=1 only once that's actually been given.\n"
    );
    process.exit(2);
  }

  process.exit(0);
}

try {
  main();
} catch {
  process.exit(0); // fail open
}
