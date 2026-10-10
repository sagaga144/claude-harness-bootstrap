---
description: Run every local check (Terraform fmt/validate/tflint/test, CLI ruff/mypy/pytest, guardrail scan) and report READY or NOT-READY.
---

Run these in order from the project root. For each, record PASS / FAIL / SKIPPED (tool missing or nothing to check). Don't stop at the first failure. Run them all, then report.

Never run `terraform apply|destroy` or `infra apply` as part of verification.

1. **TF format**: `terraform fmt -check -recursive`
2. **TF validate**: for every directory under `modules/*` and `envs/*` containing `.tf` files: `terraform -chdir=<dir> init -backend=false -input=false` then `terraform -chdir=<dir> validate`.
3. **TF lint**: `tflint --recursive` (SKIPPED if not installed. Say so.)
4. **TF tests**: for each module with `*.tftest.hcl`: `terraform -chdir=<dir> test`. Every test must use `command = plan`. Flag any `command = apply` as FAIL.
5. **CLI lint**: in `cli/`: `uv run ruff check .` and `uv run ruff format --check .`
6. **CLI types**: in `cli/`: `uv run mypy src`
7. **CLI tests**: in `cli/`: `uv run pytest -q`
8. **Guardrail scan** (grep, no tools needed):
   - No `force_destroy = true` outside `envs/dev` / module defaults.
   - No `deletion_protection = false` or `skip_final_snapshot = true` in `envs/staging` or `envs/prod`.
   - No `shell=True`, no `--auto-approve` accepted for prod, no `terraform apply` call without a plan-file argument in `cli/src`.
   - Each guardrail in CLAUDE.md's "CLI guardrails" list has at least one refusal test in `cli/tests`.
   - No staged `*.tfstate*`, `*.tfplan`, `.env`.

Report as a table (check | result | key error lines), then one line:
**READY**: all PASS (SKIPPED only for tools that are genuinely optional, i.e. tflint), or
**NOT-READY**: list what failed or couldn't run. If terraform itself isn't installed, the verdict is NOT-READY for any change that touched `.tf` files ("not validated" is not "valid").

READY means "safe to hand to `/review-plan` and a human". It never means "applied" or "verified in AWS".
