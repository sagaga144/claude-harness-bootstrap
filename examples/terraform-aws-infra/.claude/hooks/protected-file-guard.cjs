#!/usr/bin/env node
// PreToolUse:Edit|Write hook. Blocks edits to files that should never be
// hand-edited by Claude: .env files, any terraform state file, and lockfiles.
// A terraform.tfvars file is blocked only if the new content looks like it
// contains a literal secret (matching the shift from "always block" to
// "block on the risky pattern" that a plain tfvars file doesn't need).

const OVERRIDE = 'ALLOW_PROTECTED_EDIT';

const ALWAYS_PROTECTED = [
  /(^|[\\/])\.env(\..+)?$/,
  /\.tfstate(\.[^\\/]+)?$/,
  /(^|[\\/])\.terraform\.lock\.hcl$/,
];

const SECRET_IN_CONTENT_PATTERNS = [
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----/,
];

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
  try {
    const raw = readStdin();
    if (!raw.trim()) return allow();
    const payload = JSON.parse(raw);
    const input = payload && payload.tool_input;
    if (!input) return allow();

    const filePath = input.file_path || input.path || '';
    if (!filePath) return allow();
    if (process.env[OVERRIDE] === '1') return allow();

    for (const pattern of ALWAYS_PROTECTED) {
      if (pattern.test(filePath)) {
        return block(
          `Blocked: '${filePath}' is a protected file (matches ${pattern}). Set ` +
            `${OVERRIDE}=1 for a deliberate override.`
        );
      }
    }

    if (/terraform\.tfvars$/.test(filePath)) {
      const content = input.content || input.new_string || '';
      for (const pattern of SECRET_IN_CONTENT_PATTERNS) {
        if (pattern.test(content)) {
          return block(
            `Blocked: the new content for '${filePath}' looks like it contains a literal ` +
              `secret. Secrets belong in TF_VAR_* env vars, never a committed tfvars file. ` +
              `Set ${OVERRIDE}=1 if this is a deliberate, reviewed exception.`
          );
        }
      }
    }

    return allow();
  } catch (err) {
    return allow();
  }
}

main();
