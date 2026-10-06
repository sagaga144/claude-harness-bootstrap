#!/usr/bin/env node
// PreModelSwitch — Step 1's guided cost answer for this project was
// "keep cost low," so this blocks an escalation to Opus/fable that the
// session didn't explicitly ask for. ALLOW_MODEL_ESCALATION=1 overrides.
//
// NOTE: neither BOOTSTRAP.md nor HARNESS_REFERENCE.md documents the exact
// PreModelSwitch payload shape, so this reads several plausible field
// names defensively and fails open (exit 0) if it can't find a target
// model anywhere in the payload, rather than guessing wrong and blocking
// a legitimate switch.

const EXPENSIVE = /\b(opus|fable)\b/i;

function findTargetModel(payload) {
  const candidates = [
    payload.to_model,
    payload.target_model,
    payload.requested_model,
    payload.model,
    payload.new_model,
    payload.switch && payload.switch.to,
  ];
  return candidates.find((c) => typeof c === "string" && c.length > 0) || "";
}

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
    if (process.env.ALLOW_MODEL_ESCALATION === "1") process.exit(0);

    const target = findTargetModel(payload);
    if (!target) process.exit(0); // couldn't identify a target — fail open

    if (EXPENSIVE.test(target)) {
      process.stderr.write(
        `Blocked: switch to "${target}" — this project's cost-priority answer was ` +
        `"keep cost low," which caps agents at Sonnet or below. Set ` +
        `ALLOW_MODEL_ESCALATION=1 if this specific task genuinely needs it.\n`
      );
      process.exit(2);
    }
    process.exit(0);
  } catch (err) {
    process.stderr.write(`cost-guard.cjs internal error (failing open): ${err}\n`);
    process.exit(0);
  }
}

main();
