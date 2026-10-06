#!/usr/bin/env node
// PreToolUse:Bash hook. Blocks:
//   1. `git push` (standard push guard)
//   2. a *raw* `terraform apply` or `terraform destroy` invocation that
//      bypasses the guarded `infra` CLI wrapper — this is this project's
//      single most load-bearing guard, since a raw apply against prod is
//      the one mistake here that can't be undone by re-running a build.
//
// Fails open on its own internal error (JSON parse failure, etc.) — a bug in
// this guard must never wedge the session shut. Exit 0 = allow, exit 2 = block.

const OVERRIDE_PUSH = 'ALLOW_PUSH';
const OVERRIDE_RAW_TERRAFORM = 'ALLOW_RAW_TERRAFORM';

function readStdin() {
  try {
    const fs = require('fs');
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function block(reason) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(2);
}

function allow() {
  process.exit(0);
}

function main() {
  let raw;
  try {
    raw = readStdin();
    if (!raw.trim()) return allow();
    const payload = JSON.parse(raw);
    const command = (payload && payload.tool_input && payload.tool_input.command) || '';

    if (!command) return allow();

    // git push
    if (/\bgit\s+push\b/.test(command) && process.env[OVERRIDE_PUSH] !== '1') {
      return block(
        `Blocked: 'git push' is guarded on this project. Set ${OVERRIDE_PUSH}=1 to override.`
      );
    }

    // raw terraform apply/destroy, anywhere in the command (covers `cd infra/... && terraform apply`)
    const rawTerraformMutate = /\bterraform\s+(apply|destroy)\b/.test(command);
    if (rawTerraformMutate && process.env[OVERRIDE_RAW_TERRAFORM] !== '1') {
      return block(
        `Blocked: raw 'terraform apply/destroy' bypasses the guarded 'infra' CLI wrapper ` +
          `and its prod confirmation gate. Use 'infra plan'/'infra apply' instead, or set ` +
          `${OVERRIDE_RAW_TERRAFORM}=1 for a deliberate override.`
      );
    }

    return allow();
  } catch (err) {
    // Fail open: a bug in this guard must never wedge the session shut.
    return allow();
  }
}

main();
