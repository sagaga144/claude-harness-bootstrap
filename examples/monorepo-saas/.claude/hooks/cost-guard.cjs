#!/usr/bin/env node
// PreModelSwitch — the user's guided cost answer was "keep cost low," so
// block an in-session switch to a pricier model the session didn't
// explicitly ask for. Payload carries to_model/from_model (not `model`,
// which is SessionStart-only). Exit 0 = allow, exit 2 = block. Fails open.
"use strict";

function readStdin() {
  try {
    const data = require("fs").readFileSync(0, "utf8");
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

// Lower index = cheaper.
const TIER_ORDER = ["haiku", "sonnet", "opus", "fable"];

function tierOf(modelName) {
  const name = (modelName || "").toLowerCase();
  for (let i = 0; i < TIER_ORDER.length; i++) {
    if (name.includes(TIER_ORDER[i])) return i;
  }
  return 1; // unknown model names treated as sonnet-equivalent, not blocked by default
}

try {
  if (process.env.ALLOW_MODEL_UPGRADE === "1") process.exit(0);

  const input = readStdin();
  const toModel = input && input.to_model;
  const fromModel = input && input.from_model;

  const toTier = tierOf(toModel);
  const fromTier = tierOf(fromModel);

  if (toTier > fromTier) {
    console.error(
      `Blocked: switching from ${fromModel} to ${toModel} is a cost upgrade, and this project's ` +
        "cost answer was \"keep cost low.\" Set ALLOW_MODEL_UPGRADE=1 to override for this session."
    );
    process.exit(2);
  }
  process.exit(0);
} catch {
  process.exit(0);
}
