---
description: Run all local checks and report READY or NOT READY (no AWS access, no apply)
---

Run these in order from the repo root, skipping a step only if its tool or files don't exist yet (say which were skipped and why, never report a skipped step as passed):

1. `terraform fmt -check -recursive`
2. For each directory in `envs/*`: `terraform -chdir=<dir> init -backend=false` then `terraform -chdir=<dir> validate`
3. `ruff check .` and `ruff format --check .`
4. `python -m mypy src`
5. `pytest`
6. Guardrail scan: confirm `src/infractl/` still contains refusal paths and tests for prod `--yes`, wrong AWS account, dirty tree/not on `main`, and stale plan; and grep the Terraform for `0.0.0.0/0`, `publicly_accessible = true`, and missing `deletion_protection` on prod RDS.

Finish with READY or NOT READY, the failing output verbatim for anything that failed, and the list of skipped steps. Remind the user that READY means local checks only: a reviewed `infractl plan <env>` is still required before any apply, and `infra-reviewer` should look at the diff first.
