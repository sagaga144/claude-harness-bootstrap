#!/usr/bin/env node
// PreModelSwitch — Step 1's guided cost answer was "keep cost low," so this blocks
// an unrequested switch to a pricier model mid-session. Payload carries
// `to_model`/`from_model` (not `model`, which is SessionStart-only). Override:
// ALLOW_MODEL_UPGRADE=1 for a deliberate escalation (e.g. the user explicitly
// asks for Opus on a hard problem).
"use strict";

function readStdin() {
  try {
    const fs = require("fs");
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

// Rough cost order — anything not recognized is treated as "don't know, allow"
// rather than guessed at.
const TIER_RANK = { haiku: 0, sonnet: 1, opus: 2, fable: 3 };

function tierOf(modelName) {
  const name = String(modelName ?? "").toLowerCase();
  for (const tier of Object.keys(TIER_RANK)) {
    if (name.includes(tier)) return tier;
  }
  return null;
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin() || "{}");
  } catch {
    process.stdout.write(JSON.stringify({ permissionDecision: "allow" }) + "\n");
    process.exit(0);
    return;
  }

  const toTier = tierOf(payload?.to_model);
  const fromTier = tierOf(payload?.from_model);

  const isEscalation =
    toTier !== null && fromTier !== null && TIER_RANK[toTier] > TIER_RANK[fromTier];

  if (isEscalation && !process.env.ALLOW_MODEL_UPGRADE) {
    process.stdout.write(
      JSON.stringify({
        permissionDecision: "deny",
        permissionDecisionReason:
          `Blocked: switch from ${payload.from_model} to ${payload.to_model}. ` +
          "This project is set to keep cost low (Step 1's guided answer) — set " +
          "ALLOW_MODEL_UPGRADE=1 for a deliberate escalation on a genuinely hard problem.",
      }) + "\n"
    );
    process.exit(0);
    return;
  }

  process.stdout.write(JSON.stringify({ permissionDecision: "allow" }) + "\n");
  process.exit(0);
}

try {
  main();
} catch {
  process.stdout.write(JSON.stringify({ permissionDecision: "allow" }) + "\n");
  process.exit(0); // fail open
}
