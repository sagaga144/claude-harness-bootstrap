#!/usr/bin/env node
// PreModelSwitch -- the user's guided cost answer was "keep cost low," so
// this blocks a switch to a pricier model the session didn't explicitly ask
// for. Payload carries to_model/from_model (not "model", which is
// SessionStart-only). Blocks the same way every other command hook in this
// harness does: exit 2, reason on stderr. Fails open on any internal error.

const TIER_RANK = { haiku: 0, sonnet: 1, opus: 2, fable: 3 };

function tierOf(modelName) {
  const name = String(modelName ?? '').toLowerCase();
  if (name.includes('haiku')) return TIER_RANK.haiku;
  if (name.includes('opus')) return TIER_RANK.opus;
  if (name.includes('fable')) return TIER_RANK.fable;
  return TIER_RANK.sonnet; // default assumption
}

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input || '{}');
    const toModel = payload?.to_model;
    const fromModel = payload?.from_model;

    if (process.env.ALLOW_MODEL_UPGRADE === '1') {
      process.exit(0);
      return;
    }

    if (tierOf(toModel) > TIER_RANK.sonnet && tierOf(toModel) > tierOf(fromModel)) {
      process.stderr.write(
        `Blocked: switching from "${fromModel}" to "${toModel}" exceeds this project's ` +
        `"keep cost low" cost answer (capped at Sonnet). Set ALLOW_MODEL_UPGRADE=1 if you ` +
        `really want this switch for the current task.\n`
      );
      process.exit(2);
      return;
    }

    process.exit(0);
  } catch (err) {
    process.exit(0);
  }
});
