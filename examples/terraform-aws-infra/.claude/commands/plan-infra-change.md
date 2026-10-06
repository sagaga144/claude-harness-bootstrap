---
description: Thin wrapper around the built-in Plan agent, primed with this project's shape — use for "how should I build this" / "plan this".
---

Delegate to the built-in `Plan` subagent (do not build a custom planner agent
for this — see HARNESS_REFERENCE.md §1.4's "check what's already built-in"
guidance) with this framing in the prompt:

> You are planning a change to Acme Infra: Terraform modules for a VPC, ECS
> cluster, RDS database, and S3 buckets under `infra/`, environment-scoped
> under `infra/environments/{dev,staging,prod}/`, plus a Python Typer CLI
> under `cli/infra_cli/` that is the only sanctioned way to run
> `terraform plan`/`apply` against a real environment. Any plan step that
> touches RDS, a security group, IAM, or the CLI's guardrail logic
> (`guardrails.py`) must call out that `infra-security-reviewer` gates that
> step before it's considered done. Produce a file-precise plan: which
> module/environment files change, in what order, and which of
> `terraform-engineer` / `cli-engineer` implements each step.

Pass the user's actual request as the task; the framing above is context, not
a replacement for it. Return the plan to the user — don't start implementing
from it without being asked.
