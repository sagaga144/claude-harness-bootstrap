# Acme Infra — Claude Code Harness

This harness acts on this project in three ways: **automatic** (hooks fire unasked —
guardrails, gates), **routed** (you describe what you want in plain language and the
Intent Router below picks the right agent/command), and **invoked** (you name a command
like `/verify` directly). You never need to name an agent — plain language always works.

## Project Overview
**Project:** Acme Infra (name assumed — the description didn't give one; cheap to rename)
**Stack:** Terraform (AWS provider ~> 5.0) for VPC/ECS/RDS/S3 modules, plus a Python 3.12 +
Typer CLI (`infra`) that wraps `terraform plan`/`apply` with environment guardrails.
**Deployed on:** Real AWS — dev / staging / prod. No CI/CD pipeline configured yet; applies
are run locally through the `infra` CLI by an engineer.

## Dev Commands
Terraform (run from `infra/environments/<env>/`):
- `terraform init` — first run per environment, or after adding a module/provider
- `terraform fmt -check -recursive` (from `infra/`) — formatting, run before every commit
- `terraform validate` — syntax/internal-consistency check only (see gap below)
- `terraform plan` — never run this by hand against prod; use the CLI (below)

Python CLI (run from `cli/`, inside a venv with `pip install -e .`):
- `pytest` — guardrail + unit tests
- `ruff check .` / `ruff format .`
- `mypy .` (strict mode is configured in `pyproject.toml`)
- `infra plan --env <dev|staging|prod> --out plan.tfplan` then
  `infra apply --env <env> --plan plan.tfplan` — the *only* sanctioned way to run
  terraform against a real environment; prod additionally requires typing
  `apply to prod: prod` back at the `--confirm` prompt.

**Type-check gap, both halves:** `terraform validate` passing means the HCL is
internally consistent — it does **not** mean the plan is safe (existing AWS state, IAM
permissions, drift, quota limits are all invisible to `validate`). Only a real
`terraform plan` diff, read carefully, tells you that. Likewise on the Python side,
`pytest` passing does not mean `mypy` was run — `mypy` is configured but not wired into
any other command, so run it explicitly.

## Intent Router
| If you say… | Invoke first |
|---|---|
| "broken" / "bug" / "crash" (CLI) | `cli-engineer` |
| "terraform error" / "won't validate" / "plan looks wrong" | `infra-correctness-reviewer` |
| "add a module" / "new AWS resource" / "new environment" | `terraform-engineer` |
| "add a CLI command" / "new flag" / "new guardrail" | `cli-engineer` |
| "secure" / "security group" / "IAM" / "public bucket" / "prod guardrail" | `infra-security-reviewer` |
| "ship" / "ready to merge" / "ready to apply" | `/verify` → `infra-security-reviewer` if infra changed → you run `infra plan`/`apply` yourself |
| "how should I build this" / "plan this" | `/plan-infra-change` (built-in Plan agent, primed with this project) |
| "clean up" / "refactor" | do it inline; `refactor-cleaner` isn't built yet — see Deferred below |
| "write tests" | `cli-engineer` adds `pytest` coverage in `cli/tests/` |
| "how does X work" | read the files, answer inline — no agent |
| "is prod healthy" / "check prod" | there's no automated health check yet — see Gotchas |

## Must-Do Automatics (hooks)
| When | What fires | Effect |
|---|---|---|
| Session start | `critical-rules.cjs` | Prints the rules that must never be forgotten (below) |
| Before any `Bash` call | `guard-bash.cjs` | Blocks `git push`, and blocks any **raw** `terraform apply` (bypassing the `infra` CLI) — hardest against prod. Override: `ALLOW_RAW_TERRAFORM=1` |
| Before `git commit` | `secret-scan.cjs` | Blocks the commit if the staged diff contains an AWS key/token pattern. Override: `ALLOW_COMMIT=1` |
| Before editing/writing a file | `protected-file-guard.cjs` | Blocks edits to `.env`, `*.tfstate*`, and any `terraform.tfvars` a literal secret was pasted into. Override: `ALLOW_PROTECTED_EDIT=1` |
| After editing/writing a `.tf` file | `domain-guard-note.cjs` | If the file touches RDS/security-group/IAM resources, prints a reminder to run `infra-security-reviewer` before merging |
| Turn ends | `build-gate.cjs` | Runs `terraform fmt -check`/`validate` for touched environments and `ruff`/`mypy`/`pytest` for `cli/`; fails open with a warning (not a block) if a toolchain isn't installed |
| Model switch requested | `cost-guard.cjs` | Blocks escalating to a pricier model mid-session — the cost-priority answer for this project was "keep cost low" |

**Hard rule, not just a hook:** Claude runs `terraform plan` and `infra plan` freely, but
never runs `infra apply` against `staging` or `prod`, and never runs raw `terraform apply`
at all — a human reviews the plan diff and runs `apply` themselves.

## Agents, Commands & Skills
| Agent | Role | Model |
|---|---|---|
| `terraform-engineer` | Implements/edits Terraform modules and environments | Sonnet |
| `cli-engineer` | Implements the Typer CLI and its guardrail logic | Sonnet |
| `infra-correctness-reviewer` | `terraform validate`/plan-diff sanity + `mypy`/`ruff`/`pytest` on the CLI | Sonnet |
| `infra-security-reviewer` | Guardrail bypasses, IAM over-permissioning, open security groups, disabled deletion protection, public S3 access | Sonnet (see Model Routing) |

Built-ins used as-is, no custom wrapper needed beyond one thin command:
`Explore` (search), `general-purpose`, and `Plan` via `/plan-infra-change`.

Commands: `/verify` (fmt/validate/lint/type-check/test → READY/NOT-READY). That's the
whole essentials command set — see Deferred below for what a full setup adds.

## Orchestration & Gates
Every reviewer reports only >80%-confidence findings with exact file:line + concrete
scenario; "zero findings" is a valid clean bill of health. Two human gates, not one:
(1) a human reads the `terraform plan` diff before any apply, (2) prod apply additionally
requires typing the CLI's exact confirmation phrase — neither gate is satisfied by Claude's
own review, by design.

## Model Routing
Cost-priority answer for this project: **keep cost low** (recommended default). Every
agent below is capped at Sonnet or below as a result — see the harness build report for
where that cap actually overrode a higher default.

| Agent/role | Tier | Why |
|---|---|---|
| `terraform-engineer`, `cli-engineer` | Sonnet | Ordinary implementation judgment |
| `infra-correctness-reviewer` | Sonnet | Reading a `terraform plan` diff for sanity is judgment, not a pure exit-code check |
| `infra-security-reviewer` | Sonnet | Would default to Opus (prod-infra stakes) but capped by the cost-low answer |
| `Plan` (built-in, via `/plan-infra-change`) | Sonnet | Standard VPC/ECS/RDS/S3 shape, not architecturally novel; also cost-capped |

## MCP Servers
None wired yet. A `github` MCP is worth adding once CI exists (release/PR status); no AWS
MCP is wired on purpose — the `infra` CLI, not a Claude tool call, is the only sanctioned
path that touches real AWS.

## Code Style
**Terraform:** every module takes explicit variables, no hardcoded ARNs/CIDRs/account IDs;
`terraform.tfvars` files hold no secrets ever — secrets flow through `TF_VAR_*` env vars
injected by the operator or CI. **Python:** type hints required (`mypy --strict` is
configured), `ruff` for lint/format, Typer commands stay thin — guardrail logic lives in
`guardrails.py` specifically so it's unit-testable without a real `terraform` binary.

## Testing
Python: `pytest` in `cli/tests/`, real pass/fail assertions. **Terraform has no equivalent
pass/fail suite** — its "test" is a human reading a `terraform validate` result and a
`plan` diff for sanity, not an assertion. Don't expect `/verify` to produce a clean
green/red signal for the infra half the way it does for the CLI half; see the harness
build report for how this was reconciled.

## Security
Never commit AWS keys, `.tfstate`, or a `.tfvars` with a real secret in it. RDS
`deletion_protection` must stay `true` outside `dev`. S3 buckets keep the public-access
block enabled — no variable exists to turn it off. Security-group ingress must name a
source security group, never `0.0.0.0/0`, except an explicit public web tier that doesn't
exist in this project yet.

## Environment Variables
`TF_VAR_db_password` (terraform, never literal), `INFRA_CLI_CONFIRM_PROD=1` (CI override
for the prod typed-confirmation gate), `ALLOW_RAW_TERRAFORM` / `ALLOW_COMMIT` /
`ALLOW_PROTECTED_EDIT` (harness guard overrides, human-only).

## Bug Tracking Log
`.claude/BUGS.md` — empty so far; add real bugs as they're found.

## Project-Specific Notes (Gotchas)
- Memory: this project relies on Claude Code's built-in auto memory (on by default), not a
  custom system. Use `/memory` to browse or edit what it's saved.
- No `terraform` binary is installed on this machine — `build-gate.cjs` and the CLI's own
  `require_terraform_installed` both fail with a clear warning, not a block, when it's
  missing. Install it before trusting a green `/verify`.
- "Correctness reviewer" for the Terraform half means validate/plan-diff sanity, not a
  pytest-style assertion suite — there isn't one for HCL. Don't expect `/verify` to give a
  pytest-style pass/fail for `infra/`.
- Deferred under "essentials" (ask by name to add): `refactor-cleaner`,
  `silent-failure-hunter`, a dedicated `test-writer`, `/full-review`, a custom
  `orch-add-feature`-style skill, and (only relevant for a multi-engineer team) the memory
  sync mirror.
- "Deploy target" doesn't map cleanly onto a live service/published artifact/marketplace/
  scheduled job — applying to prod is a real AWS infrastructure change, not any of those
  four. No automated "check prod" health check is built; that still needs a human with AWS
  console/CLI access for now.

## Pipeline Flow
idea → `/plan-infra-change` (Plan, primed) → `terraform-engineer` / `cli-engineer` build →
`infra-correctness-reviewer` → `infra-security-reviewer` (required for any infra change) →
`/verify` → human reads the `terraform plan` diff → human runs `infra apply` (prod: typed
confirmation required) — Claude never applies to staging or prod itself.
