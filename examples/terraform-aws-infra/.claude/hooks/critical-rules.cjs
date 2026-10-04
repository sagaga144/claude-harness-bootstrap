#!/usr/bin/env node
// SessionStart hook: prints the rules that must never be forgotten on this
// project. Command-type hook — deterministic, no model call, instant.
//
// Exit code convention for SessionStart: this hook never blocks the session;
// it always exits 0. Its only job is to inject text into context via stdout.

const RULES = [
  'Claude never runs `infra apply` against staging or prod, and never runs a raw ' +
    '`terraform apply` at all — a human reviews the plan diff and applies it themselves.',
  '`terraform.tfvars` files never hold a literal secret. Secrets flow through ' +
    '`TF_VAR_*` env vars only.',
  'RDS `deletion_protection` stays `true` outside `dev`. Don\'t "fix" a blocked ' +
    'destroy by flipping it off without a human sign-off.',
  'Security-group ingress names a source security group, never `0.0.0.0/0`, unless ' +
    'the task is explicitly building a public web tier.',
  'S3 buckets keep the public-access block enabled — there is no variable to turn it ' +
    'off; a bucket that needs public content goes through CloudFront + OAC instead.',
  'Any change touching RDS, a security group, or an IAM policy gets ' +
    '`infra-security-reviewer` before it\'s considered done, no exceptions.',
  'Terraform hooks/scripts in this repo are Node (.cjs) regardless of the project ' +
    'being Python/Terraform — that\'s harness tooling, not project code.',
];

function main() {
  const lines = ['Critical rules for this project (Acme Infra):', ''];
  for (const rule of RULES) {
    lines.push(`- ${rule}`);
  }
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: lines.join('\n'),
      },
    })
  );
  process.exit(0);
}

main();
