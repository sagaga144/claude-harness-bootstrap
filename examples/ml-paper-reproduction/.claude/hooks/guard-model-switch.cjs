#!/usr/bin/env node
// PreModelSwitch -- Step 1's guided cost answer for this project was "keep
// cost low," so block a switch to a pricier model the session didn't
// explicitly ask for. Payload carries to_model/from_model (not `model`,
// which is SessionStart-only) -- check to_model. Override: ALLOW_MODEL_UP=1.
//
// Blocks the same way every other command hook here does: exit code 2 with
// the reason on stderr -- not structured permissionDecision JSON, for
// consistency with the rest of this harness's hooks.

const fs = require("fs");

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

// Cheapest-to-priciest, matching this harness's cost tiers.
const TIER_RANK = { haiku: 0, sonnet: 1, opus: 2, fable: 3 };

function tierOf(modelName) {
  if (typeof modelName !== "string") return null;
  const lower = modelName.toLowerCase();
  for (const key of Object.keys(TIER_RANK)) {
    if (lower.includes(key)) return key;
  }
  return null;
}

function main() {
  const raw = readStdin();
  if (!raw.trim()) return 0;

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return 0;
  }

  if (process.env.ALLOW_MODEL_UP === "1") return 0;

  const toModel = payload?.to_model;
  const fromModel = payload?.from_model;
  const toTier = tierOf(toModel);
  const fromTier = tierOf(fromModel);

  if (toTier === null || fromTier === null) return 0; // unrecognized name -- fail open

  if (TIER_RANK[toTier] > TIER_RANK[fromTier]) {
    process.stderr.write(
      `[guard-model-switch] Blocked: switching from ${fromModel} to ${toModel} goes against this ` +
      "project's 'keep cost low' setting from setup. Set ALLOW_MODEL_UP=1 if this escalation was " +
      "actually intended for the task at hand.\n"
    );
    return 2;
  }

  return 0;
}

try {
  process.exit(main());
} catch (err) {
  try { process.stderr.write(`[guard-model-switch] internal error, failing open: ${err.message}\n`); } catch {}
  process.exit(0);
}
