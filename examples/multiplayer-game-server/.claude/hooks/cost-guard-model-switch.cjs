#!/usr/bin/env node
// PreModelSwitch — Step 1's cost answer was "keep cost low": block escalating to a
// pricier model mid-session unless explicitly overridden. Payload carries to_model/
// from_model (not `model`, which is SessionStart-only). Exit 0 = allow, 2 = block.

const fs = require("fs");

const TIER_RANK = { haiku: 0, sonnet: 1, opus: 2, fable: 3 };

function main() {
  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, "utf-8"));
  } catch (err) {
    process.exit(0);
  }

  try {
    const toModel = ((input && input.to_model) || "").toLowerCase();

    const toRank = Object.keys(TIER_RANK).find((k) => toModel.includes(k));

    if (!toRank) {
      // Unrecognized model name — don't guess, allow.
      process.exit(0);
    }

    // Cap = Sonnet (Step 1's "keep cost low" answer): only block a switch to something
    // *above* the cap (Opus, fable). Moving up to Sonnet itself (e.g. from Haiku) is
    // exactly the cap being used as intended, not an escalation to flag.
    const aboveCostCap = TIER_RANK[toRank] > TIER_RANK.sonnet;

    if (aboveCostCap && process.env.ALLOW_MODEL_ESCALATION !== "1") {
      process.stderr.write(
        `Blocked: switching to "${toModel}" exceeds this project's cost cap ` +
          '(Step 1 answer: "keep cost low" -> Sonnet or below). Set ' +
          "ALLOW_MODEL_ESCALATION=1 if this escalation was explicitly requested.\n"
      );
      process.exit(2);
    }

    process.exit(0);
  } catch (err) {
    process.exit(0);
  }
}

main();
