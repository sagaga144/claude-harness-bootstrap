---
description: Fmt/validate/lint/type-check/test across both halves of the project, then READY/NOT-READY.
---

Run this project's full verification pass and report a single READY / NOT-READY
verdict at the end. Don't stop at the first failure — run everything, then summarize.

## Terraform (`infra/`)

1. `terraform fmt -check -recursive` from `infra/`.
2. For each directory under `infra/environments/`: `terraform init -backend=false
   -input=false` then `terraform validate`.
3. If `terraform` is not installed, say so explicitly and mark this section
   SKIPPED (toolchain missing), not FAILED — this is expected on a fresh
   machine and must not block the rest of `/verify`.

## Python CLI (`cli/`)

1. `ruff check .`
2. `mypy .`
3. `pytest -q`
4. If a tool import fails with "module not installed," say so explicitly and
   mark that check SKIPPED, not FAILED.

## Domain-guard scan

Grep the diff (staged + unstaged) for:
- Any `.tf` change touching `aws_db_instance`, `aws_security_group`,
  `aws_iam_role`/`aws_iam_policy`, or `deletion_protection` — flag that
  `infra-security-reviewer` should look at this before merging, if it hasn't
  already.
- Any literal-looking secret in a `.tfvars` file (an `AKIA...` pattern, a
  `-----BEGIN ... PRIVATE KEY-----` block).

## Verdict

- **READY** — every check that could run passed, and any RDS/security-group/
  IAM/guardrail change was flagged for `infra-security-reviewer` (or already
  reviewed).
- **NOT-READY** — list exactly which check failed and why, file:line where
  possible. A SKIPPED check (missing toolchain) does not by itself make the
  verdict NOT-READY, but say so plainly in the summary so it isn't mistaken
  for a pass.

Remember: a READY verdict here is not permission to run `infra apply` against
staging or prod — that still requires a human to read the `terraform plan`
diff and run `apply` themselves.
