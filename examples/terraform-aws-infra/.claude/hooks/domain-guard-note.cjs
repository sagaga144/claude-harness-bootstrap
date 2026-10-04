#!/usr/bin/env node
// PostToolUse:Edit|Write hook. Informational only — never blocks (always
// exit 0). If the edited file is a .tf file that plausibly touches RDS,
// a security group, or an IAM resource, print a reminder to run
// infra-security-reviewer before the change is considered done.

const SECURITY_RELEVANT_RESOURCE_PATTERNS = [
  /aws_db_instance/,
  /aws_security_group/,
  /aws_iam_role/,
  /aws_iam_policy/,
  /aws_s3_bucket_public_access_block/,
  /deletion_protection/,
];

function readStdin() {
  try {
    const fs = require('fs');
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function main() {
  try {
    const raw = readStdin();
    if (!raw.trim()) return process.exit(0);
    const payload = JSON.parse(raw);
    const input = payload && payload.tool_input;
    const filePath = (input && (input.file_path || input.path)) || '';

    if (!/\.tf$/.test(filePath)) return process.exit(0);

    const content = (input && (input.content || input.new_string)) || '';
    const hit = SECURITY_RELEVANT_RESOURCE_PATTERNS.some((p) => p.test(content));
    if (hit) {
      console.log(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext:
              `Note: ${filePath} touches an RDS/security-group/IAM resource. Run ` +
              `infra-security-reviewer on this change before treating it as done.`,
          },
        })
      );
    }
    return process.exit(0);
  } catch (err) {
    return process.exit(0);
  }
}

main();
