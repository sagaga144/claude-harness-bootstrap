#!/usr/bin/env node
// PreModelSwitch hook. This project's guided cost-priority answer was "keep
// cost low" — this hook makes that answer an actual enforcement point, not
// just an agent-file default: block switching to a pricier model than the
// session's current one unless explicitly overridden.
//
// Payload carries `to_model`/`from_model` (PreModelSwitch-specific — not
// `model`, which is SessionStart-only).

const OVERRIDE = 'ALLOW_MODEL_UPGRADE';

// Coarse cost ranking; anything not listed is treated as unknown/expensive
// (fail toward blocking an unrecognized, possibly-pricier model, not past it).
const TIER_RANK = { haiku: 0, sonnet: 1, opus: 2, fable: 3 };

function readStdin() {
  try {
    const fs = require('fs');
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function rankOf(modelName) {
  if (!modelName) return -1;
  const lower = modelName.toLowerCase();
  for (const key of Object.keys(TIER_RANK)) {
    if (lower.includes(key)) return TIER_RANK[key];
  }
  return 99; // unrecognized model name — treat as expensive, block by default
}

function block(reason) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreModelSwitch',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(2);
}

function allow() {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreModelSwitch',
        permissionDecision: 'allow',
      },
    })
  );
  process.exit(0);
}

function main() {
  try {
    const raw = readStdin();
    if (!raw.trim()) return allow();
    const payload = JSON.parse(raw);
    const toModel = payload && payload.to_model;
    const fromModel = payload && payload.from_model;

    if (process.env[OVERRIDE] === '1') return allow();

    const toRank = rankOf(toModel);
    const fromRank = rankOf(fromModel);

    if (toRank > fromRank) {
      return block(
        `Blocked: switching from '${fromModel}' to '${toModel}' is a cost escalation, and ` +
          `this project's cost-priority answer was "keep cost low." Set ${OVERRIDE}=1 to ` +
          `override for this switch.`
      );
    }

    return allow();
  } catch (err) {
    return allow();
  }
}

main();
